const express = require('express');
const router = express.Router();
const urgentNeedController = require('../controllers/urgentNeedController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', urgentNeedController.getUrgentNeeds);

router.post(
  '/',
  authenticateToken,
  requireRole('recipient', 'admin'),
  urgentNeedController.createUrgentNeed
);

router.patch(
  '/:id/status',
  authenticateToken,
  urgentNeedController.updateUrgentNeedStatus
);

module.exports = router;
