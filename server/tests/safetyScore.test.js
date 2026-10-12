const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calculateSafetyScore } = require('../src/utils/safetyScore');

function futureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function pastDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

describe('Safety Score Calculation (0-100)', () => {
  test('returns 0 for expired medicines', () => {
    const expiredDonation = {
      packaging: 'sealed',
      expiry_date: pastDate(2),
      storage_condition: 'normal',
      status: 'EXPIRED'
    };
    const score = calculateSafetyScore(expiredDonation);
    assert.equal(score, 0);
  });

  test('penalizes opened packaging drastically', () => {
    const openedDonation = {
      packaging: 'opened',
      expiry_date: futureDate(180),
      storage_condition: 'normal',
      status: 'LISTED'
    };
    const score = calculateSafetyScore(openedDonation);
    assert.equal(score, 20.0);
  });

  test('sealed long-shelf-life donation from reliable donor receives high safety score (>=85)', () => {
    const safeDonation = {
      packaging: 'sealed',
      expiry_date: futureDate(240),
      storage_condition: 'normal',
      status: 'APPROVED'
    };
    const score = calculateSafetyScore(safeDonation, { id: 1, org_type: 'pharmacy', verified: 1 });
    assert.ok(score >= 85, `Expected >= 85, got ${score}`);
  });

  test('rewards pharmacist-verified approval status with +5 bonus', () => {
    const unverified = {
      packaging: 'sealed',
      expiry_date: futureDate(120),
      storage_condition: 'normal',
      status: 'UNDER_REVIEW'
    };
    const approved = {
      ...unverified,
      status: 'APPROVED'
    };

    const scoreUnverified = calculateSafetyScore(unverified);
    const scoreApproved = calculateSafetyScore(approved);
    assert.equal(Number((scoreApproved - scoreUnverified).toFixed(1)), 5);
  });
});
