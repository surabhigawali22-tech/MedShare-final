const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Pure state machine validation for MedShare donations:
 * LISTED -> UNDER_REVIEW -> APPROVED/REJECTED -> MATCHED -> HANDED_OVER -> COMPLETED
 */
class DonationStateMachine {
  static allowedTransitions = {
    'LISTED': ['UNDER_REVIEW', 'REJECTED', 'EXPIRED'],
    'UNDER_REVIEW': ['APPROVED', 'REJECTED', 'EXPIRED'],
    'APPROVED': ['MATCHED', 'EXPIRED'],
    'MATCHED': ['HANDED_OVER', 'APPROVED', 'EXPIRED'], // can revert to APPROVED if request cancelled
    'HANDED_OVER': ['COMPLETED'],
    'COMPLETED': [], // terminal state
    'REJECTED': [],  // terminal state
    'EXPIRED': []    // terminal state
  };

  static canTransition(current, next) {
    const validNextStates = this.allowedTransitions[current] || [];
    return validNextStates.includes(next);
  }

  static canBeRequested(status, daysRemaining) {
    return status === 'APPROVED' && daysRemaining > 0;
  }

  static canScanQR(status, isDesignatedRecipient) {
    return status === 'ACCEPTED' && isDesignatedRecipient;
  }
}

describe('Donation State Machine Rules', () => {
  test('follows standard lifecycle: LISTED -> UNDER_REVIEW -> APPROVED -> MATCHED -> HANDED_OVER -> COMPLETED', () => {
    assert.ok(DonationStateMachine.canTransition('LISTED', 'UNDER_REVIEW'));
    assert.ok(DonationStateMachine.canTransition('UNDER_REVIEW', 'APPROVED'));
    assert.ok(DonationStateMachine.canTransition('APPROVED', 'MATCHED'));
    assert.ok(DonationStateMachine.canTransition('MATCHED', 'HANDED_OVER'));
    assert.ok(DonationStateMachine.canTransition('HANDED_OVER', 'COMPLETED'));
  });

  test('prevents invalid transitions', () => {
    // Cannot jump directly from LISTED to COMPLETED
    assert.equal(DonationStateMachine.canTransition('LISTED', 'COMPLETED'), false);
    // Cannot request or transition from terminal states
    assert.equal(DonationStateMachine.canTransition('COMPLETED', 'MATCHED'), false);
    assert.equal(DonationStateMachine.canTransition('REJECTED', 'APPROVED'), false);
    assert.equal(DonationStateMachine.canTransition('EXPIRED', 'APPROVED'), false);
  });

  test('enforces that only APPROVED donations with positive shelf life can be requested', () => {
    assert.ok(DonationStateMachine.canBeRequested('APPROVED', 60));
    assert.equal(DonationStateMachine.canBeRequested('UNDER_REVIEW', 60), false);
    assert.equal(DonationStateMachine.canBeRequested('APPROVED', 0), false);
    assert.equal(DonationStateMachine.canBeRequested('EXPIRED', -5), false);
  });

  test('prevents double-claiming: completed requests cannot be scanned again', () => {
    assert.ok(DonationStateMachine.canScanQR('ACCEPTED', true));
    assert.equal(DonationStateMachine.canScanQR('COMPLETED', true), false);
    assert.equal(DonationStateMachine.canScanQR('ACCEPTED', false), false);
  });
});
