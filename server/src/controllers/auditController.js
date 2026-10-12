const db = require('../db/db');

/**
 * Get system audit events trail
 * GET /api/audit-events?entity_type=donation&entity_id=1
 */
function getAuditEvents(req, res) {
  try {
    const { entity_type, entity_id, limit = 50 } = req.query;

    let sql = `
      SELECT a.*, u.name as actor_name, u.email as actor_email, u.role as actor_role
      FROM audit_events a
      LEFT JOIN users u ON a.actor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (entity_type) {
      sql += ' AND a.entity_type = ?';
      params.push(entity_type);
    }

    if (entity_id) {
      sql += ' AND a.entity_id = ?';
      params.push(Number(entity_id));
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ?';
    params.push(Number(limit));

    const events = db.all(sql, params);

    return res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Error fetching audit events:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve audit events.' });
  }
}

module.exports = {
  getAuditEvents
};
