const db = require('../db/db');

/**
 * Get items currently in disposal queue or logged disposal records
 * GET /api/disposal
 */
function getDisposalQueue(req, res) {
  try {
    // 1. Expired donations awaiting disposal logging or already recorded
    const expiredDonations = db.all(
      `SELECT d.id as source_id, 'donation' as source_type, m.name as medicine_name,
              d.batch_no, d.expiry_date, d.quantity, d.unit, d.status,
              u.name as owner_name, u.email as owner_email,
              (SELECT disposed_at FROM disposal_records dr WHERE dr.source_type = 'donation' AND dr.source_id = d.id LIMIT 1) as disposed_at,
              (SELECT method FROM disposal_records dr WHERE dr.source_type = 'donation' AND dr.source_id = d.id LIMIT 1) as disposal_method,
              (SELECT reason FROM disposal_records dr WHERE dr.source_type = 'donation' AND dr.source_id = d.id LIMIT 1) as disposal_reason
       FROM donations d
       JOIN medicines m ON d.medicine_id = m.id
       JOIN users u ON d.donor_id = u.id
       WHERE d.status = 'EXPIRED'
          OR d.id IN (SELECT source_id FROM disposal_records WHERE source_type = 'donation')
       ORDER BY d.expiry_date DESC`
    );

    // 2. Personal cabinet items expired
    const expiredInventory = db.all(
      `SELECT i.id as source_id, 'inventory' as source_type, i.medicine_name,
              NULL as batch_no, i.expiry_date, i.quantity, 'units' as unit, 'CABINET_EXPIRED' as status,
              u.name as owner_name, u.email as owner_email,
              (SELECT disposed_at FROM disposal_records dr WHERE dr.source_type = 'inventory' AND dr.source_id = i.id LIMIT 1) as disposed_at,
              (SELECT method FROM disposal_records dr WHERE dr.source_type = 'inventory' AND dr.source_id = i.id LIMIT 1) as disposal_method,
              (SELECT reason FROM disposal_records dr WHERE dr.source_type = 'inventory' AND dr.source_id = i.id LIMIT 1) as disposal_reason
       FROM inventory i
       JOIN users u ON i.owner_id = u.id
       WHERE date(i.expiry_date) <= date('now')
          OR i.id IN (SELECT source_id FROM disposal_records WHERE source_type = 'inventory')
       ORDER BY i.expiry_date DESC`
    );

    const allDisposalItems = [...expiredDonations, ...expiredInventory];

    // Fetch regulatory guidance text
    const guidanceSetting = db.get("SELECT value FROM settings WHERE key = 'DISPOSAL_GUIDELINES_URL'");
    const guidelinesUrl = guidanceSetting ? guidanceSetting.value : 'https://cpcb.nic.in/bio-medical-waste-management-rules/';

    return res.json({
      success: true,
      guidelines: {
        summary: 'Under National Bio-Medical Waste Management Rules, expired pharmaceuticals must NEVER be discarded down sinks, drains, or municipal solid waste. Solid dosage forms should be collected and returned to authorized pharmacy take-back bins for high-temperature incineration (>1000°C) or chemical encapsulation.',
        referenceUrl: guidelinesUrl,
        recommendedMethods: [
          { key: 'authorized_pharmacy_takeback', label: 'Authorized Pharmacy Take-Back Bin (Recommended)', desc: 'Returned to licensed pharmacy or government collection depot.' },
          { key: 'high_temp_incineration', label: 'High-Temperature Incineration', desc: 'Processed by an authorized biomedical waste treatment facility.' },
          { key: 'chemical_inactivation', label: 'Chemical Inactivation / Encapsulation', desc: 'Mixed with inert mortar matrix or active absorbent to neutralize bio-activity.' }
        ]
      },
      count: allDisposalItems.length,
      items: allDisposalItems
    });
  } catch (error) {
    console.error('Error fetching disposal queue:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve disposal queue.' });
  }
}

/**
 * Log safe disposal of an expired medicine
 * POST /api/disposal/log
 */
function logDisposal(req, res) {
  try {
    const { source_type, source_id, reason, method } = req.body;
    const actorId = req.user.id;

    if (!['donation', 'inventory'].includes(source_type)) {
      return res.status(400).json({ success: false, error: 'Invalid source type.' });
    }

    if (!source_id) {
      return res.status(400).json({ success: false, error: 'Source item ID is required.' });
    }

    if (!method) {
      return res.status(400).json({ success: false, error: 'Disposal method must be specified.' });
    }

    const validReason = reason || 'Expired product rendered safely inert';

    const insertRes = db.run(
      `INSERT INTO disposal_records (source_type, source_id, reason, method, disposed_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [source_type, source_id, validReason, method]
    );

    // Audit event
    db.run(
      `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
       VALUES ('disposal', ?, 'LOGGED_DISPOSAL', ?, ?)`,
      [insertRes.lastInsertRowid, actorId, JSON.stringify({ source_type, source_id, method, reason: validReason })]
    );

    return res.json({
      success: true,
      message: 'Safe disposal recorded successfully in regulatory audit log.',
      record_id: insertRes.lastInsertRowid
    });
  } catch (error) {
    console.error('Error logging disposal:', error);
    return res.status(500).json({ success: false, error: 'Failed to record disposal.' });
  }
}

module.exports = {
  getDisposalQueue,
  logDisposal
};
