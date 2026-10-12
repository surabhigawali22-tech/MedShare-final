-- ====================================================================
-- MedShare Database Schema
-- Compatible with PostgreSQL and SQLite
-- ====================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('donor', 'recipient', 'verifier', 'admin')),
  org_type TEXT CHECK (org_type IN ('individual', 'pharmacy', 'hospital', 'distributor', 'ngo', 'clinic', 'other')),
  phone TEXT,
  address TEXT,
  lat REAL,
  lng REAL,
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Medicines Catalog
CREATE TABLE IF NOT EXISTS medicines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  generic_name TEXT NOT NULL,
  category TEXT NOT NULL,
  requires_prescription INTEGER NOT NULL DEFAULT 0 CHECK (requires_prescription IN (0, 1)),
  storage_condition TEXT NOT NULL DEFAULT 'normal' CHECK (storage_condition IN ('normal', 'cold-chain'))
);

-- 3. Donations Table
CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  donor_id INTEGER NOT NULL,
  medicine_id INTEGER NOT NULL,
  batch_no TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'strips',
  packaging TEXT NOT NULL CHECK (packaging IN ('sealed', 'opened')),
  storage_condition TEXT NOT NULL DEFAULT 'normal' CHECK (storage_condition IN ('normal', 'cold-chain')),
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'LISTED' CHECK (status IN ('LISTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'MATCHED', 'HANDED_OVER', 'COMPLETED', 'EXPIRED')),
  safety_score REAL DEFAULT 0,
  trail_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT,
  CHECK (expiry_date > substr(created_at, 1, 10))
);

-- 4. Verifications Table
CREATE TABLE IF NOT EXISTS verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  donation_id INTEGER NOT NULL,
  verifier_id INTEGER NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE,
  FOREIGN KEY (verifier_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 5. Requests Table
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_id INTEGER NOT NULL,
  donation_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED')),
  match_score REAL DEFAULT 0,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE
);

-- 6. Urgent Needs Table
CREATE TABLE IF NOT EXISTS urgent_needs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_id INTEGER NOT NULL,
  medicine_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  needed_by TEXT NOT NULL,
  lat REAL,
  lng REAL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FULFILLED', 'EXPIRED', 'CANCELLED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT
);

-- 7. Handovers Table
CREATE TABLE IF NOT EXISTS handovers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL UNIQUE,
  qr_scanned_at TIMESTAMP,
  confirmed_by_donor INTEGER NOT NULL DEFAULT 0 CHECK (confirmed_by_donor IN (0, 1)),
  confirmed_by_recipient INTEGER NOT NULL DEFAULT 0 CHECK (confirmed_by_recipient IN (0, 1)),
  completed_at TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

-- 8. Personal Inventory ("My Medicine Cabinet")
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  medicine_name TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0 CHECK (read IN (0, 1)),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Disposal Records (Disposal Queue)
CREATE TABLE IF NOT EXISTS disposal_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL CHECK (source_type IN ('donation', 'inventory')),
  source_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  method TEXT NOT NULL,
  disposed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Audit Events (Append-only trail)
CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  actor_id INTEGER,
  metadata_json TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 12. Donor Reputation & Badges
CREATE TABLE IF NOT EXISTS reputation (
  donor_id INTEGER PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 0,
  badge TEXT NOT NULL DEFAULT 'Bronze' CHECK (badge IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
  FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. System Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ====================================================================
-- Indexes for Performance
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_donations_expiry ON donations(expiry_date);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_users_lat_lng ON users(lat, lng);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_urgent_needs_status ON urgent_needs(status);

-- ====================================================================
-- View: expiring_soon (Items expiring within 30 days)
-- ====================================================================
DROP VIEW IF EXISTS expiring_soon;
CREATE VIEW expiring_soon AS
SELECT 
  'donation' AS item_type,
  d.id,
  d.donor_id AS owner_id,
  m.name AS medicine_name,
  d.batch_no,
  d.expiry_date,
  d.quantity,
  d.unit,
  d.status,
  ROUND(julianday(d.expiry_date) - julianday('now')) AS days_remaining
FROM donations d
JOIN medicines m ON d.medicine_id = m.id
WHERE d.expiry_date <= date('now', '+30 days') AND d.expiry_date >= date('now')
UNION ALL
SELECT 
  'inventory' AS item_type,
  i.id,
  i.owner_id,
  i.medicine_name,
  NULL AS batch_no,
  i.expiry_date,
  i.quantity,
  'units' AS unit,
  'CABINET' AS status,
  ROUND(julianday(i.expiry_date) - julianday('now')) AS days_remaining
FROM inventory i
WHERE i.expiry_date <= date('now', '+30 days') AND i.expiry_date >= date('now');

-- ====================================================================
-- Trigger: Prevent requesting expired donations
-- ====================================================================
DROP TRIGGER IF EXISTS prevent_expired_donation_request;
CREATE TRIGGER prevent_expired_donation_request
BEFORE INSERT ON requests
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN (SELECT expiry_date FROM donations WHERE id = NEW.donation_id) <= date('now')
    THEN RAISE(ABORT, 'Cannot request an expired donation')
  END;
END;
