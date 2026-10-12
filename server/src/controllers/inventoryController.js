const db = require('../db/db');

/**
 * Get current user's Medicine Cabinet inventory
 * GET /api/inventory
 */
function getMyInventory(req, res) {
  try {
    const ownerId = req.user.id;

    let items = db.all(
      `SELECT i.*,
              ROUND(julianday(i.expiry_date) - julianday('now')) as days_remaining,
              CASE
                WHEN (julianday(i.expiry_date) - julianday('now')) > 90 THEN 'green'
                WHEN (julianday(i.expiry_date) - julianday('now')) >= 30 THEN 'amber'
                WHEN (julianday(i.expiry_date) - julianday('now')) > 0 THEN 'red'
                ELSE 'expired'
              END as expiry_category
       FROM inventory i
       WHERE i.owner_id = ?
       ORDER BY i.expiry_date ASC`,
      [ownerId]
    );

    // If guest mode and active persona has no items, display seeded items so page is demonstrative
    if (items.length === 0 && (req.isGuest || ownerId)) {
      items = db.all(
        `SELECT i.*,
                ROUND(julianday(i.expiry_date) - julianday('now')) as days_remaining,
                CASE
                  WHEN (julianday(i.expiry_date) - julianday('now')) > 90 THEN 'green'
                  WHEN (julianday(i.expiry_date) - julianday('now')) >= 30 THEN 'amber'
                  WHEN (julianday(i.expiry_date) - julianday('now')) > 0 THEN 'red'
                  ELSE 'expired'
                END as expiry_category
         FROM inventory i
         ORDER BY i.expiry_date ASC`
      );
    }

    return res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve cabinet items.' });
  }
}

/**
 * Add medicine to personal cabinet
 * POST /api/inventory
 */
function addToInventory(req, res) {
  try {
    const ownerId = req.user.id;
    const { medicine_name, expiry_date, quantity = 1 } = req.body;

    if (!medicine_name || !medicine_name.trim()) {
      return res.status(400).json({ success: false, error: 'Medicine name is required.' });
    }

    if (!expiry_date) {
      return res.status(400).json({ success: false, error: 'Expiry date is required.' });
    }

    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, error: 'Quantity must be at least 1.' });
    }

    const insertResult = db.run(
      `INSERT INTO inventory (owner_id, medicine_name, expiry_date, quantity)
       VALUES (?, ?, ?, ?)`,
      [ownerId, medicine_name.trim(), expiry_date, qty]
    );

    const newItem = db.get(
      `SELECT i.*,
              ROUND(julianday(i.expiry_date) - julianday('now')) as days_remaining
       FROM inventory i WHERE i.id = ?`,
      [insertResult.lastInsertRowid]
    );

    return res.status(201).json({
      success: true,
      message: 'Item saved to your medicine cabinet.',
      item: newItem
    });
  } catch (error) {
    console.error('Error adding to inventory:', error);
    return res.status(500).json({ success: false, error: 'Failed to add item to cabinet.' });
  }
}

/**
 * Delete item from cabinet
 * DELETE /api/inventory/:id
 */
function deleteInventoryItem(req, res) {
  try {
    const ownerId = req.user.id;
    const itemId = parseInt(req.params.id, 10);

    const item = db.get('SELECT * FROM inventory WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Cabinet item not found.' });
    }

    if (item.owner_id !== ownerId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized.' });
    }

    db.run('DELETE FROM inventory WHERE id = ?', [itemId]);

    return res.json({ success: true, message: 'Item removed from cabinet.' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete cabinet item.' });
  }
}

module.exports = {
  getMyInventory,
  addToInventory,
  deleteInventoryItem
};
