const app = require('./app');
const config = require('./config');
const db = require('./db/db');
const { startExpiryCron } = require('./cron/expiryJob');

// Ensure DB schema is ready
try {
  db.initSchema();
  // Check if DB is empty; if so, run seed automatically
  const userCount = db.get('SELECT COUNT(*) as count FROM users');
  if (!userCount || userCount.count === 0) {
    console.log('[Startup] Empty database detected. Seeding demo data...');
    const { runSeed } = require('./db/seed');
    runSeed();
  }
} catch (error) {
  console.error('[Startup] Database initialization error:', error);
}

// Start Expiry Management node-cron Scheduler
try {
  startExpiryCron();
} catch (cronErr) {
  console.error('[Startup] Cron scheduler initialization error:', cronErr);
}

const server = app.listen(config.PORT, () => {
  console.log(`=======================================================`);
  console.log(`  MedShare Backend Server running on port ${config.PORT}`);
  console.log(`  API Health: http://localhost:${config.PORT}/api/health`);
  console.log(`  Environment: ${config.NODE_ENV}`);
  console.log(`=======================================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
