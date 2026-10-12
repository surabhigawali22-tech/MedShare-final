const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticateToken, requireRole, requireVerifiedRecipient } = require('../middleware/auth');

// Recipient requests medicine from approved donation
router.post(
  '/',
  authenticateToken,
  requireRole('recipient', 'admin'),
  requireVerifiedRecipient,
  requestController.createRequest
);

// Donor views incoming requests
router.get(
  '/incoming',
  authenticateToken,
  requireRole('donor', 'admin'),
  requestController.getIncomingRequests
);

// Recipient views their outgoing requests
router.get(
  '/outgoing',
  authenticateToken,
  requireRole('recipient', 'admin'),
  requestController.getOutgoingRequests
);

// Donor responds to request (Accept or Decline)
router.post(
  '/:id/respond',
  authenticateToken,
  requireRole('donor', 'admin'),
  requestController.respondToRequest
);

module.exports = router;
