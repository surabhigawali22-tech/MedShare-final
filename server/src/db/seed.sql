-- ====================================================================
-- MedShare Seed Data SQL (PostgreSQL & SQLite compatible)
-- Default demo password for all seeded accounts: Password123!
-- ====================================================================

-- 1. System Settings
INSERT INTO settings (key, value) VALUES 
('MIN_SHELF_LIFE_DAYS', '90'),
('MAX_RADIUS_KM', '50'),
('RESTRICTED_CATEGORIES', 'Vaccines,Cold-Chain,Schedule-X'),
('DISPOSAL_GUIDELINES_URL', 'https://cpcb.nic.in/bio-medical-waste-management-rules/'),
('AUTO_NOTIFY_EXPIRY_DAYS', '90,30,7');

-- 2. Users (Admin, Verifiers, Donors, Recipients)
-- bcrypt hash for 'Password123!': $2a$10$O0GfZ15fC9bV2fH3H4JzG.Ymg4/pC2zU326K2y8z2G7w9H4yY9aG2
INSERT INTO users (id, name, email, password_hash, role, org_type, phone, address, lat, lng, verified) VALUES
(1, 'Dr. Vikram Rao (Admin)', 'admin@medshare.org', '$2a$10$3c0oYQ7gP0G1tQJtV5aHge4yQn8.gY1Lw9yB41Xw6xVqR8N/gZkmq', 'admin', 'other', '+91 98200 11001', 'MedShare Central HQ, Nariman Point, Mumbai', 18.9256, 72.8242, 1),
(2, 'Dr. Aditi Sharma (Chief Pharmacist)', 'verifier1@medshare.org', '$2a$10$3c0oYQ7gP0G1tQJtV5aHge4yQn8.gY1Lw9yB41Xw6xVqR8N/gZkmq', 'verifier', 'hospital', '+91 98200 22002', 'KEM Hospital Pharmacy Wing, Parel, Mumbai', 19.0028, 72.8427, 1),
(3, 'Dr. Rajesh Mehta (Clinical Pharmacist)', 'verifier2@medshare.org', '$2a$10$3c0oYQ7gP0G1tQJtV5aHge4yQn8.gY1Lw9yB41Xw6xVqR8N/gZkmq', 'verifier', 'pharmacy', '+91 98200 22003', 'Sion Hospital Dispensary, Sion, Mumbai', 19.0360, 72.8601, 1),
(4, 'Rahul Verma', 'donor.indiv@example.com', '$2a$10$3c0oYQ7gP0G1tQJtV5aHge4yQn8.gY1Lw9yB41Xw6xVqR8N/gZkmq', 'donor', 'individual', '+91 98200 33001', '14 Sunshine Apts, Dadar West, Mumbai', 19.0178, 72.8478, 1),
(5, 'Apex Care Pharmacy', 'donor.pharma@example.com', '$2a$10$3c0oYQ7gP0G1tQJtV5aHge4yQn8.gY1Lw9yB41Xw6xVqR8N/gZkmq', 'donor', 'pharmacy', '+91 98200 33002', 'Shop 4, Hill Road, Bandra West, Mumbai', 19.0558, 72.8315, 1),
(6, 'Lifeline Multi-Specialty Hospital', 'donor.hosp@example.com', '$2a$10$3c0oYQ7gP0G1tQJtV5aHge4yQn8.gY1Lw9yB41Xw6xVqR8N/gZkmq', 'donor', 'hospital', '+91 98200 33003', 'S.V. Road, Andheri West, Mumbai', 19.1197, 72.8468, 1),
(7, 'MediSupply Global Logistics', 'donor.dist@example.com', '$2a$10$3c0oYQ7gP0G1tQJtV5aHge4yQn8.gY1Lw9yB41Xw6xVqR8N/gZkmq', 'donor', 'distributor', '+91 98200 33004', 'MIDC Industrial Area, Marol, Andheri East, Mumbai', 19.1172, 72.8808, 1),
(8, 'Priya Nair', 'donor.indiv2@example.com', '$2a$10$3c0oYQ7gP0G1tQJtV5aHge4yQn8.gY1Lw9yB41Xw6xVqR8N/gZkmq', 'donor', 'individual', '+91 98200 33005', 'Flat 502, Green Meadows, Thane West', 19.2183, 72.9781, 1),
(9, 'Sewa Community Health Foundation', 'recipient.sewa@example.com', '$2a$10$3c0oYQ7gP0G1tQJtV5aHge4yQn8.gY1Lw9yB41Xw6xVqR8N/gZkmq', 'recipient', 'ngo', '+91 98200 44001', 'LBS Marg, Kurla West, Mumbai', 19.0726, 72.8845, 1),
(10, 'Asha Charitable Clinic', 'recipient.clinic@example.com', '$2a$10$3c0oYQ7gP0G1tQJtV5aHge4yQn8.gY1Lw9yB41Xw6xVqR8N/gZkmq', 'recipient', 'clinic', '+91 98200 44002', '60 Feet Road, Dharavi, Mumbai', 19.0434, 72.8550, 1),
(11, 'Hope For All Community Trust', 'recipient.hope@example.com', '$2a$10$3c0oYQ7gP0G1tQJtV5aHge4yQn8.gY1Lw9yB41Xw6xVqR8N/gZkmq', 'recipient', 'ngo', '+91 98200 44003', 'Near Railway Colony, Sion East, Mumbai', 19.0400, 72.8600, 1),
(12, 'Jan Arogya Seva Dispensary', 'recipient.relief@example.com', '$2a$10$3c0oYQ7gP0G1tQJtV5aHge4yQn8.gY1Lw9yB41Xw6xVqR8N/gZkmq', 'recipient', 'clinic', '+91 98200 44004', 'Station Road, Ghatkopar East, Mumbai', 19.0860, 72.9090, 1),
(13, 'Amit Kumar (Patient Need)', 'recipient.indiv@example.com', '$2a$10$3c0oYQ7gP0G1tQJtV5aHge4yQn8.gY1Lw9yB41Xw6xVqR8N/gZkmq', 'recipient', 'individual', '+91 98200 44005', 'RC Marg, Chembur, Mumbai', 19.0522, 72.8994, 1);

