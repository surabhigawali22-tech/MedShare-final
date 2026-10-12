const path = require('path');
const fs = require('fs');
const multer = require('multer');
const config = require('../config');

// Ensure upload directory exists
if (!fs.existsSync(config.UPLOAD_DIR)) {
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate safe, unique filename: med-[timestamp]-[random].[ext]
    const ext = path.extname(file.originalname).toLowerCase();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    cb(null, `med-${Date.now()}-${randomSuffix}${ext}`);
  }
});

// File filter (only image formats)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max
  },
  fileFilter
});

module.exports = upload;
