const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

function validateDonationDates(expiryDateStr, minShelfLifeDays = 90) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(expiryDateStr);
  expiryDate.setHours(0, 0, 0, 0);

  if (isNaN(expiryDate.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  if (expiryDate <= today) {
    return { valid: false, error: 'Expiry date cannot be in the past' };
  }

  const diffTime = expiryDate - today;
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < minShelfLifeDays) {
    return {
      valid: false,
      daysRemaining,
      error: `Shelf life (${daysRemaining} days) is below minimum of ${minShelfLifeDays} days`
    };
  }

  return { valid: true, daysRemaining };
}

describe('Expiry Validation Rules', () => {
  test('rejects past expiry dates', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const result = validateDonationDates(dateStr, 90);
    assert.equal(result.valid, false);
    assert.match(result.error, /past/i);
  });

  test('rejects donations below MIN_SHELF_LIFE_DAYS (e.g. 45 days remaining)', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 45);
    const dateStr = soon.toISOString().split('T')[0];

    const result = validateDonationDates(dateStr, 90);
    assert.equal(result.valid, false);
    assert.match(result.error, /below minimum/i);
  });

  test('accepts donations meeting or exceeding 90 days shelf life', () => {
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 120);
    const dateStr = validDate.toISOString().split('T')[0];

    const result = validateDonationDates(dateStr, 90);
    assert.equal(result.valid, true);
    assert.ok(result.daysRemaining >= 90);
  });

  test('respects custom admin configured shelf life days threshold (e.g. 60 days)', () => {
    const date = new Date();
    date.setDate(date.getDate() + 75);
    const dateStr = date.toISOString().split('T')[0];

    const result = validateDonationDates(dateStr, 60);
    assert.equal(result.valid, true);
  });
});
