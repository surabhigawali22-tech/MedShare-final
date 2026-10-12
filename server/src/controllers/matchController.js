const { rankRecipientsForDonation } = require('../utils/matchEngine');

/**
 * GET /api/donations/:id/matches
 * Expose ranked recipients with explainable score breakdown
 */
function getMatches(req, res) {
  try {
    const donationId = parseInt(req.params.id, 10);
    const result = rankRecipientsForDonation(donationId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Donation listing not found.'
      });
    }

    return res.json({
      success: true,
      donation: {
        id: result.donation.id,
        medicine_name: result.donation.medicine_name,
        batch_no: result.donation.batch_no,
        quantity: result.donation.quantity,
        unit: result.donation.unit,
        expiry_date: result.donation.expiry_date,
        days_remaining: result.donation.days_remaining,
        safety_score: result.donation.safety_score,
        status: result.donation.status
      },
      bestMatch: result.bestMatch,
      matches: result.matches
    });
  } catch (error) {
    console.error('Error computing donation matches:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to compute recipient matches.'
    });
  }
}

module.exports = {
  getMatches
};
