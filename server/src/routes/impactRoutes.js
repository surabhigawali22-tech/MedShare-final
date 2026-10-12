const express = require('express');
const router = express.Router();
const impactController = require('../controllers/impactController');
const { authenticateToken } = require('../middleware/auth');

router.get('/leaderboard', impactController.getLeaderboard);
router.get('/me', authenticateToken, impactController.getPersonalImpact);

module.exports = router;
