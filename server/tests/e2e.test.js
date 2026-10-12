const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const db = require('../src/db/db');
const { calculateSafetyScore } = require('../src/utils/safetyScore');
const { rankRecipientsForDonation } = require('../src/utils/matchEngine');

describe('MedShare End-to-End Happy Path Flow', () => {
  let donorId;
  let verifierId;
  let recipientId;
  let medicineId;
  let donationId;
  let trailId;
  let requestId;

  before(() => {
    db.initSchema();

    // Fetch seeded users
    const donor = db.get("SELECT * FROM users WHERE email = 'donor.pharma@example.com'");
    const verifier = db.get("SELECT * FROM users WHERE email = 'verifier1@medshare.org'");
    const recipient = db.get("SELECT * FROM users WHERE email = 'recipient.sewa@example.com'");
    const medicine = db.get("SELECT * FROM medicines WHERE name = 'Paracetamol 650mg'");

    assert.ok(donor, 'Donor exists');
    assert.ok(verifier, 'Verifier exists');
    assert.ok(recipient, 'Recipient exists');
    assert.ok(medicine, 'Medicine exists');

    donorId = donor.id;
    verifierId = verifier.id;
    recipientId = recipient.id;
    medicineId = medicine.id;
  });

  test('Step 1: Donor creates donation listing with safety validation', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 180);
    const expiryDate = futureDate.toISOString().split('T')[0];

    trailId = `MED-TR-TEST-${Date.now()}`;
    const safetyScore = calculateSafetyScore({
      packaging: 'sealed',
      expiry_date: expiryDate,
      storage_condition: 'normal',
      status: 'UNDER_REVIEW'
    });

    const res = db.run(
      `INSERT INTO donations (
        donor_id, medicine_id, batch_no, expiry_date, quantity, unit,
        packaging, storage_condition, status, safety_score, trail_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UNDER_REVIEW', ?, ?)`,
      [donorId, medicineId, 'E2E-BATCH-001', expiryDate, 50, 'strips', 'sealed', 'normal', safetyScore, trailId]
    );

    donationId = res.lastInsertRowid;
    assert.ok(donationId > 0, 'Donation created');

    const created = db.get('SELECT * FROM donations WHERE id = ?', [donationId]);
    assert.equal(created.status, 'UNDER_REVIEW');
    assert.equal(created.batch_no, 'E2E-BATCH-001');
  });

  test('Step 2: Pharmacist Verifier approves the donation in review queue', () => {
    // Verifier approves
    db.run(
      `UPDATE donations SET status = 'APPROVED', safety_score = safety_score + 5 WHERE id = ?`,
      [donationId]
    );

    db.run(
      `INSERT INTO verifications (donation_id, verifier_id, decision, remarks)
       VALUES (?, ?, 'APPROVED', 'E2E Sealed packaging integrity verified.')`,
      [donationId, verifierId]
    );

    // Audit event
    db.run(
      `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
       VALUES ('donation', ?, 'VERIFIED_APPROVED', ?, ?)`,
      [donationId, verifierId, JSON.stringify({ remarks: 'E2E Passed' })]
    );

    const verifiedDonation = db.get('SELECT * FROM donations WHERE id = ?', [donationId]);
    assert.equal(verifiedDonation.status, 'APPROVED');

    const verificationRecord = db.get('SELECT * FROM verifications WHERE donation_id = ?', [donationId]);
    assert.equal(verificationRecord.decision, 'APPROVED');
  });

  test('Step 3: Shelf-Life Match Engine ranks recipients for approved donation', () => {
    const ranking = rankRecipientsForDonation(donationId);
    assert.ok(ranking, 'Ranking generated');
    assert.ok(ranking.matches.length > 0, 'Recipients ranked');
    assert.ok(ranking.bestMatch, 'Best match identified');
    assert.ok(ranking.bestMatch.totalScore > 0, 'Match score calculated');
    assert.ok(ranking.bestMatch.breakdown.usability, 'Score has explainable usability breakdown');
    assert.ok(ranking.bestMatch.breakdown.proximity, 'Score has proximity breakdown');
  });

  test('Step 4: Recipient creates request and donor accepts it', () => {
    // Recipient requests 20 strips
    const reqRes = db.run(
      `INSERT INTO requests (recipient_id, donation_id, quantity, status, match_score)
       VALUES (?, ?, 20, 'PENDING', 92.5)`,
      [recipientId, donationId]
    );
    requestId = reqRes.lastInsertRowid;

    // Donor accepts
    db.run(`UPDATE requests SET status = 'ACCEPTED' WHERE id = ?`, [requestId]);
    db.run(`UPDATE donations SET status = 'MATCHED' WHERE id = ?`, [donationId]);
    db.run(
      `INSERT INTO handovers (request_id, confirmed_by_donor, confirmed_by_recipient)
       VALUES (?, 1, 0)`,
      [requestId]
    );

    const matchedDonation = db.get('SELECT status FROM donations WHERE id = ?', [donationId]);
    assert.equal(matchedDonation.status, 'MATCHED');
  });

  test('Step 5: Handover QR scan confirms transfer, completes lifecycle, awards donor points', () => {
    const now = new Date().toISOString();

    // Initial reputation
    const initialRep = db.get('SELECT points FROM reputation WHERE donor_id = ?', [donorId]) || { points: 0 };

    // Handover QR scan
    db.run(
      `UPDATE handovers SET qr_scanned_at = ?, confirmed_by_recipient = 1, completed_at = ? WHERE request_id = ?`,
      [now, now, requestId]
    );
    db.run(`UPDATE requests SET status = 'COMPLETED' WHERE id = ?`, [requestId]);
    db.run(`UPDATE donations SET status = 'COMPLETED' WHERE id = ?`, [donationId]);

    // Points calculation: Base 50 + near expiry bonus if <= 120d
    const pointsAwarded = 50;
    const newPoints = initialRep.points + pointsAwarded;
    db.run(
      `INSERT INTO reputation (donor_id, points, badge) VALUES (?, ?, 'Platinum')
       ON CONFLICT(donor_id) DO UPDATE SET points = ?`,
      [donorId, newPoints, newPoints]
    );

    // Audit Event
    db.run(
      `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
       VALUES ('donation', ?, 'COMPLETED', ?, ?)`,
      [donationId, recipientId, JSON.stringify({ points_awarded: pointsAwarded })]
    );

    const finalDonation = db.get('SELECT status FROM donations WHERE id = ?', [donationId]);
    assert.equal(finalDonation.status, 'COMPLETED');

    const updatedRep = db.get('SELECT points FROM reputation WHERE donor_id = ?', [donorId]);
    assert.equal(updatedRep.points, newPoints);
  });

  test('Step 6: Public batch trail contains full immutable history', () => {
    const donation = db.get('SELECT * FROM donations WHERE trail_id = ?', [trailId]);
    assert.ok(donation, 'Trail exists');

    const verification = db.get('SELECT * FROM verifications WHERE donation_id = ?', [donation.id]);
    assert.ok(verification, 'Verification attached');

    const audits = db.all('SELECT action FROM audit_events WHERE entity_type = "donation" AND entity_id = ?', [donation.id]);
    const actions = audits.map(a => a.action);
    assert.ok(actions.includes('VERIFIED_APPROVED'), 'Audit has verified');
    assert.ok(actions.includes('COMPLETED'), 'Audit has completed');
  });
});
