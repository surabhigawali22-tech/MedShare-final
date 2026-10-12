const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/db');

/**
 * Middleware: Verify JWT and attach current user to req.user
 */
function resolveGuestUser(req, forcedRole) {
  const guestRoleHeader = req.headers['x-guest-role'] || '';
  const authHeader = req.headers['authorization'] || '';
  let role = forcedRole || '';

  if (!role && authHeader.startsWith('Bearer guest-')) {
    role = authHeader.slice(13).trim().toLowerCase();
  } else if (!role && guestRoleHeader) {
    role = guestRoleHeader.trim().toLowerCase();
  }

  // If no explicit role in token/header, deduce from route path:
  if (!role) {
    const p = req.originalUrl || req.url || '';
    if (p.includes('/admin')) role = 'admin';
    else if (p.includes('/verification')) role = 'verifier';
    else if (p.includes('/requests/outgoing')) role = 'recipient';
    else if (p.includes('/requests/incoming') || p.includes('/donations/my') || p.includes('/inventory')) role = 'donor';
    else role = 'donor';
  }

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
  return user;
}

/**
 * Middleware: Verify JWT or support Guest Demo Mode
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7).trim() 
    : null;

  // 1. If valid Bearer token provided, try JWT verification
  if (token && !token.startsWith('guest') && token !== 'null' && token !== 'undefined') {
    return jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
      if (!err && decoded) {
        const user = db.get(
          'SELECT id, name, email, role, org_type, phone, address, lat, lng, verified, created_at FROM users WHERE id = ?',
          [decoded.id]
        );
        if (user) {
          req.user = user;
          return next();
        }
      }
      // If token failed verification or user was not found, fall through to Guest Mode check for read requests
      handleGuestFallback(req, res, next);
    });
  }

  // 2. No valid JWT provided -> Guest Mode fallback
  handleGuestFallback(req, res, next);
}

function handleGuestFallback(req, res, next) {
  const isRead = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const demoUser = resolveGuestUser(req);

  if (isRead && demoUser) {
    req.user = demoUser;
    req.isGuest = true;
    return next();
  }

  // For write requests in Guest Mode:
  const isGuestHeader = req.headers['x-guest-mode'] === 'true' || 
    (req.headers['authorization'] && req.headers['authorization'].includes('guest')) ||
    Boolean(req.headers['x-guest-role']);

  if (isGuestHeader) {
    return res.status(403).json({
      success: false,
      error: 'Guest Mode: Login required for this action.'
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Access token required. Please sign in.'
  });
}

/**
 * Middleware: Role-Based Access Control (RBAC)
 * @param {string|string[]} roles - One or more allowed roles ('donor', 'recipient', 'verifier', 'admin')
 */
function requireRole(...roles) {
  const allowed = roles.flat();
  return (req, res, next) => {
    if (!req.user && ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      req.user = resolveGuestUser(req, allowed[0]);
    }

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    if (!allowed.includes(req.user.role)) {
      // If guest is in read mode on a role-restricted endpoint, align role to allowed[0]
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const guestUser = resolveGuestUser(req, allowed[0]);
        if (guestUser) {
          req.user = guestUser;
          return next();
        }
      }
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of the following roles: ${allowed.join(', ')}.`
      });
    }

    next();
  };
}

/**
 * Middleware: Require verified NGO/Clinic recipient
 */
function requireVerifiedRecipient(req, res, next) {
  if (!req.user) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      req.user = resolveGuestUser(req, 'recipient');
      return next();
    }
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  if (req.isGuest) {
    return res.status(403).json({
      success: false,
      error: 'Guest Mode: Login required for this action.'
    });
  }

  if (req.user.role === 'recipient' && ['ngo', 'clinic'].includes(req.user.org_type) && !req.user.verified) {
    return res.status(403).json({
      success: false,
      error: 'Your organisation account is currently pending administrative verification.'
    });
  }

  next();
}

/**
 * Optional token authentication (doesn't fail if no token provided)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7).trim() 
    : null;

  if (!token) {
    return next();
  }

  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (!err && decoded) {
      const user = db.get(
        'SELECT id, name, email, role, org_type, phone, address, lat, lng, verified FROM users WHERE id = ?',
        [decoded.id]
      );
      if (user) {
        req.user = user;
      }
    }
    next();
  });
}

module.exports = {
  authenticateToken,
  requireRole,
  requireVerifiedRecipient,
  optionalAuth,
  resolveGuestUser
};
