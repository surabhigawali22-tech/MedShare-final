const db = require('../db/db');

/**
 * Get all medicines or search by query
 * GET /api/medicines?search=amox
 */
function getMedicines(req, res) {
  try {
    const { search, category, rx } = req.query;
    let sql = 'SELECT * FROM medicines WHERE 1=1';
    const params = [];

    if (search && search.trim()) {
      sql += ' AND (name LIKE ? OR generic_name LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (rx !== undefined) {
      sql += ' AND requires_prescription = ?';
      params.push(Number(rx));
    }

    sql += ' ORDER BY name ASC';
    const medicines = db.all(sql, params);

    return res.json({
      success: true,
      count: medicines.length,
      medicines
    });
  } catch (error) {
    console.error('Error fetching medicines:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve medicines catalog.' });
  }
}

/**
 * Get single medicine by ID
 * GET /api/medicines/:id
 */
function getMedicineById(req, res) {
  try {
    const medicine = db.get('SELECT * FROM medicines WHERE id = ?', [req.params.id]);
    if (!medicine) {
      return res.status(404).json({ success: false, error: 'Medicine not found.' });
    }
    return res.json({ success: true, medicine });
  } catch (error) {
    console.error('Error fetching medicine by ID:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve medicine details.' });
  }
}

module.exports = {
  getMedicines,
  getMedicineById
};
