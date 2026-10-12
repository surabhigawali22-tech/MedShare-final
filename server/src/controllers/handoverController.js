const QRCode = require('qrcode');
const db = require('../db/db');

/**
 * Determine badge level by cumulative points
 */
function getBadgeLevel(points) {
  if (points >= 1200) return 'Platinum';
  if (points >= 750) return 'Gold';
  if (points >= 300) return 'Silver';
  return 'Bronze';
}

/**
 * Get handover QR code and status for a matched request
 * GET /api/handovers/:requestId
 */
async function getHandoverDetails(req, res) {
  try {
    const requestId = parseInt(req.params.requestId, 10);
    const userId = req.user.id;

    const request = db.get(
      `SELECT r.*,
              d.id as donation_id, d.donor_id, d.batch_no, d.expiry_date, d.quantity as donation_qty,
              d.unit, d.status as donation_status, d.trail_id, d.safety_score,
              m.name as medicine_name, m.generic_name, m.category,
              uDonor.name as donor_name, uDonor.email as donor_email, uDonor.phone as donor_phone,
              uRecip.name as recipient_name, uRecip.email as recipient_email, uRecip.phone as recipient_phone,
              h.id as handover_id, h.qr_scanned_at, h.confirmed_by_donor, h.confirmed_by_recipient, h.completed_at
       FROM requests r
       JOIN donations d ON r.donation_id = d.id
       JOIN medicines m ON d.medicine_id = m.id
       JOIN users uDonor ON d.donor_id = uDonor.id
       JOIN users uRecip ON r.recipient_id = uRecip.id
       LEFT JOIN handovers h ON h.request_id = r.id
       WHERE r.id = ?`,
      [requestId]
    );

    if (!request) {
      return res.status(404).json({ success: false, error: 'Handover details not found.' });
    }

    // Auth check: must be donor, recipient, or admin
    if (request.donor_id !== userId && request.recipient_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized to view this handover session.' });
    }

    // Generate QR code data URL encoding the batch trail ID and verification payload
    const qrPayload = JSON.stringify({
      trail_id: request.trail_id,
      request_id: request.id,
      batch_no: request.batch_no,
      medicine: request.medicine_name,
      quantity: request.quantity
    });

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 280,
      color: {
        dark: '#0f766e',
        light: '#ffffff'
      }
    });

    return res.json({
      success: true,
      handover: {
        ...request,
        qr_code: qrDataUrl
      }
    });
  } catch (error) {
    console.error('Error fetching handover details:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve handover details.' });
  }
}

/**
 * Recipient scans QR code to verify and confirm handover
 * POST /api/handovers/scan
 */
