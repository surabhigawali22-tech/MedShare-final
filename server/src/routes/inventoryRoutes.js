const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', inventoryController.getMyInventory);
router.post('/', inventoryController.addToInventory);
router.delete('/:id', inventoryController.deleteInventoryItem);

module.exports = router;
