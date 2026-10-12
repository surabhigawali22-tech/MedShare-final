const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Only verifier (pharmacist) and admin can access review queue and submit decisions
router.get(
  '/queue',
  authenticateToken,
  requireRole('verifier', 'admin'),
  verificationController.getVerificationQueue
);

router.post(
  '/:donationId',
  authenticateToken,
  requireRole('verifier', 'admin'),
  verificationController.submitVerification
);

module.exports = router;
