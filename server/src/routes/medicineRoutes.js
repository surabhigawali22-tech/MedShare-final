const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');

router.get('/', medicineController.getMedicines);
router.get('/:id', medicineController.getMedicineById);

module.exports = router;
