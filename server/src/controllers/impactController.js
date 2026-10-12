const db = require('../db/db');

/**
 * Get personal or global impact metrics
 * GET /api/impact/me
 */
function getPersonalImpact(req, res) {
  try {
    const userId = req.user.id;

    // Donor completed stats
    const stats = db.get(
      `SELECT 
         COUNT(*) as total_donations,
         SUM(CASE WHEN d.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_donations,
         SUM(CASE WHEN d.status = 'COMPLETED' THEN d.quantity ELSE 0 END) as total_units_donated,
         COUNT(DISTINCT CASE WHEN d.status = 'COMPLETED' THEN r.recipient_id ELSE NULL END) as recipients_helped
       FROM donations d
       LEFT JOIN requests r ON r.donation_id = d.id AND r.status = 'COMPLETED'
       WHERE d.donor_id = ?`,
      [userId]
    );

    // Reputation row
    const rep = db.get('SELECT points, badge FROM reputation WHERE donor_id = ?', [userId]) || { points: 0, badge: 'Bronze' };

    if ((!stats || stats.total_donations === 0) && req.isGuest) {
      const agg = db.get(
        `SELECT 
           COUNT(*) as total_donations,
           SUM(CASE WHEN d.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_donations,
           SUM(CASE WHEN d.status = 'COMPLETED' THEN d.quantity ELSE 0 END) as total_units_donated,
           COUNT(DISTINCT CASE WHEN d.status = 'COMPLETED' THEN r.recipient_id ELSE NULL END) as recipients_helped
         FROM donations d
         LEFT JOIN requests r ON r.donation_id = d.id AND r.status = 'COMPLETED'`
      );
      if (agg) {
        stats.total_donations = agg.total_donations || 0;
        stats.completed_donations = agg.completed_donations || 0;
        stats.total_units_donated = agg.total_units_donated || 0;
        stats.recipients_helped = agg.recipients_helped || 0;
      }
    }

    // Waste avoided calculation: roughly 0.05 kg of pharmaceutical waste per strip/unit
    const units = stats.total_units_donated || 0;
    const wasteAvoidedKg = Number((units * 0.045).toFixed(2));
    // Estimated economic value saved (avg ₹120 or $2 per unit)
    const estimatedValueInr = units * 85;

    return res.json({
      success: true,
      impact: {
        total_donations: stats.total_donations || 0,
        completed_donations: stats.completed_donations || 0,
        total_units_donated: units,
        recipients_helped: stats.recipients_helped || 0,
        waste_avoided_kg: wasteAvoidedKg,
        estimated_value_inr: estimatedValueInr,
        reputation_points: rep.points,
        badge: rep.badge
      }
    });
  } catch (error) {
    console.error('Error fetching personal impact:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve impact stats.' });
  }
}

/**
 * Public donor leaderboard
 * GET /api/impact/leaderboard
 */
function getLeaderboard(req, res) {
  try {
    const leaderboard = db.all(
      `SELECT u.id, u.name, u.org_type, r.points, r.badge,
              (SELECT COUNT(*) FROM donations d WHERE d.donor_id = u.id AND d.status = 'COMPLETED') as completed_count,
              (SELECT SUM(quantity) FROM donations d WHERE d.donor_id = u.id AND d.status = 'COMPLETED') as units_rescued
       FROM reputation r
       JOIN users u ON r.donor_id = u.id
       ORDER BY r.points DESC
       LIMIT 20`
    );

    // Platform-wide aggregate stats
    const aggregates = db.get(
      `SELECT 
         COUNT(*) as total_donations_platform,
         SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as total_completed,
         SUM(CASE WHEN status = 'COMPLETED' THEN quantity ELSE 0 END) as total_units_rescued,
         (SELECT COUNT(*) FROM users WHERE role = 'donor') as total_donors,
         (SELECT COUNT(*) FROM users WHERE role = 'recipient') as total_recipients
       FROM donations`
    );

    const totalUnits = aggregates.total_units_rescued || 0;

    return res.json({
      success: true,
      platform_totals: {
        total_donations: aggregates.total_donations_platform,
        total_completed: aggregates.total_completed,
        total_units_rescued: totalUnits,
        total_waste_avoided_kg: Number((totalUnits * 0.045).toFixed(1)),
        total_value_saved_inr: totalUnits * 85,
        total_donors: aggregates.total_donors,
        total_recipients: aggregates.total_recipients
      },
      leaderboard
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve leaderboard.' });
  }
}

module.exports = {
  getPersonalImpact,
  getLeaderboard
};
