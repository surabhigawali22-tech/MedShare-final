const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
require('dotenv').config(); // Fallback to current directory .env if any

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'medshare-super-secret-production-key-2025',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DATABASE_URL: process.env.DATABASE_URL || '',
  DB_FILE: process.env.DB_FILE || path.join(__dirname, '../../data/medshare.db'),
  UPLOAD_DIR: path.join(__dirname, '../../uploads'),
  DEFAULT_MIN_SHELF_LIFE_DAYS: 90,
  DEFAULT_MAX_RADIUS_KM: 50,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173'
};
