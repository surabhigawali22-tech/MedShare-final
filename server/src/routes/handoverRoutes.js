const express = require('express');
const router = express.Router();
const handoverController = require('../controllers/handoverController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get handover status and generated QR code
router.get('/:requestId', authenticateToken, handoverController.getHandoverDetails);

// Recipient scans QR to confirm handover
router.post(
  '/scan',
  authenticateToken,
  requireRole('recipient', 'admin'),
  handoverController.scanHandoverQR
);

module.exports = router;
