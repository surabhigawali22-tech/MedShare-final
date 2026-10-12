const db = require('../db/db');

/**
 * Recipient creates a request for an approved donation
 * POST /api/requests
 */
function createRequest(req, res) {
  try {
    const recipient = req.user;
    const { donation_id, quantity } = req.body;

    const requestedQty = parseInt(quantity, 10);
    if (!requestedQty || requestedQty <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please specify a valid quantity greater than 0.'
      });
    }

    // Check donation existence and status
    const donation = db.get(
      `SELECT d.*, m.name as medicine_name, m.generic_name, u.name as donor_name, u.id as donor_id,
              ROUND(julianday(d.expiry_date) - julianday('now')) as days_remaining
       FROM donations d
       JOIN medicines m ON d.medicine_id = m.id
       JOIN users u ON d.donor_id = u.id
       WHERE d.id = ?`,
      [donation_id]
    );

    if (!donation) {
      return res.status(404).json({ success: false, error: 'Donation listing not found.' });
    }

    // Enforce State Machine: Must be in APPROVED status
    if (donation.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: `This donation is currently in "${donation.status}" status and cannot be requested.`
      });
    }

    // Trigger/Constraint check: Expired donation cannot be requested
    if (donation.days_remaining <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot request an expired donation. It has been flagged for safe disposal.'
      });
    }

    // Check quantity availability
    if (requestedQty > donation.quantity) {
      return res.status(400).json({
        success: false,
        error: `Requested quantity (${requestedQty} ${donation.unit}) exceeds available stock (${donation.quantity} ${donation.unit}).`
      });
    }

    // Recipient check: If NGO or clinic, must be verified
    if (recipient.role === 'recipient' && ['ngo', 'clinic'].includes(recipient.org_type) && !recipient.verified) {
      return res.status(403).json({
        success: false,
        error: 'Your organisation account is pending verification. Only approved NGOs and clinics can request medicines.'
      });
    }

    // Check if recipient already has an active pending or accepted request for this donation
    const existingActive = db.get(
      `SELECT id, status FROM requests WHERE recipient_id = ? AND donation_id = ? AND status IN ('PENDING', 'ACCEPTED')`,
      [recipient.id, donation.id]
    );

    if (existingActive) {
      return res.status(409).json({
        success: false,
        error: `You already have an active ${existingActive.status.toLowerCase()} request for this donation.`
      });
    }

    // Calculate baseline match score (0-100)
    const matchScore = Math.min(100, Math.max(50, Math.round(donation.safety_score * 0.95)));

    let requestId;
    const requestTx = db.transaction(() => {
      // 1. Insert request
      const insertRes = db.run(
        `INSERT INTO requests (recipient_id, donation_id, quantity, status, match_score)
         VALUES (?, ?, ?, 'PENDING', ?)`,
        [recipient.id, donation.id, requestedQty, matchScore]
      );
      requestId = insertRes.lastInsertRowid;

      // 2. Append to audit events
      db.run(
        `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'request',
          requestId,
          'CREATED_REQUEST',
          recipient.id,
          JSON.stringify({
            donation_id: donation.id,
            medicine: donation.medicine_name,
            quantity: requestedQty,
            recipient: recipient.name
          })
        ]
      );

      // 3. Notify donor
      db.run(
        `INSERT INTO notifications (user_id, type, message)
         VALUES (?, 'GENERAL', ?)`,
        [
          donation.donor_id,
          `New Request: ${recipient.name} requested ${requestedQty} ${donation.unit} of ${donation.medicine_name}.`
        ]
      );
    });

    requestTx();

    return res.status(201).json({
      success: true,
      message: 'Request submitted successfully. The donor has been notified.',
      request: {
        id: requestId,
        donation_id: donation.id,
        medicine_name: donation.medicine_name,
        quantity: requestedQty,
        status: 'PENDING',
        match_score: matchScore
      }
    });
  } catch (error) {
    console.error('Error creating request:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit request.' });
  }
}

/**
 * Donor views incoming requests for their donations
 * GET /api/requests/incoming
 */
function getIncomingRequests(req, res) {
  try {
    const donorId = req.user.id;

    let requests = db.all(
      `SELECT r.*,
              d.batch_no, d.expiry_date, d.unit, d.trail_id, d.status as donation_status,
              m.name as medicine_name, m.generic_name, m.category,
              u.name as recipient_name, u.email as recipient_email, u.phone as recipient_phone,
              u.org_type as recipient_org_type, u.address as recipient_address, u.verified as recipient_verified,
              h.id as handover_id, h.confirmed_by_donor, h.confirmed_by_recipient, h.qr_scanned_at
       FROM requests r
       JOIN donations d ON r.donation_id = d.id
       JOIN medicines m ON d.medicine_id = m.id
       JOIN users u ON r.recipient_id = u.id
       LEFT JOIN handovers h ON h.request_id = r.id
       WHERE d.donor_id = ?
       ORDER BY r.requested_at DESC`,
      [donorId]
    );

    if (requests.length === 0 && req.isGuest) {
      requests = db.all(
        `SELECT r.*,
                d.batch_no, d.expiry_date, d.unit, d.trail_id, d.status as donation_status,
                m.name as medicine_name, m.generic_name, m.category,
                u.name as recipient_name, u.email as recipient_email, u.phone as recipient_phone,
                u.org_type as recipient_org_type, u.address as recipient_address, u.verified as recipient_verified,
                h.id as handover_id, h.confirmed_by_donor, h.confirmed_by_recipient, h.qr_scanned_at
         FROM requests r
         JOIN donations d ON r.donation_id = d.id
         JOIN medicines m ON d.medicine_id = m.id
         JOIN users u ON r.recipient_id = u.id
         LEFT JOIN handovers h ON h.request_id = r.id
         ORDER BY r.requested_at DESC`
      );
    }

    return res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error('Error fetching incoming requests:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve incoming requests.' });
  }
}

/**
 * Recipient views their outgoing requests
 * GET /api/requests/outgoing
 */
function getOutgoingRequests(req, res) {
  try {
    const recipientId = req.user.id;

    let requests = db.all(
      `SELECT r.*,
              d.batch_no, d.expiry_date, d.unit, d.trail_id, d.status as donation_status,
              m.name as medicine_name, m.generic_name, m.category,
              u.name as donor_name, u.email as donor_email, u.phone as donor_phone,
              u.org_type as donor_org_type, u.address as donor_address,
              h.id as handover_id, h.confirmed_by_donor, h.confirmed_by_recipient, h.qr_scanned_at
       FROM requests r
       JOIN donations d ON r.donation_id = d.id
       JOIN medicines m ON d.medicine_id = m.id
       JOIN users u ON d.donor_id = u.id
       LEFT JOIN handovers h ON h.request_id = r.id
       WHERE r.recipient_id = ?
       ORDER BY r.requested_at DESC`,
      [recipientId]
    );

    if (requests.length === 0 && req.isGuest) {
      requests = db.all(
        `SELECT r.*,
                d.batch_no, d.expiry_date, d.unit, d.trail_id, d.status as donation_status,
                m.name as medicine_name, m.generic_name, m.category,
                u.name as donor_name, u.email as donor_email, u.phone as donor_phone,
                u.org_type as donor_org_type, u.address as donor_address,
                h.id as handover_id, h.confirmed_by_donor, h.confirmed_by_recipient, h.qr_scanned_at
         FROM requests r
         JOIN donations d ON r.donation_id = d.id
         JOIN medicines m ON d.medicine_id = m.id
         JOIN users u ON d.donor_id = u.id
         LEFT JOIN handovers h ON h.request_id = r.id
         ORDER BY r.requested_at DESC`
      );
    }

    return res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error('Error fetching outgoing requests:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve outgoing requests.' });
  }
}

/**
 * Donor responds to a request: Accept or Decline
 * POST /api/requests/:id/respond
 */
function respondToRequest(req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    const donorId = req.user.id;
    const { action } = req.body; // 'ACCEPT' | 'DECLINE'

    if (!['ACCEPT', 'DECLINE'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "ACCEPT" or "DECLINE".'
      });
    }

    const request = db.get(
      `SELECT r.*, d.id as donation_id, d.donor_id, d.medicine_id, d.quantity as donation_qty, d.status as donation_status,
              d.trail_id, m.name as medicine_name, u.name as recipient_name, u.id as recipient_id
       FROM requests r
       JOIN donations d ON r.donation_id = d.id
       JOIN medicines m ON d.medicine_id = m.id
       JOIN users u ON r.recipient_id = u.id
       WHERE r.id = ?`,
      [requestId]
    );

    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found.' });
    }

    if (request.donor_id !== donorId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized. You do not own this donation listing.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: `Cannot respond to this request. Current status is already ${request.status}.`
      });
    }

    const respondTx = db.transaction(() => {
      if (action === 'ACCEPT') {
        // 1. Mark request ACCEPTED
        db.run(`UPDATE requests SET status = 'ACCEPTED' WHERE id = ?`, [requestId]);

        // 2. Mark donation MATCHED
        db.run(`UPDATE donations SET status = 'MATCHED' WHERE id = ?`, [request.donation_id]);

        // 3. Create or update handovers entry (donor confirmation initialized)
        db.run(
          `INSERT INTO handovers (request_id, confirmed_by_donor, confirmed_by_recipient)
           VALUES (?, 1, 0)`,
          [requestId]
        );

        // 4. Log audit events
        db.run(
          `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
           VALUES (?, ?, 'ACCEPTED_REQUEST', ?, ?)`,
          ['request', requestId, donorId, JSON.stringify({ recipient: request.recipient_name })]
        );

        db.run(
          `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
           VALUES (?, ?, 'MATCHED', ?, ?)`,
          ['donation', request.donation_id, donorId, JSON.stringify({ matched_recipient: request.recipient_name, trail_id: request.trail_id })]
        );

        // 5. Notify recipient
        db.run(
          `INSERT INTO notifications (user_id, type, message)
           VALUES (?, 'GENERAL', ?)`,
          [
            request.recipient_id,
            `Match Confirmed! ${req.user.name} accepted your request for ${request.medicine_name}. Scan the QR code during handover.`
          ]
        );
      } else {
        // DECLINE
        db.run(`UPDATE requests SET status = 'DECLINED' WHERE id = ?`, [requestId]);

        db.run(
          `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
           VALUES (?, ?, 'DECLINED_REQUEST', ?, ?)`,
          ['request', requestId, donorId, JSON.stringify({ recipient: request.recipient_name })]
        );

        db.run(
          `INSERT INTO notifications (user_id, type, message)
           VALUES (?, 'GENERAL', ?)`,
          [
            request.recipient_id,
            `Your request for ${request.medicine_name} was declined by the donor.`
          ]
        );
      }
    });

    respondTx();

    return res.json({
      success: true,
      message: action === 'ACCEPT' ? 'Request accepted and donation marked MATCHED.' : 'Request declined.',
      status: action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED'
    });
  } catch (error) {
    console.error('Error responding to request:', error);
    return res.status(500).json({ success: false, error: 'Failed to process request response.' });
  }
}

module.exports = {
  createRequest,
  getIncomingRequests,
  getOutgoingRequests,
  respondToRequest
};
