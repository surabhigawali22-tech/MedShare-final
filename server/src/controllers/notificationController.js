const db = require('../db/db');

/**
 * Get current user notifications
 * GET /api/notifications
 */
function getNotifications(req, res) {
  try {
    const userId = req.user.id;

    let notifications = db.all(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    if (notifications.length === 0 && req.isGuest) {
      notifications = db.all(
        `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20`
      );
    }

    const unreadCount = db.get(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0`,
      [userId]
    )?.count || (req.isGuest ? notifications.length : 0);

    return res.json({
      success: true,
      unreadCount,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve notifications.' });
  }
}

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
function markAsRead(req, res) {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id, 10);

    db.run(
      `UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ success: false, error: 'Failed to update notification.' });
  }
}

/**
 * Mark all user notifications as read
 * PATCH /api/notifications/read-all
 */
function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;

    db.run(`UPDATE notifications SET read = 1 WHERE user_id = ?`, [userId]);

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ success: false, error: 'Failed to update notifications.' });
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
