const db = require('../db/db');
const { calculateSafetyScore } = require('../utils/safetyScore');

/**
 * Get setting value helper
 */
function getSetting(key, defaultValue) {
  const row = db.get('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : defaultValue;
}

/**
 * Create a new donation listing with server-side safety checks
 * POST /api/donations
 */
async function createDonation(req, res) {
  try {
    const donor = req.user;
    const {
      medicine_id,
      batch_no,
      expiry_date,
      quantity,
      unit = 'strips',
      packaging = 'sealed',
      storage_condition = 'normal'
    } = req.body;

    const file = req.file;
    const imageUrl = file ? `/uploads/${file.filename}` : null;

    // 1. Verify Medicine exists in catalog
    const medicine = db.get('SELECT * FROM medicines WHERE id = ?', [medicine_id]);
    if (!medicine) {
      return res.status(400).json({
        success: false,
        error: 'Selected medicine was not found in the approved catalog.'
      });
    }

    // 2. Reject if expiry date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDateObj = new Date(expiry_date);
    expiryDateObj.setHours(0, 0, 0, 0);

    if (isNaN(expiryDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid expiry date format. Please provide YYYY-MM-DD.'
      });
    }

    if (expiryDateObj <= today) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: Expiry date cannot be in the past. Expired medicines must be safely disposed of.'
      });
    }

    // 3. Reject if remaining shelf life is below MIN_SHELF_LIFE_DAYS
    const minShelfLifeDays = parseInt(getSetting('MIN_SHELF_LIFE_DAYS', '90'), 10);
    const diffTime = expiryDateObj - today;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining < minShelfLifeDays) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: Remaining shelf life (${daysRemaining} days) is below the minimum required standard of ${minShelfLifeDays} days for redistribution.`
      });
    }

    // 4. Reject opened packs (only sealed original packaging accepted)
    if (packaging !== 'sealed') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: Only sealed, untampered original packaging is accepted for donation. Opened packs cannot be accepted due to patient safety guidelines.'
      });
    }

    // 5. Prescription-only & cold-chain medicines check
    const isColdChain = (storage_condition === 'cold-chain' || medicine.storage_condition === 'cold-chain');
    const isPrescription = (medicine.requires_prescription === 1);

    if (isPrescription || isColdChain) {
      const allowedInstitutional = ['pharmacy', 'hospital', 'distributor'];
      const isVerifiedInstitution = allowedInstitutional.includes(donor.org_type) && donor.verified === 1;

      if (!isVerifiedInstitution) {
        return res.status(403).json({
          success: false,
          error: `Safety restriction: Prescription-only and cold-chain medications (${medicine.name}) may only be donated by verified institutional donors (hospitals, pharmacies, distributors) with verified storage compliance.`
        });
      }
    }

    // 6. Generate unique batch trail ID
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const trailId = `MED-TR-${Date.now().toString().slice(-4)}${randomHex}`;

    // 7. Calculate initial safety score
    const initialSafetyScore = calculateSafetyScore({
      packaging,
      expiry_date,
      storage_condition: isColdChain ? 'cold-chain' : 'normal',
      status: 'UNDER_REVIEW'
    }, donor);

    // 8. Insert donation
    const insertResult = db.run(
      `INSERT INTO donations (
        donor_id, medicine_id, batch_no, expiry_date, quantity, unit,
        packaging, storage_condition, image_url, status, safety_score, trail_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNDER_REVIEW', ?, ?)`,
      [
        donor.id,
        medicine.id,
        batch_no.trim(),
        expiry_date,
        parseInt(quantity, 10),
        unit,
        packaging,
        isColdChain ? 'cold-chain' : 'normal',
        imageUrl,
        initialSafetyScore,
        trailId
      ]
    );

    const donationId = insertResult.lastInsertRowid;

    // 9. Append to Audit Events
    db.run(
      `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'donation',
        donationId,
        'LISTED',
        donor.id,
        JSON.stringify({
          trail_id: trailId,
          medicine: medicine.name,
          batch_no,
          quantity,
          safety_score: initialSafetyScore
        })
      ]
    );

    // 10. Notify Verifiers about new item in queue
    const verifiers = db.all(`SELECT id FROM users WHERE role = 'verifier'`);
    for (const v of verifiers) {
      db.run(
        `INSERT INTO notifications (user_id, type, message) VALUES (?, 'VERIFICATION', ?)`,
        [v.id, `New donation under review: ${medicine.name} (Batch ${batch_no}) from ${donor.name}.`]
      );
    }

    // Fetch complete inserted record
    const createdDonation = db.get(
      `SELECT d.*, m.name as medicine_name, m.generic_name, m.category, m.requires_prescription,
              u.name as donor_name, u.org_type as donor_org_type
       FROM donations d
       JOIN medicines m ON d.medicine_id = m.id
       JOIN users u ON d.donor_id = u.id
       WHERE d.id = ?`,
      [donationId]
    );

    return res.status(201).json({
      success: true,
      message: 'Donation listing created successfully and submitted to the pharmacist verification queue.',
      donation: createdDonation
    });
  } catch (error) {
    console.error('Error creating donation:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected server error occurred while creating the donation.'
    });
  }
}

/**
 * Get all donations with filtering
 * GET /api/donations?status=APPROVED&category=Antibiotic&search=amox&min_safety_score=80
 */
function getDonations(req, res) {
  try {
    const { status, category, search, min_safety_score, storage_condition } = req.query;

    let sql = `
      SELECT d.*,
             m.name as medicine_name, m.generic_name, m.category, m.requires_prescription,
             u.name as donor_name, u.org_type as donor_org_type, u.address as donor_address,
             u.lat as donor_lat, u.lng as donor_lng,
             ROUND(julianday(d.expiry_date) - julianday('now')) as days_remaining
      FROM donations d
      JOIN medicines m ON d.medicine_id = m.id
      JOIN users u ON d.donor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND d.status = ?';
      params.push(status);
    } else {
      // Default: exclude expired and rejected for general browsing
      sql += ` AND d.status NOT IN ('EXPIRED', 'REJECTED')`;
    }

    if (category) {
      sql += ' AND m.category = ?';
      params.push(category);
    }

    if (storage_condition) {
      sql += ' AND d.storage_condition = ?';
      params.push(storage_condition);
    }

    if (min_safety_score) {
      sql += ' AND d.safety_score >= ?';
      params.push(Number(min_safety_score));
    }

    if (search && search.trim()) {
      sql += ' AND (m.name LIKE ? OR m.generic_name LIKE ? OR d.batch_no LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ' ORDER BY d.expiry_date ASC';

    const donations = db.all(sql, params);

    return res.json({
      success: true,
      count: donations.length,
      donations
    });
  } catch (error) {
    console.error('Error fetching donations:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve donations.' });
  }
}

