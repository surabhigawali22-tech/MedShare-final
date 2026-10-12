const db = require('../db/db');

/**
 * Calculate distance in km between two lat/lng points using Haversine formula
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return 25.0; // default estimated distance if coords unavailable
  }

  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Clamp a number between min and max
 */
function clamp(val, min = 0, max = 100) {
  return Math.max(min, Math.min(max, val));
}

/**
 * 1. Usability Score (0-100)
 * probability recipient can use quantity before expiry
 * daysLeft = expiry_date - today
 * expectedUseDays = quantity / recipient_avg_daily_demand_for_that_medicine
 * usabilityScore = clamp(100 * (daysLeft - expectedUseDays) / daysLeft, 0, 100)
 * If expectedUseDays > daysLeft => likely to expire unused => 0
 */
function calculateUsabilityScore(quantity, daysLeft, avgDailyDemand) {
  if (daysLeft <= 0) {
    return { score: 0, flag: 'expired', expectedUseDays: 0 };
  }

  const effectiveDemand = Math.max(0.1, avgDailyDemand || 5.0);
  const expectedUseDays = Math.ceil(quantity / effectiveDemand);

  if (expectedUseDays > daysLeft) {
    return {
      score: 0,
      flag: 'likely_to_expire_unused',
      expectedUseDays,
      daysLeft
    };
  }

  const rawScore = 100 * (daysLeft - expectedUseDays) / daysLeft;
  return {
    score: Number(clamp(rawScore).toFixed(1)),
    flag: 'safe_usage_window',
    expectedUseDays,
    daysLeft
  };
}

/**
 * 2. Proximity Score (0-100)
 * 100 at 0km, decreasing linearly to 0 at MAX_RADIUS_KM
 */
function calculateProximityScore(distanceKm, maxRadiusKm = 50) {
  if (distanceKm == null || distanceKm > maxRadiusKm) return 0;
  const score = 100 * (1 - distanceKm / maxRadiusKm);
  return Number(clamp(score).toFixed(1));
}

/**
 * 3. Urgency Score (0 or 100)
 * 100 if recipient has open urgent need for this medicine, else 0
 */
function calculateUrgencyScore(hasUrgentNeed) {
  return hasUrgentNeed ? 100 : 0;
}

/**
 * 4. Trust Score (0-100)
 * based on verified status and completed request rate
 */
function calculateTrustScore(recipient, completedRate = 1.0) {
  const verifiedComponent = recipient.verified ? 50 : 20;
  const reliabilityComponent = clamp(completedRate * 50, 0, 50);
  return Number((verifiedComponent + reliabilityComponent).toFixed(1));
}

/**
 * Master Match Score Formula:
 * score = 0.45 * usabilityScore + 0.30 * proximityScore + 0.15 * urgencyScore + 0.10 * trustScore
 */
function computeMatchScore({
  quantity,
  daysLeft,
  avgDailyDemand,
  distanceKm,
  maxRadiusKm = 50,
  hasUrgentNeed = false,
  recipient,
  completedRate = 1.0
}) {
  const usability = calculateUsabilityScore(quantity, daysLeft, avgDailyDemand);
  const proximity = calculateProximityScore(distanceKm, maxRadiusKm);
  const urgency = calculateUrgencyScore(hasUrgentNeed);
  const trust = calculateTrustScore(recipient, completedRate);

  const total =
    0.45 * usability.score +
    0.30 * proximity +
    0.15 * urgency +
    0.10 * trust;

  return {
    totalScore: Number(clamp(total).toFixed(1)),
    breakdown: {
      usability: { score: usability.score, weight: 0.45, contribution: Number((0.45 * usability.score).toFixed(1)), ...usability },
      proximity: { score: proximity, weight: 0.30, contribution: Number((0.30 * proximity).toFixed(1)), distanceKm, maxRadiusKm },
      urgency: { score: urgency, weight: 0.15, contribution: Number((0.15 * urgency).toFixed(1)), hasUrgentNeed },
      trust: { score: trust, weight: 0.10, contribution: Number((0.10 * trust).toFixed(1)), verified: Boolean(recipient.verified), completedRate }
    }
  };
}

/**
 * Rank all valid recipients for a given donation
 */
function rankRecipientsForDonation(donationId) {
  const donation = db.get(
    `SELECT d.*, m.name as medicine_name, u.lat as donor_lat, u.lng as donor_lng,
            ROUND(julianday(d.expiry_date) - julianday('now')) as days_remaining
     FROM donations d
     JOIN medicines m ON d.medicine_id = m.id
     JOIN users u ON d.donor_id = u.id
     WHERE d.id = ?`,
    [donationId]
  );

  if (!donation) return null;

  // Fetch max radius setting
  const maxRadiusSetting = db.get("SELECT value FROM settings WHERE key = 'MAX_RADIUS_KM'");
  const maxRadiusKm = maxRadiusSetting ? Number(maxRadiusSetting.value) : 50;

  // Fetch all recipients
  const recipients = db.all(
    `SELECT u.id, u.name, u.email, u.phone, u.org_type, u.address, u.lat, u.lng, u.verified
     FROM users u
     WHERE u.role = 'recipient' AND (u.org_type = 'individual' OR u.verified = 1)`
  );

  const ranked = [];

  for (const r of recipients) {
    // 1. Check distance
    const dist = haversineDistance(donation.donor_lat, donation.donor_lng, r.lat, r.lng);

    // 2. Check open urgent need for this medicine
    const urgentNeed = db.get(
      `SELECT * FROM urgent_needs WHERE recipient_id = ? AND medicine_id = ? AND status = 'OPEN'`,
      [r.id, donation.medicine_id]
    );

    // 3. Compute recipient completed request rate and daily demand
    const requestStats = db.get(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'COMPLETED' THEN quantity ELSE 0 END) as total_qty
       FROM requests WHERE recipient_id = ?`,
      [r.id]
    );

    const completedRate = requestStats && requestStats.total > 0
      ? (requestStats.completed / requestStats.total)
      : 1.0;

    // Derived daily demand (default 5 if no history, or derived from average over past 30 days)
    const avgDailyDemand = requestStats && requestStats.total_qty > 0
      ? Math.max(1, Number((requestStats.total_qty / 30).toFixed(1)))
      : (r.org_type === 'ngo' ? 10 : r.org_type === 'clinic' ? 8 : 2);

    const match = computeMatchScore({
      quantity: donation.quantity,
      daysLeft: Number(donation.days_remaining),
      avgDailyDemand,
      distanceKm: dist,
      maxRadiusKm,
      hasUrgentNeed: Boolean(urgentNeed),
      recipient: r,
      completedRate
    });

    ranked.push({
      recipient: r,
      distance_km: dist,
      urgent_need: urgentNeed || null,
      avg_daily_demand: avgDailyDemand,
      ...match
    });
  }

  // Sort by highest totalScore first
  ranked.sort((a, b) => b.totalScore - a.totalScore);

  return {
    donation,
    bestMatch: ranked.length > 0 ? ranked[0] : null,
    matches: ranked
  };
}

module.exports = {
  haversineDistance,
  clamp,
  calculateUsabilityScore,
  calculateProximityScore,
  calculateUrgencyScore,
  calculateTrustScore,
  computeMatchScore,
  rankRecipientsForDonation
};
