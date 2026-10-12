const db = require('../db/db');

/**
 * Get all users with filtering
 * GET /api/admin/users
 */
function getUsers(req, res) {
  try {
    const { role, verified } = req.query;
    let sql = 'SELECT id, name, email, role, org_type, phone, address, lat, lng, verified, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    if (verified !== undefined) {
      sql += ' AND verified = ?';
      params.push(Number(verified));
    }

    sql += ' ORDER BY created_at DESC';
    const users = db.all(sql, params);

    return res.json({ success: true, count: users.length, users });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve users.' });
  }
}

/**
 * Update user verification status (Approve / Revoke NGO, Clinic, Verifier)
 * PATCH /api/admin/users/:id/verify
 */
function verifyUser(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    const { verified } = req.body; // 1 or 0
    const adminId = req.user.id;

    const user = db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    db.run('UPDATE users SET verified = ? WHERE id = ?', [Number(verified), userId]);

    // Audit event
    db.run(
      `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
       VALUES ('user', ?, ?, ?, ?)`,
      [userId, verified ? 'VERIFIED_USER' : 'REVOKED_USER', adminId, JSON.stringify({ target_user: user.name, role: user.role })]
    );

    // Notify user
    db.run(
      `INSERT INTO notifications (user_id, type, message) VALUES (?, 'VERIFICATION', ?)`,
      [userId, verified ? 'Your MedShare organisation account has been verified and approved by the Administrator!' : 'Your organisation verification status was updated by the Administrator.']
    );

    return res.json({
      success: true,
      message: `User ${user.name} verification set to ${verified ? 'Verified (Approved)' : 'Unverified'}.`
    });
  } catch (error) {
    console.error('Error verifying user:', error);
    return res.status(500).json({ success: false, error: 'Failed to update user verification.' });
  }
}

/**
 * Get all system settings
 * GET /api/admin/settings
 */
function getSettings(req, res) {
  try {
    const rows = db.all('SELECT key, value FROM settings');
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve settings.' });
  }
}

/**
 * Update system setting (MIN_SHELF_LIFE_DAYS, MAX_RADIUS_KM, etc.)
 * PUT /api/admin/settings
 */
function updateSettings(req, res) {
  try {
    const updates = req.body; // { key: value, ... }
    const adminId = req.user.id;

    for (const [key, value] of Object.entries(updates)) {
      db.run(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = ?`,
        [key, String(value), String(value)]
      );
    }

    // Audit event
    db.run(
      `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
       VALUES ('settings', 0, 'UPDATED_SETTINGS', ?, ?)`,
      [adminId, JSON.stringify(updates)]
    );

    return res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ success: false, error: 'Failed to save settings.' });
  }
}

/**
 * Get demand-gap heatmap data: open urgent needs vs available surplus by location
 * GET /api/admin/heatmap
 */
function getHeatmapData(req, res) {
  try {
    // 1. Open urgent needs locations
    const needs = db.all(
      `SELECT un.id, un.medicine_id, m.name as medicine_name, un.quantity, un.lat, un.lng,
              u.name as recipient_name, un.needed_by
       FROM urgent_needs un
       JOIN medicines m ON un.medicine_id = m.id
       JOIN users u ON un.recipient_id = u.id
       WHERE un.status = 'OPEN' AND un.lat IS NOT NULL AND un.lng IS NOT NULL`
    );

    // 2. Approved surplus donations locations
    const surplus = db.all(
      `SELECT d.id, d.medicine_id, m.name as medicine_name, d.quantity, u.lat, u.lng,
              u.name as donor_name, d.expiry_date, d.batch_no
       FROM donations d
       JOIN medicines m ON d.medicine_id = m.id
       JOIN users u ON d.donor_id = u.id
       WHERE d.status = 'APPROVED' AND u.lat IS NOT NULL AND u.lng IS NOT NULL`
    );

    return res.json({
      success: true,
      urgent_needs: needs,
      available_surplus: surplus
    });
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve heatmap data.' });
  }
}

/**
 * Get overall system reports and analytics
 * GET /api/admin/reports
 */
function getReports(req, res) {
  try {
    const userBreakdown = db.all(
      `SELECT role, org_type, COUNT(*) as count, SUM(verified) as verified_count
       FROM users GROUP BY role, org_type`
    );

    const donationStatusBreakdown = db.all(
      `SELECT status, COUNT(*) as count, SUM(quantity) as total_quantity
       FROM donations GROUP BY status`
    );

    const recentAudits = db.all(
      `SELECT a.*, u.name as actor_name, u.role as actor_role
       FROM audit_events a
       LEFT JOIN users u ON a.actor_id = u.id
       ORDER BY a.created_at DESC LIMIT 20`
    );

    return res.json({
      success: true,
      user_breakdown: userBreakdown,
      donation_breakdown: donationStatusBreakdown,
      recent_audits: recentAudits
    });
  } catch (error) {
    console.error('Error fetching admin reports:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve reports.' });
  }
}

module.exports = {
  getUsers,
  verifyUser,
  getSettings,
  updateSettings,
  getHeatmapData,
  getReports
};
