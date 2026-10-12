const express = require('express');
const router = express.Router();
const disposalController = require('../controllers/disposalController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', disposalController.getDisposalQueue);
router.post('/log', authenticateToken, disposalController.logDisposal);

module.exports = router;
