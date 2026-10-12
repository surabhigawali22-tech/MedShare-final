const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');
const matchController = require('../controllers/matchController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public or authenticated list & detail
router.get('/', donationController.getDonations);
router.get('/my', authenticateToken, requireRole('donor', 'admin'), donationController.getMyDonations);
router.get('/:id/matches', matchController.getMatches);
router.get('/:id', donationController.getDonationById);

// Donor only: Create donation listing with photo upload
router.post(
  '/',
  authenticateToken,
  requireRole('donor', 'admin'),
  upload.single('photo'),
  donationController.createDonation
);

module.exports = router;