/**
 * Get current donor's donations
 * GET /api/donations/my
 */
function getMyDonations(req, res) {
  try {
    const donorId = req.user.id;

    let donations = db.all(
      `SELECT d.*, 
              m.name as medicine_name, m.generic_name, m.category, m.requires_prescription,
              ROUND(julianday(d.expiry_date) - julianday('now')) as days_remaining,
              (SELECT COUNT(*) FROM requests r WHERE r.donation_id = d.id) as request_count,
              (SELECT decision FROM verifications v WHERE v.donation_id = d.id ORDER BY v.created_at DESC LIMIT 1) as verification_decision,
              (SELECT remarks FROM verifications v WHERE v.donation_id = d.id ORDER BY v.created_at DESC LIMIT 1) as verification_remarks
       FROM donations d
       JOIN medicines m ON d.medicine_id = m.id
       WHERE d.donor_id = ?
       ORDER BY d.created_at DESC`,
      [donorId]
    );

    if (donations.length === 0 && req.isGuest) {
      donations = db.all(
        `SELECT d.*, 
                m.name as medicine_name, m.generic_name, m.category, m.requires_prescription,
                ROUND(julianday(d.expiry_date) - julianday('now')) as days_remaining,
                (SELECT COUNT(*) FROM requests r WHERE r.donation_id = d.id) as request_count,
                (SELECT decision FROM verifications v WHERE v.donation_id = d.id ORDER BY v.created_at DESC LIMIT 1) as verification_decision,
                (SELECT remarks FROM verifications v WHERE v.donation_id = d.id ORDER BY v.created_at DESC LIMIT 1) as verification_remarks
         FROM donations d
         JOIN medicines m ON d.medicine_id = m.id
         ORDER BY d.created_at DESC`
      );
    }

    return res.json({
      success: true,
      count: donations.length,
      donations
    });
  } catch (error) {
    console.error('Error fetching user donations:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve your donations.' });
  }
}

/**
 * Get single donation details with verification and audit history
 * GET /api/donations/:id
 */
function getDonationById(req, res) {
  try {
    const donation = db.get(
      `SELECT d.*,
              m.name as medicine_name, m.generic_name, m.category, m.requires_prescription,
              u.name as donor_name, u.org_type as donor_org_type, u.address as donor_address,
              u.lat as donor_lat, u.lng as donor_lng, u.email as donor_email,
              ROUND(julianday(d.expiry_date) - julianday('now')) as days_remaining
       FROM donations d
       JOIN medicines m ON d.medicine_id = m.id
       JOIN users u ON d.donor_id = u.id
       WHERE d.id = ?`,
      [req.params.id]
    );

    if (!donation) {
      return res.status(404).json({ success: false, error: 'Donation listing not found.' });
    }

    // Fetch verification log if any
    const verifications = db.all(
      `SELECT v.*, u.name as verifier_name
       FROM verifications v
       JOIN users u ON v.verifier_id = u.id
       WHERE v.donation_id = ?
       ORDER BY v.created_at DESC`,
      [donation.id]
    );

    // Fetch audit timeline
    const auditEvents = db.all(
      `SELECT a.*, u.name as actor_name, u.role as actor_role
       FROM audit_events a
       LEFT JOIN users u ON a.actor_id = u.id
       WHERE a.entity_type = 'donation' AND a.entity_id = ?
       ORDER BY a.created_at ASC`,
      [donation.id]
    );

    return res.json({
      success: true,
      donation: {
        ...donation,
        verifications,
        audit_events: auditEvents
      }
    });
  } catch (error) {
    console.error('Error fetching donation by ID:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve donation details.' });
  }
}

module.exports = {
  createDonation,
  getDonations,
  getMyDonations,
  getDonationById
};
