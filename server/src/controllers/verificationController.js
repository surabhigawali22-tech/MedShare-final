const db = require('../db/db');
const { calculateSafetyScore } = require('../utils/safetyScore');

/**
 * Get verifier review queue
 * GET /api/verifications/queue
 */
function getVerificationQueue(req, res) {
  try {
    const queue = db.all(
      `SELECT d.*, 
              m.name as medicine_name, m.generic_name, m.category, m.requires_prescription, m.storage_condition as med_storage,
              u.name as donor_name, u.org_type as donor_org_type, u.email as donor_email, u.phone as donor_phone,
              u.address as donor_address, u.verified as donor_verified,
              ROUND(julianday(d.expiry_date) - julianday('now')) as days_remaining,
              (SELECT COUNT(*) FROM donations past WHERE past.donor_id = d.donor_id) as donor_total_donations,
              (SELECT COUNT(*) FROM donations past WHERE past.donor_id = d.donor_id AND past.status = 'REJECTED') as donor_rejections,
              (SELECT COUNT(*) FROM donations past WHERE past.donor_id = d.donor_id AND past.status = 'COMPLETED') as donor_completed
       FROM donations d
       JOIN medicines m ON d.medicine_id = m.id
       JOIN users u ON d.donor_id = u.id
       WHERE d.status IN ('UNDER_REVIEW', 'LISTED')
       ORDER BY d.created_at ASC`
    );

    return res.json({
      success: true,
      count: queue.length,
      queue
    });
  } catch (error) {
    console.error('Error fetching verification queue:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve verification queue.' });
  }
}

/**
 * Submit verification decision (Approve or Reject with remarks)
 * POST /api/verifications/:donationId
 */
function submitVerification(req, res) {
  try {
    const donationId = parseInt(req.params.donationId, 10);
    const verifierId = req.user.id;
    const { decision, remarks } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid decision. Must be either "APPROVED" or "REJECTED".'
      });
    }

    if (!remarks || !remarks.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Pharmacist clinical remarks are required for audit compliance.'
      });
    }

    // Check donation existence and current state
    const donation = db.get(
      `SELECT d.*, m.name as medicine_name, u.email as donor_email, u.name as donor_name
       FROM donations d
       JOIN medicines m ON d.medicine_id = m.id
       JOIN users u ON d.donor_id = u.id
       WHERE d.id = ?`,
      [donationId]
    );

    if (!donation) {
      return res.status(404).json({ success: false, error: 'Donation not found.' });
    }

    if (!['UNDER_REVIEW', 'LISTED'].includes(donation.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot verify donation. Current status is ${donation.status}. Only items in UNDER_REVIEW can be verified.`
      });
    }

    // Calculate updated safety score upon verification
    const donor = db.get('SELECT * FROM users WHERE id = ?', [donation.donor_id]);
    const newSafetyScore = calculateSafetyScore({
      packaging: donation.packaging,
      expiry_date: donation.expiry_date,
      storage_condition: donation.storage_condition,
      status: decision
    }, donor);

    // Run in transaction
    const updateTransaction = db.transaction(() => {
      // 1. Update donation status and safety score
      db.run(
        `UPDATE donations SET status = ?, safety_score = ? WHERE id = ?`,
        [decision, newSafetyScore, donationId]
      );

      // 2. Insert verification record
      db.run(
        `INSERT INTO verifications (donation_id, verifier_id, decision, remarks)
         VALUES (?, ?, ?, ?)`,
        [donationId, verifierId, decision, remarks.trim()]
      );

      // 3. Append to Audit Events
      db.run(
        `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'donation',
          donationId,
          `VERIFIED_${decision}`,
          verifierId,
          JSON.stringify({
            verifier: req.user.name,
            decision,
            remarks: remarks.trim(),
            safety_score: newSafetyScore
          })
        ]
      );

      // 4. Send in-app notification to donor
      const notificationMsg = decision === 'APPROVED'
        ? `Great news! Your donation of ${donation.medicine_name} (Batch ${donation.batch_no}) was approved by Pharmacist ${req.user.name}. It is now available for matching.`
        : `Your donation of ${donation.medicine_name} (Batch ${donation.batch_no}) was rejected during pharmacist inspection. Reason: ${remarks.trim()}`;

      db.run(
        `INSERT INTO notifications (user_id, type, message) VALUES (?, 'VERIFICATION', ?)`,
        [donation.donor_id, notificationMsg]
      );
    });

    updateTransaction();

    return res.json({
      success: true,
      message: `Donation ${decision.toLowerCase()} successfully.`,
      status: decision,
      safety_score: newSafetyScore
    });
  } catch (error) {
    console.error('Error submitting verification:', error);
    return res.status(500).json({ success: false, error: 'Failed to record verification decision.' });
  }
}

module.exports = {
  getVerificationQueue,
  submitVerification
};