-- 3. Reputation
INSERT INTO reputation (donor_id, points, badge) VALUES
(4, 450, 'Silver'),
(5, 1250, 'Platinum'),
(6, 890, 'Gold'),
(7, 1500, 'Platinum'),
(8, 120, 'Bronze');

-- 4. Medicines (30 records)
INSERT INTO medicines (id, name, generic_name, category, requires_prescription, storage_condition) VALUES
(1, 'Amoxicillin 500mg', 'Amoxicillin Trihydrate', 'Antibiotic', 1, 'normal'),
(2, 'Azithromycin 500mg', 'Azithromycin Dihydrate', 'Antibiotic', 1, 'normal'),
(3, 'Ciprofloxacin 500mg', 'Ciprofloxacin Hydrochloride', 'Antibiotic', 1, 'normal'),
(4, 'Doxycycline 100mg', 'Doxycycline Hyclate', 'Antibiotic', 1, 'normal'),
(5, 'Cefixime 200mg', 'Cefixime Trihydrate', 'Antibiotic', 1, 'normal'),
(6, 'Paracetamol 650mg', 'Acetaminophen / Paracetamol', 'Analgesic', 0, 'normal'),
(7, 'Ibuprofen 400mg', 'Ibuprofen', 'Analgesic', 0, 'normal'),
(8, 'Diclofenac Sodium 50mg', 'Diclofenac Sodium', 'Analgesic', 1, 'normal'),
(9, 'Tramadol 50mg', 'Tramadol Hydrochloride', 'Analgesic', 1, 'normal'),
(10, 'Metformin 500mg', 'Metformin Hydrochloride', 'Antidiabetic', 1, 'normal'),
(11, 'Glimepiride 2mg', 'Glimepiride', 'Antidiabetic', 1, 'normal'),
(12, 'Human Insulin Regular 100IU/ml', 'Insulin Regular (rDNA origin)', 'Antidiabetic', 1, 'cold-chain'),
(13, 'Insulin Glargine 100IU/ml', 'Insulin Glargine', 'Antidiabetic', 1, 'cold-chain'),
(14, 'Amlodipine 5mg', 'Amlodipine Besylate', 'Cardiovascular', 1, 'normal'),
(15, 'Telmisartan 40mg', 'Telmisartan', 'Cardiovascular', 1, 'normal'),
(16, 'Atorvastatin 10mg', 'Atorvastatin Calcium', 'Cardiovascular', 1, 'normal'),
(17, 'Rosuvastatin 20mg', 'Rosuvastatin Calcium', 'Cardiovascular', 1, 'normal'),
(18, 'Losartan Potassium 50mg', 'Losartan Potassium', 'Cardiovascular', 1, 'normal'),
(19, 'Clopidogrel 75mg', 'Clopidogrel Bisulfate', 'Cardiovascular', 1, 'normal'),
(20, 'Pantoprazole 40mg', 'Pantoprazole Sodium', 'Gastrointestinal', 0, 'normal'),
(21, 'Omeprazole 20mg', 'Omeprazole', 'Gastrointestinal', 0, 'normal'),
(22, 'Oral Rehydration Salts (ORS)', 'Sodium Chloride + Dextrose + Potassium', 'Gastrointestinal', 0, 'normal'),
(23, 'Cetirizine 10mg', 'Cetirizine Hydrochloride', 'Antihistamine', 0, 'normal'),
(24, 'Levocetirizine 5mg', 'Levocetirizine Dihydrochloride', 'Antihistamine', 0, 'normal'),
(25, 'Montelukast 10mg', 'Montelukast Sodium', 'Respiratory', 1, 'normal'),
(26, 'Salbutamol Inhaler 100mcg', 'Salbutamol Sulphate', 'Respiratory', 1, 'normal'),
(27, 'Budesonide Respules 0.5mg', 'Budesonide', 'Respiratory', 1, 'normal'),
(28, 'Vitamin C 500mg (Chewable)', 'Ascorbic Acid', 'Vitamins', 0, 'normal'),
(29, 'Vitamin D3 60,000 IU', 'Cholecalciferol', 'Vitamins', 0, 'normal'),
(30, 'Hepatitis B Vaccine 20mcg', 'Recombinant Hepatitis B Surface Antigen', 'Vaccines', 1, 'cold-chain');