async function scanHandoverQR(req, res) {
  try {
    const recipient = req.user;
    const { trail_id } = req.body;

    if (!trail_id || !trail_id.trim()) {
      return res.status(400).json({ success: false, error: 'Batch Trail ID is required.' });
    }

    // Look up donation by trail_id
    const donation = db.get(
      `SELECT d.*, m.name as medicine_name, u.name as donor_name, u.id as donor_id,
              ROUND(julianday(d.expiry_date) - julianday('now')) as days_remaining
       FROM donations d
       JOIN medicines m ON d.medicine_id = m.id
       JOIN users u ON d.donor_id = u.id
       WHERE d.trail_id = ?`,
      [trail_id.trim()]
    );

    if (!donation) {
      return res.status(404).json({ success: false, error: 'Invalid QR Code: Batch Trail not found in registry.' });
    }

    // Check matching accepted request
    const request = db.get(
      `SELECT r.*, u.name as recipient_name
       FROM requests r
       JOIN users u ON r.recipient_id = u.id
       WHERE r.donation_id = ? AND r.status = 'ACCEPTED'`,
      [donation.id]
    );

    if (!request) {
      return res.status(400).json({
        success: false,
        error: `Cannot scan QR: This donation is currently "${donation.status}". No accepted request exists for this batch.`
      });
    }

    // Enforce authorization: Must be the recipient who submitted the accepted request (or admin)
    if (request.recipient_id !== recipient.id && recipient.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: `Unauthorized: This medicine batch was matched specifically to "${request.recipient_name}". Only the designated recipient may confirm handover.`
      });
    }

    if (donation.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Double-claiming prevented: This batch handover has already been completed and confirmed.'
      });
    }

    // Calculate Points earned by Donor (Base 50 + near-expiry rescue bonus + urgent need bonus)
    let pointsEarned = 50;
    const nearExpiryBonus = donation.days_remaining <= 120 ? 25 : 0;

    // Check if recipient had an open urgent need for this medicine
    const matchingUrgentNeed = db.get(
      `SELECT id FROM urgent_needs WHERE recipient_id = ? AND medicine_id = ? AND status = 'OPEN'`,
      [request.recipient_id, donation.medicine_id]
    );
    const urgentNeedBonus = matchingUrgentNeed ? 25 : 0;
    pointsEarned += (nearExpiryBonus + urgentNeedBonus);

    // Complete transaction
    const completeTx = db.transaction(() => {
      const now = new Date().toISOString();

      // 1. Update handovers table
      db.run(
        `UPDATE handovers SET
           qr_scanned_at = ?,
           confirmed_by_recipient = 1,
           confirmed_by_donor = 1,
           completed_at = ?
         WHERE request_id = ?`,
        [now, now, request.id]
      );

      // 2. Update request and donation to COMPLETED
      db.run(`UPDATE requests SET status = 'COMPLETED' WHERE id = ?`, [request.id]);
      db.run(`UPDATE donations SET status = 'COMPLETED' WHERE id = ?`, [donation.id]);

      // 3. Mark matching urgent need as fulfilled if exists
      if (matchingUrgentNeed) {
        db.run(`UPDATE urgent_needs SET status = 'FULFILLED' WHERE id = ?`, [matchingUrgentNeed.id]);
      }

      // 4. Update Donor Reputation Points & Badges
      const currentRep = db.get('SELECT points FROM reputation WHERE donor_id = ?', [donation.donor_id]);
      const newPoints = (currentRep ? currentRep.points : 0) + pointsEarned;
      const newBadge = getBadgeLevel(newPoints);

      db.run(
        `INSERT INTO reputation (donor_id, points, badge)
         VALUES (?, ?, ?)
         ON CONFLICT(donor_id) DO UPDATE SET points = ?, badge = ?`,
        [donation.donor_id, newPoints, newBadge, newPoints, newBadge]
      );

      // 5. Append to Audit Events
      db.run(
        `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
         VALUES (?, ?, 'HANDED_OVER', ?, ?)`,
        [
          'donation',
          donation.id,
          recipient.id,
          JSON.stringify({
            qr_verified: true,
            trail_id: donation.trail_id,
            recipient: recipient.name,
            points_awarded: pointsEarned
          })
        ]
      );

      db.run(
        `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
         VALUES (?, ?, 'COMPLETED', ?, ?)`,
        [
          'donation',
          donation.id,
          recipient.id,
          JSON.stringify({
            completed_at: now,
            quantity: request.quantity,
            total_donor_points: newPoints,
            badge: newBadge
          })
        ]
      );

      // 6. In-App Notifications
      db.run(
        `INSERT INTO notifications (user_id, type, message)
         VALUES (?, 'HANDOVER', ?)`,
        [
          donation.donor_id,
          `Handover Complete! ${recipient.name} scanned your QR code and confirmed receipt of ${donation.medicine_name}. You earned +${pointsEarned} reputation points!`
        ]
      );

      db.run(
        `INSERT INTO notifications (user_id, type, message)
         VALUES (?, 'HANDOVER', ?)`,
        [
          recipient.id,
          `Handover Confirmed! You have safely received ${request.quantity} ${donation.unit} of ${donation.medicine_name}. Batch trail verified.`
        ]
      );
    });

    completeTx();

    return res.json({
      success: true,
      message: 'QR code verified and handover completed successfully!',
      donation_id: donation.id,
      trail_id: donation.trail_id,
      status: 'COMPLETED',
      points_earned: pointsEarned,
      recipient: recipient.name
    });
  } catch (error) {
    console.error('Error confirming handover via QR:', error);
    return res.status(500).json({ success: false, error: 'Failed to process handover QR scan.' });
  }
}

/**
 * Public Batch Trail Timeline (No Authentication Required)
 * GET /api/trail/:trailId
 */
function getPublicTrail(req, res) {
  try {
    const { trailId } = req.params;

    const donation = db.get(
      `SELECT d.id, d.batch_no, d.expiry_date, d.quantity, d.unit, d.packaging,
              d.storage_condition, d.image_url, d.status, d.safety_score, d.trail_id, d.created_at,
              m.name as medicine_name, m.generic_name, m.category, m.requires_prescription,
              u.name as donor_name, u.org_type as donor_org_type,
              ROUND(julianday(d.expiry_date) - julianday('now')) as days_remaining
       FROM donations d
       JOIN medicines m ON d.medicine_id = m.id
       JOIN users u ON d.donor_id = u.id
       WHERE d.trail_id = ?`,
      [trailId]
    );

    if (!donation) {
      return res.status(404).json({ success: false, error: 'Batch Trail not found in MedShare registry.' });
    }

    // Fetch verification log
    const verification = db.get(
      `SELECT v.*, u.name as verifier_name
       FROM verifications v
       JOIN users u ON v.verifier_id = u.id
       WHERE v.donation_id = ?
       ORDER BY v.created_at DESC LIMIT 1`,
      [donation.id]
    );

    // Fetch handover info if any
    const handover = db.get(
      `SELECT h.*, r.quantity as requested_quantity, u.name as recipient_name, u.org_type as recipient_org_type
       FROM handovers h
       JOIN requests r ON h.request_id = r.id
       JOIN users u ON r.recipient_id = u.id
       WHERE r.donation_id = ?`,
      [donation.id]
    );

    // Fetch audit events
    const timeline = db.all(
      `SELECT a.action, a.created_at, a.metadata_json, u.name as actor_name, u.role as actor_role
       FROM audit_events a
       LEFT JOIN users u ON a.actor_id = u.id
       WHERE a.entity_type = 'donation' AND a.entity_id = ?
       ORDER BY a.created_at ASC`,
      [donation.id]
    );

    const isExpired = donation.days_remaining <= 0;

    return res.json({
      success: true,
      trail: {
        ...donation,
        is_expired: isExpired,
        verification,
        handover,
        timeline
      }
    });
  } catch (error) {
    console.error('Error fetching public batch trail:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve public batch trail.' });
  }
}

module.exports = {
  getHandoverDetails,
  scanHandoverQR,
  getPublicTrail
};
