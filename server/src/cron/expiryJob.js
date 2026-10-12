const cron = require('node-cron');
const db = require('../db/db');

/**
 * Execute Expiry Scan across all donations and personal medicine cabinets
 */
function runExpiryScan() {
  console.log('[Expiry Engine] Starting daily automated expiry scan...');

  let expiredDonationsCount = 0;
  let expiredCabinetCount = 0;
  let alertsSentCount = 0;

  try {
    // 1. Process Donations that have reached or passed expiry date
    const expiredDonations = db.all(
      `SELECT d.id, d.donor_id, d.batch_no, d.expiry_date, m.name as medicine_name
       FROM donations d
       JOIN medicines m ON d.medicine_id = m.id
       WHERE d.status NOT IN ('EXPIRED', 'COMPLETED', 'REJECTED')
         AND date(d.expiry_date) <= date('now')`
    );

    for (const d of expiredDonations) {
      db.transaction(() => {
        // Mark donation EXPIRED
        db.run(`UPDATE donations SET status = 'EXPIRED', safety_score = 0 WHERE id = ?`, [d.id]);

        // Move to Disposal Queue
        db.run(
          `INSERT INTO disposal_records (source_type, source_id, reason, method, disposed_at)
           VALUES ('donation', ?, 'System auto-flag: Reached expiry date', 'pending_safe_disposal', CURRENT_TIMESTAMP)`,
          [d.id]
        );

        // Audit Event
        db.run(
          `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json)
           VALUES ('donation', ?, 'AUTO_EXPIRED', NULL, ?)`,
          [d.id, JSON.stringify({ batch_no: d.batch_no, medicine: d.medicine_name, moved_to: 'disposal_queue' })]
        );

        // Notify Donor
        db.run(
          `INSERT INTO notifications (user_id, type, message)
           VALUES (?, 'EXPIRY_ALERT', ?)`,
          [d.donor_id, `Expiry Notice: Your donation of ${d.medicine_name} (Batch ${d.batch_no}) has reached its expiration date and was transferred to the Disposal Queue.`]
        );
      })();
      expiredDonationsCount++;
    }

    // 2. Process Cabinet Items that have passed expiry date
    const expiredCabinets = db.all(
      `SELECT i.id, i.owner_id, i.medicine_name, i.expiry_date
       FROM inventory i
       WHERE date(i.expiry_date) <= date('now')
         AND i.id NOT IN (SELECT source_id FROM disposal_records WHERE source_type = 'inventory')`
    );

    for (const item of expiredCabinets) {
      db.transaction(() => {
        db.run(
          `INSERT INTO disposal_records (source_type, source_id, reason, method, disposed_at)
           VALUES ('inventory', ?, 'Cabinet item expired', 'pending_safe_disposal', CURRENT_TIMESTAMP)`,
          [item.id]
        );

        db.run(
          `INSERT INTO notifications (user_id, type, message)
           VALUES (?, 'EXPIRY_ALERT', ?)`,
          [item.owner_id, `Cabinet Alert: "${item.medicine_name}" in your medicine cabinet has expired. Please check the Safe Disposal guide.`]
        );
      })();
      expiredCabinetCount++;
    }

    // 3. Proactive Expiry Alerts at 90, 30, and 7 days
    const thresholds = [90, 30, 7];

    for (const days of thresholds) {
      // Cabinet items expiring near threshold (within +/- 1 day to catch all daily runs)
      const cabinetCandidates = db.all(
        `SELECT i.id, i.owner_id, i.medicine_name,
                ROUND(julianday(i.expiry_date) - julianday('now')) as days_left
         FROM inventory i
         WHERE date(i.expiry_date) > date('now')
           AND ROUND(julianday(i.expiry_date) - julianday('now')) BETWEEN ? AND ?`,
        [days - 1, days + 1]
      );

      for (const item of cabinetCandidates) {
        // Prevent duplicate notification in same threshold category
        const alertType = `EXPIRY_${days}`;
        const existing = db.get(
          `SELECT id FROM notifications
           WHERE user_id = ? AND type = ? AND message LIKE ? AND created_at >= date('now', '-3 days')`,
          [item.owner_id, alertType, `%${item.medicine_name}%`]
        );

        if (!existing) {
          const actionTip = days <= 30
            ? 'Consider donating to a charitable clinic soon or prepare for disposal.'
            : 'You have plenty of time to donate this before it expires!';

          db.run(
            `INSERT INTO notifications (user_id, type, message)
             VALUES (?, ?, ?)`,
            [
              item.owner_id,
              alertType,
              `Cabinet Notice: "${item.medicine_name}" expires in ~${days} days. ${actionTip}`
            ]
          );
          alertsSentCount++;
        }
      }

      // Donations expiring near threshold
      const donationCandidates = db.all(
        `SELECT d.id, d.donor_id, d.batch_no, m.name as medicine_name,
                ROUND(julianday(d.expiry_date) - julianday('now')) as days_left
         FROM donations d
         JOIN medicines m ON d.medicine_id = m.id
         WHERE d.status = 'APPROVED'
           AND ROUND(julianday(d.expiry_date) - julianday('now')) BETWEEN ? AND ?`,
        [days - 1, days + 1]
      );

      for (const don of donationCandidates) {
        const alertType = `DONATION_EXPIRY_${days}`;
        const existing = db.get(
          `SELECT id FROM notifications
           WHERE user_id = ? AND type = ? AND message LIKE ? AND created_at >= date('now', '-3 days')`,
          [don.donor_id, alertType, `%${don.batch_no}%`]
        );

        if (!existing) {
          db.run(
            `INSERT INTO notifications (user_id, type, message)
             VALUES (?, ?, ?)`,
            [
              don.donor_id,
              alertType,
              `Donation Alert: Listed medicine ${don.medicine_name} (Batch ${don.batch_no}) expires in ~${days} days. Redistribution urgency escalated.`
            ]
          );
          alertsSentCount++;
        }
      }
    }

    console.log(`[Expiry Engine] Scan complete: ${expiredDonationsCount} donations expired, ${expiredCabinetCount} cabinet items expired, ${alertsSentCount} advance alerts sent.`);
    return {
      success: true,
      expiredDonationsCount,
      expiredCabinetCount,
      alertsSentCount
    };
  } catch (err) {
    console.error('[Expiry Engine] Scan error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Initialize daily cron job (runs every midnight 00:05 AM)
 */
function startExpiryCron() {
  // Runs every day at 00:05
  cron.schedule('5 0 * * *', () => {
    console.log('[Cron] Running scheduled midnight expiry scan...');
    runExpiryScan();
  });
  console.log('[Cron] Expiry management daily scheduler registered (00:05 AM)');
}

module.exports = {
  runExpiryScan,
  startExpiryCron
};
