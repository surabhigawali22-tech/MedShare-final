const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/users', adminController.getUsers);
router.patch('/users/:id/verify', adminController.verifyUser);
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);
router.get('/heatmap', adminController.getHeatmapData);
router.get('/reports', adminController.getReports);

module.exports = router;
