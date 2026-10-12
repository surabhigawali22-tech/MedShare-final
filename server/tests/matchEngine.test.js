const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  haversineDistance,
  calculateUsabilityScore,
  calculateProximityScore,
  calculateUrgencyScore,
  calculateTrustScore,
  computeMatchScore
} = require('../src/utils/matchEngine');

describe('Shelf-Life Match Engine Scoring', () => {
  test('calculates haversine distance correctly between Mumbai landmarks', () => {
    // Dadar (19.0178, 72.8478) to Bandra (19.0558, 72.8315) is ~4.5 to 5.5 km
    const dist = haversineDistance(19.0178, 72.8478, 19.0558, 72.8315);
    assert.ok(dist > 3.0 && dist < 7.0, `Expected ~4.5-5.5km, got ${dist}`);
  });

  test('usability score: calculates score when quantity can be safely used before expiry', () => {
    // Quantity 30, daily demand 2 units/day => 15 days needed
    // 60 days remaining: usability = 100 * (60 - 15) / 60 = 75.0
    const res = calculateUsabilityScore(30, 60, 2);
    assert.equal(res.score, 75.0);
    assert.equal(res.flag, 'safe_usage_window');
  });

  test('usability score: flags "likely_to_expire_unused" and scores 0 when expectedUseDays > daysLeft', () => {
    // Quantity 100, daily demand 1 unit/day => 100 days needed
    // Only 30 days left: impossible to use before expiry
    const res = calculateUsabilityScore(100, 30, 1);
    assert.equal(res.score, 0);
    assert.equal(res.flag, 'likely_to_expire_unused');
  });

  test('proximity score: 100 at 0km, decreasing linearly to 0 at MAX_RADIUS_KM (50km)', () => {
    assert.equal(calculateProximityScore(0, 50), 100);
    assert.equal(calculateProximityScore(25, 50), 50);
    assert.equal(calculateProximityScore(50, 50), 0);
    assert.equal(calculateProximityScore(60, 50), 0);
  });

  test('urgency score: 100 if open urgent need exists, else 0', () => {
    assert.equal(calculateUrgencyScore(true), 100);
    assert.equal(calculateUrgencyScore(false), 0);
  });

  test('trust score: verified recipient with 100% completion scores maximum 100', () => {
    const verifiedRecipient = { verified: 1 };
    assert.equal(calculateTrustScore(verifiedRecipient, 1.0), 100);

    const unverifiedRecipient = { verified: 0 };
    assert.equal(calculateTrustScore(unverifiedRecipient, 0.5), 45);
  });

  test('overall formula: 0.45*usability + 0.30*proximity + 0.15*urgency + 0.10*trust', () => {
    const match = computeMatchScore({
      quantity: 50,
      daysLeft: 100,
      avgDailyDemand: 2.0, // 25 days needed => usability = 75.0
      distanceKm: 10, // proximity = 100 * (1 - 10/50) = 80.0
      maxRadiusKm: 50,
      hasUrgentNeed: true, // urgency = 100.0
      recipient: { verified: 1 },
      completedRate: 1.0 // trust = 100.0
    });

    // 0.45*75 + 0.30*80 + 0.15*100 + 0.10*100 = 33.75 + 24 + 15 + 10 = 82.75 => 82.8
    assert.ok(match.totalScore >= 82.5 && match.totalScore <= 83.0);
    assert.ok(match.breakdown.usability);
    assert.ok(match.breakdown.proximity);
    assert.ok(match.breakdown.urgency);
    assert.ok(match.breakdown.trust);
  });
});
