const db = require('../db/db');
const { haversineDistance } = require('../utils/matchEngine');

/**
 * Recipient posts an urgent need
 * POST /api/urgent-needs
 */
function createUrgentNeed(req, res) {
  try {
    const recipient = req.user;
    const { medicine_id, quantity, needed_by, lat, lng } = req.body;

    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, error: 'Valid quantity required.' });
    }

    if (!needed_by) {
      return res.status(400).json({ success: false, error: 'Needed-by date is required.' });
    }

    const medicine = db.get('SELECT * FROM medicines WHERE id = ?', [medicine_id]);
    if (!medicine) {
      return res.status(400).json({ success: false, error: 'Selected medicine not found in catalog.' });
    }

    const recipientLat = lat || recipient.lat || 19.0760;
    const recipientLng = lng || recipient.lng || 72.8777;

    const insertResult = db.run(
      `INSERT INTO urgent_needs (recipient_id, medicine_id, quantity, needed_by, lat, lng, status)
       VALUES (?, ?, ?, ?, ?, ?, 'OPEN')`,
      [recipient.id, medicine.id, qty, needed_by, recipientLat, recipientLng]
    );

    const urgentNeedId = insertResult.lastInsertRowid;

    // Record audit event
    db.run(
      `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
       VALUES ('urgent_need', ?, 'CREATED', ?, ?)`,
      [urgentNeedId, recipient.id, JSON.stringify({ medicine: medicine.name, quantity: qty, needed_by })]
    );

    // Notify matching donors who have approved donations of this medicine or are nearby
    const matchingDonors = db.all(
      `SELECT DISTINCT u.id, u.name, u.email
       FROM donations d
       JOIN users u ON d.donor_id = u.id
       WHERE d.medicine_id = ? AND d.status = 'APPROVED'`,
      [medicine.id]
    );

    for (const donor of matchingDonors) {
      db.run(
        `INSERT INTO notifications (user_id, type, message)
         VALUES (?, 'URGENT_NEED_MATCH', ?)`,
        [
          donor.id,
          `Urgent Need Alert: ${recipient.name} desperately needs ${qty} units of ${medicine.name} by ${needed_by}. You have verified stock!`
        ]
      );
    }

    return res.status(201).json({
      success: true,
      message: `Urgent need for ${medicine.name} published. ${matchingDonors.length} matching donors alerted.`,
      urgent_need: {
        id: urgentNeedId,
        medicine_name: medicine.name,
        quantity: qty,
        needed_by,
        status: 'OPEN'
      }
    });
  } catch (error) {
    console.error('Error creating urgent need:', error);
    return res.status(500).json({ success: false, error: 'Failed to create urgent need.' });
  }
}

/**
 * Get all urgent needs with filtering
 * GET /api/urgent-needs?status=OPEN&medicine_id=1
 */
function getUrgentNeeds(req, res) {
  try {
    const { status = 'OPEN', search } = req.query;

    let sql = `
      SELECT un.*,
             m.name as medicine_name, m.generic_name, m.category, m.requires_prescription, m.storage_condition,
             u.name as recipient_name, u.org_type as recipient_org_type, u.phone as recipient_phone,
             u.address as recipient_address, u.verified as recipient_verified,
             (SELECT COUNT(*) FROM donations d WHERE d.medicine_id = un.medicine_id AND d.status = 'APPROVED') as available_donor_stocks
      FROM urgent_needs un
      JOIN medicines m ON un.medicine_id = m.id
      JOIN users u ON un.recipient_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND un.status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      sql += ' AND (m.name LIKE ? OR m.generic_name LIKE ? OR u.name LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ' ORDER BY un.needed_by ASC';

    const urgentNeeds = db.all(sql, params);

    return res.json({
      success: true,
      count: urgentNeeds.length,
      urgent_needs: urgentNeeds
    });
  } catch (error) {
    console.error('Error fetching urgent needs:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve urgent needs.' });
  }
}

/**
 * Close or cancel urgent need
 * PATCH /api/urgent-needs/:id/status
 */
function updateUrgentNeedStatus(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body; // 'FULFILLED' | 'CANCELLED'
    const userId = req.user.id;

    if (!['FULFILLED', 'CANCELLED', 'OPEN'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }

    const urgentNeed = db.get('SELECT * FROM urgent_needs WHERE id = ?', [id]);
    if (!urgentNeed) {
      return res.status(404).json({ success: false, error: 'Urgent need record not found.' });
    }

    if (urgentNeed.recipient_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify this urgent need.' });
    }

    db.run('UPDATE urgent_needs SET status = ? WHERE id = ?', [status, id]);

    return res.json({ success: true, message: `Urgent need updated to ${status}.` });
  } catch (error) {
    console.error('Error updating urgent need status:', error);
    return res.status(500).json({ success: false, error: 'Failed to update urgent need.' });
  }
}

module.exports = {
  createUrgentNeed,
  getUrgentNeeds,
  updateUrgentNeedStatus
};
