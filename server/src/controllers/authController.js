const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/db');

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

/**
 * Register a new user
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { name, email, password, role, org_type, phone, address, lat, lng } = req.body;

    // Check if email already registered
    const existing = db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists.'
      });
    }

    // Determine verified status
    // Spec: "Registration for recipients that are NGOs/clinics requires admin approval ("verified" flag)."
    // Also institutional donors (hospital, distributor, pharmacy) start unverified until admin checks license
    let verified = 1;
    if (role === 'recipient' && ['ngo', 'clinic'].includes(org_type)) {
      verified = 0;
    } else if (role === 'donor' && ['hospital', 'distributor'].includes(org_type)) {
      verified = 0;
    } else if (role === 'verifier') {
      verified = 0; // Verifiers must be approved by admin
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Insert user
    const insertResult = db.run(
      `INSERT INTO users (name, email, password_hash, role, org_type, phone, address, lat, lng, verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email.toLowerCase(), passwordHash, role, org_type, phone || null, address || null, lat || 19.0760, lng || 72.8777, verified]
    );

    const userId = insertResult.lastInsertRowid;

    // If donor, initialize reputation entry
    if (role === 'donor') {
      db.run(`INSERT INTO reputation (donor_id, points, badge) VALUES (?, 0, 'Bronze')`, [userId]);
    }

    // Record audit event
    db.run(
      `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
       VALUES (?, ?, ?, ?, ?)`,
      ['user', userId, 'REGISTER', userId, JSON.stringify({ role, org_type, verified })]
    );

    // Fetch newly created user
    const newUser = db.get(
      'SELECT id, name, email, role, org_type, phone, address, lat, lng, verified, created_at FROM users WHERE id = ?',
      [userId]
    );

    const token = generateToken(newUser);

    let message = 'Account registered successfully.';
    if (verified === 0) {
      message = 'Registration submitted! Your organisation account is pending verification by an administrator.';
    }

    return res.status(201).json({
      success: true,
      message,
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred during registration. Please try again.'
    });
  }
}

/**
 * Login
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = db.get(
      'SELECT id, name, email, password_hash, role, org_type, phone, address, lat, lng, verified, created_at FROM users WHERE LOWER(email) = LOWER(?)',
      [email]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email address or password.'
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email address or password.'
      });
    }

    // Don't leak password_hash
    delete user.password_hash;

    // If donor, fetch reputation
    if (user.role === 'donor') {
      const rep = db.get('SELECT points, badge FROM reputation WHERE donor_id = ?', [user.id]);
      user.reputation = rep || { points: 0, badge: 'Bronze' };
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Signed in successfully.',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred during login. Please try again.'
    });
  }
}

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
async function me(req, res) {
  try {
    const user = { ...req.user };

    if (user.role === 'donor') {
      const rep = db.get('SELECT points, badge FROM reputation WHERE donor_id = ?', [user.id]);
      user.reputation = rep || { points: 0, badge: 'Bronze' };
    }

    // Get unread notification count
    const unreadRow = db.get('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0', [user.id]);
    user.unreadNotifications = unreadRow ? unreadRow.count : 0;

    return res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Fetch me error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile.'
    });
  }
}

/**
 * Update current user profile
 * PUT /api/auth/profile
 */
async function updateProfile(req, res) {
  try {
    const { name, phone, address, lat, lng } = req.body;
    const userId = req.user.id;

    db.run(
      `UPDATE users SET
         name = COALESCE(?, name),
         phone = COALESCE(?, phone),
         address = COALESCE(?, address),
         lat = COALESCE(?, lat),
         lng = COALESCE(?, lng)
       WHERE id = ?`,
      [name, phone, address, lat, lng, userId]
    );

    const updatedUser = db.get(
      'SELECT id, name, email, role, org_type, phone, address, lat, lng, verified, created_at FROM users WHERE id = ?',
      [userId]
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile.'
    });
  }
}

/**
 * Guest / Demo Mode Switch: returns a signed token and seeded user for any requested portal role
 * POST /api/auth/guest-switch
 */
async function guestSwitch(req, res) {
  try {
    const role = (req.body && req.body.role ? req.body.role : 'donor').toLowerCase();
    const emailMap = {
      admin: 'admin@medshare.org',
      verifier: 'verifier1@medshare.org',
      donor: 'donor.pharma@example.com',
      recipient: 'recipient.sewa@example.com'
    };
    const email = emailMap[role] || emailMap.donor;
    let user = db.get(
      'SELECT id, name, email, role, org_type, phone, address, lat, lng, verified, created_at FROM users WHERE email = ?',
      [email]
    );
    if (!user) {
      user = db.get(
        'SELECT id, name, email, role, org_type, phone, address, lat, lng, verified, created_at FROM users WHERE role = ? LIMIT 1',
        [role]
      );
    }
    if (!user) {
      return res.status(404).json({ success: false, error: `Demo user for role ${role} not found` });
    }

    if (user.role === 'donor') {
      const rep = db.get('SELECT points, badge FROM reputation WHERE donor_id = ?', [user.id]);
      user.reputation = rep || { points: 0, badge: 'Bronze' };
    }

    const token = generateToken(user);
    return res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    console.error('Guest switch error:', error);
    return res.status(500).json({ success: false, error: 'Failed to switch demo persona.' });
  }
}

module.exports = {
  register,
  login,
  me,
  updateProfile,
  guestSwitch
};