-- 5. Donations (25 records)
INSERT INTO donations (id, donor_id, medicine_id, batch_no, expiry_date, quantity, unit, packaging, storage_condition, status, safety_score, trail_id, created_at) VALUES
(1, 5, 1, 'APX-AMX-204', date('now', '+180 days'), 50, 'strips', 'sealed', 'normal', 'APPROVED', 95.0, 'MED-TR-001', datetime('now', '-10 days')),
(2, 4, 6, 'PCM-9912A', date('now', '+120 days'), 150, 'strips', 'sealed', 'normal', 'APPROVED', 92.0, 'MED-TR-002', datetime('now', '-10 days')),
(3, 5, 2, 'AZI-4421B', date('now', '+60 days'), 30, 'strips', 'sealed', 'normal', 'APPROVED', 84.0, 'MED-TR-003', datetime('now', '-10 days')),
(4, 6, 12, 'INS-REG-882', date('now', '+90 days'), 25, 'vials', 'sealed', 'cold-chain', 'APPROVED', 96.0, 'MED-TR-004', datetime('now', '-10 days')),
(5, 7, 10, 'MET-LOG-500', date('now', '+240 days'), 500, 'strips', 'sealed', 'normal', 'APPROVED', 98.0, 'MED-TR-005', datetime('now', '-10 days')),
(6, 5, 22, 'ORS-6710C', date('now', '+365 days'), 200, 'sachets', 'sealed', 'normal', 'APPROVED', 99.0, 'MED-TR-006', datetime('now', '-10 days')),
(7, 8, 23, 'CET-8190', date('now', '+150 days'), 40, 'strips', 'sealed', 'normal', 'APPROVED', 91.0, 'MED-TR-007', datetime('now', '-10 days')),
(8, 4, 14, 'AML-1029', date('now', '+110 days'), 60, 'strips', 'sealed', 'normal', 'APPROVED', 89.0, 'MED-TR-008', datetime('now', '-10 days')),
(9, 6, 26, 'SAL-INH-77', date('now', '+130 days'), 35, 'units', 'sealed', 'normal', 'APPROVED', 94.0, 'MED-TR-009', datetime('now', '-10 days')),
(10, 5, 7, 'IBU-30D-89', date('now', '+30 days'), 80, 'strips', 'sealed', 'normal', 'APPROVED', 75.0, 'MED-TR-010', datetime('now', '-10 days')),
(11, 4, 20, 'PAN-10D-11', date('now', '+10 days'), 20, 'strips', 'sealed', 'normal', 'APPROVED', 60.0, 'MED-TR-011', datetime('now', '-10 days')),
(12, 4, 3, 'CIP-NEW-01', date('now', '+150 days'), 30, 'strips', 'sealed', 'normal', 'LISTED', 88.0, 'MED-TR-012', datetime('now', '-2 days')),
(13, 5, 11, 'GLI-REV-02', date('now', '+210 days'), 45, 'strips', 'sealed', 'normal', 'UNDER_REVIEW', 90.0, 'MED-TR-013', datetime('now', '-3 days')),
(14, 6, 30, 'HEP-B-VAC', date('now', '+180 days'), 15, 'vials', 'sealed', 'cold-chain', 'UNDER_REVIEW', 92.0, 'MED-TR-014', datetime('now', '-1 days')),
(15, 5, 5, 'CEF-MATCH-8', date('now', '+140 days'), 50, 'strips', 'sealed', 'normal', 'MATCHED', 93.0, 'MED-TR-015', datetime('now', '-5 days')),
(16, 7, 29, 'VIT-D3-MAT', date('now', '+200 days'), 100, 'strips', 'sealed', 'normal', 'MATCHED', 96.0, 'MED-TR-016', datetime('now', '-6 days')),
(17, 4, 15, 'TEL-HND-99', date('now', '+160 days'), 40, 'strips', 'sealed', 'normal', 'HANDED_OVER', 90.0, 'MED-TR-017', datetime('now', '-7 days')),
(18, 5, 16, 'ATO-CMP-01', date('now', '+190 days'), 75, 'strips', 'sealed', 'normal', 'COMPLETED', 95.0, 'MED-TR-018', datetime('now', '-15 days')),
(19, 6, 4, 'DOX-CMP-02', date('now', '+220 days'), 60, 'strips', 'sealed', 'normal', 'COMPLETED', 97.0, 'MED-TR-019', datetime('now', '-20 days')),
(20, 7, 28, 'VTC-CMP-03', date('now', '+300 days'), 300, 'bottles', 'sealed', 'normal', 'COMPLETED', 98.0, 'MED-TR-020', datetime('now', '-25 days')),
(21, 8, 8, 'DIC-REJ-91', date('now', '+180 days'), 10, 'strips', 'opened', 'normal', 'REJECTED', 30.0, 'MED-TR-021', datetime('now', '-4 days')),
(22, 4, 13, 'GLA-REJ-44', date('now', '+120 days'), 5, 'vials', 'sealed', 'normal', 'REJECTED', 35.0, 'MED-TR-022', datetime('now', '-4 days')),
(23, 4, 17, 'ROS-EXP-01', date('now', '-2 days'), 25, 'strips', 'sealed', 'normal', 'EXPIRED', 0.0, 'MED-TR-023', datetime('now', '-180 days')),
(24, 8, 21, 'OME-EXP-02', date('now', '-7 days'), 15, 'strips', 'sealed', 'normal', 'EXPIRED', 0.0, 'MED-TR-024', datetime('now', '-180 days')),
(25, 5, 24, 'LEV-OK-25', date('now', '+210 days'), 90, 'strips', 'sealed', 'normal', 'APPROVED', 94.0, 'MED-TR-025', datetime('now', '-1 days'));
