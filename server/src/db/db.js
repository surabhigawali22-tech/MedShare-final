const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure data directory exists
const dataDir = path.dirname(config.DB_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure uploads directory exists
if (!fs.existsSync(config.UPLOAD_DIR)) {
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}

let dbInstance = null;
let isNativeSqlite = false;

function getDb() {
  if (dbInstance) return dbInstance;

  try {
    // 1. Prefer Node.js 22+ built-in node:sqlite (zero external compilation/node-gyp needed)
    try {
      const { DatabaseSync } = require('node:sqlite');
      dbInstance = new DatabaseSync(config.DB_FILE);
      dbInstance.exec('PRAGMA foreign_keys = ON;');
      dbInstance.exec('PRAGMA journal_mode = WAL;');
      isNativeSqlite = true;
      console.log('[DB] Using Node.js native built-in SQLite engine');
      return dbInstance;
    } catch (nativeErr) {
      // 2. Fallback to better-sqlite3 if available
      const BetterSqlite = require('better-sqlite3');
      dbInstance = new BetterSqlite(config.DB_FILE);
      dbInstance.pragma('foreign_keys = ON');
      dbInstance.pragma('journal_mode = WAL');
      isNativeSqlite = false;
      console.log('[DB] Using better-sqlite3 engine');
      return dbInstance;
    }
  } catch (error) {
    console.error('Failed to initialize SQLite database:', error);
    throw error;
  }
}

/**
 * Execute raw SQL script
 */
function execScript(sql) {
  const db = getDb();
  return db.exec(sql);
}

/**
 * Run a single parameter query (INSERT, UPDATE, DELETE)
 * Returns { changes, lastInsertRowid }
 */
function run(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  const paramArray = Array.isArray(params) ? params : [params];

  if (isNativeSqlite) {
    const res = stmt.run(...paramArray);
    return {
      changes: res.changes,
      lastInsertRowid: Number(res.lastInsertRowid)
    };
  } else {
    return stmt.run(...paramArray);
  }
}

/**
 * Get a single row
 */
function get(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  const paramArray = Array.isArray(params) ? params : [params];

  if (isNativeSqlite) {
    return stmt.get(...paramArray);
  } else {
    return stmt.get(...paramArray);
  }
}

/**
 * Get all matching rows
 */
function all(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  const paramArray = Array.isArray(params) ? params : [params];

  if (isNativeSqlite) {
    return stmt.all(...paramArray);
  } else {
    return stmt.all(...paramArray);
  }
}

/**
 * Transaction helper
 */
function transaction(fn) {
  const db = getDb();
  if (!isNativeSqlite && typeof db.transaction === 'function') {
    return db.transaction(fn);
  }

  // Pure SQL transaction wrapper for node:sqlite
  return (...args) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch (_) {}
      throw err;
    }
  };
}

/**
 * Initialize Schema
 */
function initSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  execScript(schemaSql);
  console.log('[DB] Schema initialized successfully');
}

module.exports = {
  getDb,
  run,
  get,
  all,
  execScript,
  transaction,
  initSchema
};
