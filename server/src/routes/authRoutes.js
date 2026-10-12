const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateBody, registerSchema, loginSchema } = require('../middleware/validate');

// Public auth endpoints
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/guest-switch', authController.guestSwitch);

// Protected endpoints
router.get('/me', authenticateToken, authController.me);
router.put('/profile', authenticateToken, authController.updateProfile);

module.exports = router;
