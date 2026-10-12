const db = require('../db/db');

/**
 * Calculate Safety Score (0-100) for a donation
 * Components:
 * - Remaining Shelf Life (max 35 pts)
 * - Sealed Packaging (max 30 pts)
 * - Storage Condition & Integrity (max 20 pts)
 * - Donor Historical Rejection Rate & Reliability (max 15 pts)
 * 
 * @param {Object} donation
 * @param {Object} [donor]
 * @returns {number} Score clamped between 0 and 100 rounded to 1 decimal
 */
function calculateSafetyScore(donation, donor = null) {
  // If expired or opened, safety score drops drastically
  if (donation.packaging === 'opened') return 20.0;

  const now = new Date();
  const expiry = new Date(donation.expiry_date);
  const diffTime = expiry - now;
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) return 0.0;

  // 1. Shelf-life component (max 35)
  let shelfScore = 0;
  if (daysLeft >= 180) {
    shelfScore = 35;
  } else if (daysLeft >= 90) {
    shelfScore = 25 + Math.round(((daysLeft - 90) / 90) * 10);
  } else {
    shelfScore = Math.max(5, Math.round((daysLeft / 90) * 20));
  }

  // 2. Packaging component (max 30)
  const packagingScore = donation.packaging === 'sealed' ? 30 : 0;

  // 3. Storage condition component (max 20)
  let storageScore = 20;
  if (donation.storage_condition === 'cold-chain') {
    // Cold chain requires verified institutional donor
    const isInstitutional = donor && ['hospital', 'pharmacy', 'distributor'].includes(donor.org_type) && donor.verified;
    storageScore = isInstitutional ? 20 : 8;
  }

  // 4. Donor reliability component (max 15)
  let donorReliabilityScore = 12; // default for new donors
  if (donor && donor.id) {
    const stats = db.get(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
         SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
       FROM donations WHERE donor_id = ?`,
      [donor.id]
    );

    if (stats && stats.total > 0) {
      const rejectRate = stats.rejected / stats.total;
      donorReliabilityScore = Math.round(15 * (1 - rejectRate));
    }
  }

  // Verification status bonus (+5 bonus for pharmacist approved)
  let verificationBonus = 0;
  if (donation.status === 'APPROVED' || donation.status === 'COMPLETED' || donation.status === 'MATCHED') {
    verificationBonus = 5;
  }

  const total = Math.min(100, Math.max(0, shelfScore + packagingScore + storageScore + donorReliabilityScore + verificationBonus));
  return Number(total.toFixed(1));
}

module.exports = {
  calculateSafetyScore
};
