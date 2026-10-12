const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function subDays(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function runSeed() {
  console.log('[DB] Initializing database schema...');
  db.initSchema();

  console.log('[DB] Clearing existing data...');
  const tables = [
    'audit_events', 'notifications', 'disposal_records', 'inventory',
    'handovers', 'requests', 'urgent_needs', 'verifications',
    'donations', 'reputation', 'medicines', 'users', 'settings'
  ];
  for (const table of tables) {
    db.run(`DELETE FROM ${table}`);
  }
  try {
    db.run(`DELETE FROM sqlite_sequence`);
  } catch (e) {
    // If not using sqlite_sequence, ignore
  }

  console.log('[DB] Seeding settings...');
  const settings = [
    ['MIN_SHELF_LIFE_DAYS', '90'],
    ['MAX_RADIUS_KM', '50'],
    ['RESTRICTED_CATEGORIES', 'Vaccines,Cold-Chain,Schedule-X'],
    ['DISPOSAL_GUIDELINES_URL', 'https://cpcb.nic.in/bio-medical-waste-management-rules/'],
    ['AUTO_NOTIFY_EXPIRY_DAYS', '90,30,7']
  ];
  for (const [key, val] of settings) {
    db.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, [key, val]);
  }

  console.log('[DB] Seeding users...');
  const passwordHash = bcrypt.hashSync('Password123!', 10);

  // 1 Admin, 2 Verifiers, 5 Donors, 5 Recipients
  const users = [
    // 1 Admin
    {
      name: 'Dr. Vikram Rao (Admin)',
      email: 'admin@medshare.org',
      role: 'admin',
      org_type: 'other',
      phone: '+91 98200 11001',
      address: 'MedShare Central HQ, Nariman Point, Mumbai',
      lat: 18.9256,
      lng: 72.8242,
      verified: 1
    },
    // 2 Verifiers
    {
      name: 'Dr. Aditi Sharma (Chief Pharmacist)',
      email: 'verifier1@medshare.org',
      role: 'verifier',
      org_type: 'hospital',
      phone: '+91 98200 22002',
      address: 'KEM Hospital Pharmacy Wing, Parel, Mumbai',
      lat: 19.0028,
      lng: 72.8427,
      verified: 1
    },
    {
      name: 'Dr. Rajesh Mehta (Clinical Pharmacist)',
      email: 'verifier2@medshare.org',
      role: 'verifier',
      org_type: 'pharmacy',
      phone: '+91 98200 22003',
      address: 'Sion Hospital Dispensary, Sion, Mumbai',
      lat: 19.0360,
      lng: 72.8601,
      verified: 1
    },
    // 5 Donors (individual, pharmacy, hospital, distributor, individual)
    {
      name: 'Rahul Verma',
      email: 'donor.indiv@example.com',
      role: 'donor',
      org_type: 'individual',
      phone: '+91 98200 33001',
      address: '14 Sunshine Apts, Dadar West, Mumbai',
      lat: 19.0178,
      lng: 72.8478,
      verified: 1
    },
    {
      name: 'Apex Care Pharmacy',
      email: 'donor.pharma@example.com',
      role: 'donor',
      org_type: 'pharmacy',
      phone: '+91 98200 33002',
      address: 'Shop 4, Hill Road, Bandra West, Mumbai',
      lat: 19.0558,
      lng: 72.8315,
      verified: 1
    },
    {
      name: 'Lifeline Multi-Specialty Hospital',
      email: 'donor.hosp@example.com',
      role: 'donor',
      org_type: 'hospital',
      phone: '+91 98200 33003',
      address: 'S.V. Road, Andheri West, Mumbai',
      lat: 19.1197,
      lng: 72.8468,
      verified: 1
    },
    {
      name: 'MediSupply Global Logistics',
      email: 'donor.dist@example.com',
      role: 'donor',
      org_type: 'distributor',
      phone: '+91 98200 33004',
      address: 'MIDC Industrial Area, Marol, Andheri East, Mumbai',
      lat: 19.1172,
      lng: 72.8808,
      verified: 1
    },
    {
      name: 'Priya Nair',
      email: 'donor.indiv2@example.com',
      role: 'donor',
      org_type: 'individual',
      phone: '+91 98200 33005',
      address: 'Flat 502, Green Meadows, Thane West',
      lat: 19.2183,
      lng: 72.9781,
      verified: 1
    },
    // 5 Recipients (NGO, Clinic, NGO, Clinic, Individual)
    {
      name: 'Sewa Community Health Foundation',
      email: 'recipient.sewa@example.com',
      role: 'recipient',
      org_type: 'ngo',
      phone: '+91 98200 44001',
      address: 'LBS Marg, Kurla West, Mumbai',
      lat: 19.0726,
      lng: 72.8845,
      verified: 1
    },
    {
      name: 'Asha Charitable Clinic',
      email: 'recipient.clinic@example.com',
      role: 'recipient',
      org_type: 'clinic',
      phone: '+91 98200 44002',
      address: '60 Feet Road, Dharavi, Mumbai',
      lat: 19.0434,
      lng: 72.8550,
      verified: 1
    },
    {
      name: 'Hope For All Community Trust',
      email: 'recipient.hope@example.com',
      role: 'recipient',
      org_type: 'ngo',
      phone: '+91 98200 44003',
      address: 'Near Railway Colony, Sion East, Mumbai',
      lat: 19.0400,
      lng: 72.8600,
      verified: 1
    },
    {
      name: 'Jan Arogya Seva Dispensary',
      email: 'recipient.relief@example.com',
      role: 'recipient',
      org_type: 'clinic',
      phone: '+91 98200 44004',
      address: 'Station Road, Ghatkopar East, Mumbai',
      lat: 19.0860,
      lng: 72.9090,
      verified: 1
    },
    {
      name: 'Amit Kumar (Patient Need)',
      email: 'recipient.indiv@example.com',
      role: 'recipient',
      org_type: 'individual',
      phone: '+91 98200 44005',
      address: 'RC Marg, Chembur, Mumbai',
      lat: 19.0522,
      lng: 72.8994,
      verified: 1
    }
  ];

  const uMap = {};
  for (const u of users) {
    const res = db.run(
      `INSERT INTO users (name, email, password_hash, role, org_type, phone, address, lat, lng, verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.name, u.email, passwordHash, u.role, u.org_type, u.phone, u.address, u.lat, u.lng, u.verified]
    );
    uMap[u.email] = res.lastInsertRowid;
  }

  // Donor reputations
  const donorEmails = [
    'donor.indiv@example.com',
    'donor.pharma@example.com',
    'donor.hosp@example.com',
    'donor.dist@example.com',
    'donor.indiv2@example.com'
  ];
  const repBadges = [
    { points: 450, badge: 'Silver' },
    { points: 1250, badge: 'Platinum' },
    { points: 890, badge: 'Gold' },
    { points: 1500, badge: 'Platinum' },
    { points: 120, badge: 'Bronze' }
  ];
  donorEmails.forEach((email, idx) => {
    const dId = uMap[email];
    const rep = repBadges[idx];
    db.run(`INSERT INTO reputation (donor_id, points, badge) VALUES (?, ?, ?)`, [dId, rep.points, rep.badge]);
  });

  console.log('[DB] Seeding 30 medicines...');
  const medicines = [
    { name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin Trihydrate', category: 'Antibiotic', rx: 1, storage: 'normal' },
    { name: 'Azithromycin 500mg', generic_name: 'Azithromycin Dihydrate', category: 'Antibiotic', rx: 1, storage: 'normal' },
    { name: 'Ciprofloxacin 500mg', generic_name: 'Ciprofloxacin Hydrochloride', category: 'Antibiotic', rx: 1, storage: 'normal' },
    { name: 'Doxycycline 100mg', generic_name: 'Doxycycline Hyclate', category: 'Antibiotic', rx: 1, storage: 'normal' },
    { name: 'Cefixime 200mg', generic_name: 'Cefixime Trihydrate', category: 'Antibiotic', rx: 1, storage: 'normal' },
    { name: 'Paracetamol 650mg', generic_name: 'Acetaminophen / Paracetamol', category: 'Analgesic', rx: 0, storage: 'normal' },
    { name: 'Ibuprofen 400mg', generic_name: 'Ibuprofen', category: 'Analgesic', rx: 0, storage: 'normal' },
    { name: 'Diclofenac Sodium 50mg', generic_name: 'Diclofenac Sodium', category: 'Analgesic', rx: 1, storage: 'normal' },
    { name: 'Tramadol 50mg', generic_name: 'Tramadol Hydrochloride', category: 'Analgesic', rx: 1, storage: 'normal' },
    { name: 'Metformin 500mg', generic_name: 'Metformin Hydrochloride', category: 'Antidiabetic', rx: 1, storage: 'normal' },
    { name: 'Glimepiride 2mg', generic_name: 'Glimepiride', category: 'Antidiabetic', rx: 1, storage: 'normal' },
    { name: 'Human Insulin Regular 100IU/ml', generic_name: 'Insulin Regular (rDNA origin)', category: 'Antidiabetic', rx: 1, storage: 'cold-chain' },
    { name: 'Insulin Glargine 100IU/ml', generic_name: 'Insulin Glargine', category: 'Antidiabetic', rx: 1, storage: 'cold-chain' },
    { name: 'Amlodipine 5mg', generic_name: 'Amlodipine Besylate', category: 'Cardiovascular', rx: 1, storage: 'normal' },
    { name: 'Telmisartan 40mg', generic_name: 'Telmisartan', category: 'Cardiovascular', rx: 1, storage: 'normal' },
    { name: 'Atorvastatin 10mg', generic_name: 'Atorvastatin Calcium', category: 'Cardiovascular', rx: 1, storage: 'normal' },
    { name: 'Rosuvastatin 20mg', generic_name: 'Rosuvastatin Calcium', category: 'Cardiovascular', rx: 1, storage: 'normal' },
    { name: 'Losartan Potassium 50mg', generic_name: 'Losartan Potassium', category: 'Cardiovascular', rx: 1, storage: 'normal' },
    { name: 'Clopidogrel 75mg', generic_name: 'Clopidogrel Bisulfate', category: 'Cardiovascular', rx: 1, storage: 'normal' },
    { name: 'Pantoprazole 40mg', generic_name: 'Pantoprazole Sodium', category: 'Gastrointestinal', rx: 0, storage: 'normal' },
    { name: 'Omeprazole 20mg', generic_name: 'Omeprazole', category: 'Gastrointestinal', rx: 0, storage: 'normal' },
    { name: 'Oral Rehydration Salts (ORS)', generic_name: 'Sodium Chloride + Dextrose + Potassium', category: 'Gastrointestinal', rx: 0, storage: 'normal' },
    { name: 'Cetirizine 10mg', generic_name: 'Cetirizine Hydrochloride', category: 'Antihistamine', rx: 0, storage: 'normal' },
    { name: 'Levocetirizine 5mg', generic_name: 'Levocetirizine Dihydrochloride', category: 'Antihistamine', rx: 0, storage: 'normal' },
    { name: 'Montelukast 10mg', generic_name: 'Montelukast Sodium', category: 'Respiratory', rx: 1, storage: 'normal' },
    { name: 'Salbutamol Inhaler 100mcg', generic_name: 'Salbutamol Sulphate', category: 'Respiratory', rx: 1, storage: 'normal' },
    { name: 'Budesonide Respules 0.5mg', generic_name: 'Budesonide', category: 'Respiratory', rx: 1, storage: 'normal' },
    { name: 'Vitamin C 500mg (Chewable)', generic_name: 'Ascorbic Acid', category: 'Vitamins', rx: 0, storage: 'normal' },
    { name: 'Vitamin D3 60,000 IU', generic_name: 'Cholecalciferol', category: 'Vitamins', rx: 0, storage: 'normal' },
    { name: 'Hepatitis B Vaccine 20mcg', generic_name: 'Recombinant Hepatitis B Surface Antigen', category: 'Vaccines', rx: 1, storage: 'cold-chain' }
  ];

  const mMap = {};
  for (const m of medicines) {
    const res = db.run(
      `INSERT INTO medicines (name, generic_name, category, requires_prescription, storage_condition)
       VALUES (?, ?, ?, ?, ?)`,
      [m.name, m.generic_name, m.category, m.rx, m.storage]
    );
    mMap[m.name] = res.lastInsertRowid;
  }

  console.log('[DB] Seeding 25 donations with varied statuses & expiries...');
  const donations = [
    // 1: APPROVED - Expiring in 180 days (Healthy, high safety score)
    {
      donor_email: 'donor.pharma@example.com', med_name: 'Amoxicillin 500mg', batch_no: 'APX-AMX-204', expiry_date: addDays(180),
      quantity: 50, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'APPROVED', safety_score: 95.0, trail_id: 'MED-TR-001'
    },
    // 2: APPROVED - Expiring in 120 days (Paracetamol)
    {
      donor_email: 'donor.indiv@example.com', med_name: 'Paracetamol 650mg', batch_no: 'PCM-9912A', expiry_date: addDays(120),
      quantity: 150, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'APPROVED', safety_score: 92.0, trail_id: 'MED-TR-002'
    },
    // 3: APPROVED - Expiring in 60 days (Near-expiry rescue, eligible for high urgency/rescue points)
    {
      donor_email: 'donor.pharma@example.com', med_name: 'Azithromycin 500mg', batch_no: 'AZI-4421B', expiry_date: addDays(60),
      quantity: 30, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'APPROVED', safety_score: 84.0, trail_id: 'MED-TR-003'
    },
    // 4: APPROVED - Cold-chain Insulin from Hospital (Expiring in 90 days)
    {
      donor_email: 'donor.hosp@example.com', med_name: 'Human Insulin Regular 100IU/ml', batch_no: 'INS-REG-882', expiry_date: addDays(90),
      quantity: 25, unit: 'vials', packaging: 'sealed', storage: 'cold-chain',
      status: 'APPROVED', safety_score: 96.0, trail_id: 'MED-TR-004'
    },
    // 5: APPROVED - Large batch from Distributor (Expiring in 240 days)
    {
      donor_email: 'donor.dist@example.com', med_name: 'Metformin 500mg', batch_no: 'MET-LOG-500', expiry_date: addDays(240),
      quantity: 500, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'APPROVED', safety_score: 98.0, trail_id: 'MED-TR-005'
    },
    // 6: APPROVED - ORS from Pharmacy (Expiring in 365 days)
    {
      donor_email: 'donor.pharma@example.com', med_name: 'Oral Rehydration Salts (ORS)', batch_no: 'ORS-6710C', expiry_date: addDays(365),
      quantity: 200, unit: 'sachets', packaging: 'sealed', storage: 'normal',
      status: 'APPROVED', safety_score: 99.0, trail_id: 'MED-TR-006'
    },
    // 7: APPROVED - Cetirizine (Expiring in 150 days)
    {
      donor_email: 'donor.indiv2@example.com', med_name: 'Cetirizine 10mg', batch_no: 'CET-8190', expiry_date: addDays(150),
      quantity: 40, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'APPROVED', safety_score: 91.0, trail_id: 'MED-TR-007'
    },
    // 8: APPROVED - Amlodipine (Expiring in 110 days)
    {
      donor_email: 'donor.indiv@example.com', med_name: 'Amlodipine 5mg', batch_no: 'AML-1029', expiry_date: addDays(110),
      quantity: 60, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'APPROVED', safety_score: 89.0, trail_id: 'MED-TR-008'
    },
    // 9: APPROVED - Salbutamol Inhalers from Hospital (Expiring in 130 days)
    {
      donor_email: 'donor.hosp@example.com', med_name: 'Salbutamol Inhaler 100mcg', batch_no: 'SAL-INH-77', expiry_date: addDays(130),
      quantity: 35, unit: 'units', packaging: 'sealed', storage: 'normal',
      status: 'APPROVED', safety_score: 94.0, trail_id: 'MED-TR-009'
    },
    // 10: APPROVED - Expiring in 30 days (High urgency near-expiry rescue)
    {
      donor_email: 'donor.pharma@example.com', med_name: 'Ibuprofen 400mg', batch_no: 'IBU-30D-89', expiry_date: addDays(30),
      quantity: 80, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'APPROVED', safety_score: 75.0, trail_id: 'MED-TR-010'
    },
    // 11: APPROVED - Expiring in 10 days (Imminent expiry rescue or disposal candidate)
    {
      donor_email: 'donor.indiv@example.com', med_name: 'Pantoprazole 40mg', batch_no: 'PAN-10D-11', expiry_date: addDays(10),
      quantity: 20, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'APPROVED', safety_score: 60.0, trail_id: 'MED-TR-011'
    },
    // 12: LISTED (Newly submitted, pending initial processing)
    {
      donor_email: 'donor.indiv@example.com', med_name: 'Ciprofloxacin 500mg', batch_no: 'CIP-NEW-01', expiry_date: addDays(150),
      quantity: 30, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'LISTED', safety_score: 88.0, trail_id: 'MED-TR-012'
    },
    // 13: UNDER_REVIEW (In verifier review queue)
    {
      donor_email: 'donor.pharma@example.com', med_name: 'Glimepiride 2mg', batch_no: 'GLI-REV-02', expiry_date: addDays(210),
      quantity: 45, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'UNDER_REVIEW', safety_score: 90.0, trail_id: 'MED-TR-013'
    },
    // 14: UNDER_REVIEW (Vaccine needing cold-chain proof)
    {
      donor_email: 'donor.hosp@example.com', med_name: 'Hepatitis B Vaccine 20mcg', batch_no: 'HEP-B-VAC', expiry_date: addDays(180),
      quantity: 15, unit: 'vials', packaging: 'sealed', storage: 'cold-chain',
      status: 'UNDER_REVIEW', safety_score: 92.0, trail_id: 'MED-TR-014'
    },
    // 15: MATCHED (Accepted request, awaiting handover QR scan)
    {
      donor_email: 'donor.pharma@example.com', med_name: 'Cefixime 200mg', batch_no: 'CEF-MATCH-8', expiry_date: addDays(140),
      quantity: 50, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'MATCHED', safety_score: 93.0, trail_id: 'MED-TR-015'
    },
    // 16: MATCHED (Vitamin D3 matched to Clinic)
    {
      donor_email: 'donor.dist@example.com', med_name: 'Vitamin D3 60,000 IU', batch_no: 'VIT-D3-MAT', expiry_date: addDays(200),
      quantity: 100, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'MATCHED', safety_score: 96.0, trail_id: 'MED-TR-016'
    },
    // 17: HANDED_OVER (QR scanned at clinic, awaiting final confirmation)
    {
      donor_email: 'donor.indiv@example.com', med_name: 'Telmisartan 40mg', batch_no: 'TEL-HND-99', expiry_date: addDays(160),
      quantity: 40, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'HANDED_OVER', safety_score: 90.0, trail_id: 'MED-TR-017'
    },
    // 18: COMPLETED (Successfully verified, handed over, confirmed)
    {
      donor_email: 'donor.pharma@example.com', med_name: 'Atorvastatin 10mg', batch_no: 'ATO-CMP-01', expiry_date: addDays(190),
      quantity: 75, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'COMPLETED', safety_score: 95.0, trail_id: 'MED-TR-018'
    },
    // 19: COMPLETED (Completed donation by hospital)
    {
      donor_email: 'donor.hosp@example.com', med_name: 'Doxycycline 100mg', batch_no: 'DOX-CMP-02', expiry_date: addDays(220),
      quantity: 60, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'COMPLETED', safety_score: 97.0, trail_id: 'MED-TR-019'
    },
    // 20: COMPLETED (Completed donation by distributor)
    {
      donor_email: 'donor.dist@example.com', med_name: 'Vitamin C 500mg (Chewable)', batch_no: 'VTC-CMP-03', expiry_date: addDays(300),
      quantity: 300, unit: 'bottles', packaging: 'sealed', storage: 'normal',
      status: 'COMPLETED', safety_score: 98.0, trail_id: 'MED-TR-020'
    },
    // 21: REJECTED (Failed verification - packaging suspect or damaged)
    {
      donor_email: 'donor.indiv2@example.com', med_name: 'Diclofenac Sodium 50mg', batch_no: 'DIC-REJ-91', expiry_date: addDays(180),
      quantity: 10, unit: 'strips', packaging: 'opened', storage: 'normal',
      status: 'REJECTED', safety_score: 30.0, trail_id: 'MED-TR-021'
    },
    // 22: REJECTED (Cold-chain breach documented by verifier)
    {
      donor_email: 'donor.indiv@example.com', med_name: 'Insulin Glargine 100IU/ml', batch_no: 'GLA-REJ-44', expiry_date: addDays(120),
      quantity: 5, unit: 'vials', packaging: 'sealed', storage: 'normal',
      status: 'REJECTED', safety_score: 35.0, trail_id: 'MED-TR-022'
    },
    // 23: EXPIRED (Auto-marked expired by system, transferred to disposal queue)
    {
      donor_email: 'donor.indiv@example.com', med_name: 'Rosuvastatin 20mg', batch_no: 'ROS-EXP-01', expiry_date: subDays(2),
      quantity: 25, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'EXPIRED', safety_score: 0.0, trail_id: 'MED-TR-023'
    },
    // 24: EXPIRED (Expired last week)
    {
      donor_email: 'donor.indiv2@example.com', med_name: 'Omeprazole 20mg', batch_no: 'OME-EXP-02', expiry_date: subDays(7),
      quantity: 15, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'EXPIRED', safety_score: 0.0, trail_id: 'MED-TR-024'
    },
    // 25: APPROVED - Levocetirizine (Expiring in 210 days)
    {
      donor_email: 'donor.pharma@example.com', med_name: 'Levocetirizine 5mg', batch_no: 'LEV-OK-25', expiry_date: addDays(210),
      quantity: 90, unit: 'strips', packaging: 'sealed', storage: 'normal',
      status: 'APPROVED', safety_score: 94.0, trail_id: 'MED-TR-025'
    }
  ];

  const donMap = {};
  for (const d of donations) {
    const createdAt = d.created_at || (d.expiry_date < addDays(0) ? subDays(180) : subDays(10));
    const res = db.run(
      `INSERT INTO donations (donor_id, medicine_id, batch_no, expiry_date, quantity, unit, packaging, storage_condition, status, safety_score, trail_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uMap[d.donor_email], mMap[d.med_name], d.batch_no, d.expiry_date, d.quantity, d.unit, d.packaging, d.storage, d.status, d.safety_score, d.trail_id, createdAt + ' 09:00:00']
    );
    donMap[d.trail_id] = res.lastInsertRowid;
  }

  console.log('[DB] Seeding verifications...');
  const verifications = [
    { trail_id: 'MED-TR-001', verifier_email: 'verifier1@medshare.org', decision: 'APPROVED', remarks: 'Sealed blister packs verified against batch APX-AMX-204. Clear expiry label.' },
    { trail_id: 'MED-TR-002', verifier_email: 'verifier2@medshare.org', decision: 'APPROVED', remarks: 'Intact original cartons. Safe shelf life.' },
    { trail_id: 'MED-TR-003', verifier_email: 'verifier1@medshare.org', decision: 'APPROVED', remarks: 'Near-expiry batch approved for priority redistribution to active clinics.' },
    { trail_id: 'MED-TR-004', verifier_email: 'verifier1@medshare.org', decision: 'APPROVED', remarks: 'Cold-chain integrity log verified by hospital records. Kept at 2-8°C.' },
    { trail_id: 'MED-TR-018', verifier_email: 'verifier2@medshare.org', decision: 'APPROVED', remarks: 'Verified standard packaging.' },
    { trail_id: 'MED-TR-019', verifier_email: 'verifier1@medshare.org', decision: 'APPROVED', remarks: 'Hospital stock verification passed.' },
    { trail_id: 'MED-TR-020', verifier_email: 'verifier2@medshare.org', decision: 'APPROVED', remarks: 'Distributor bulk seal intact.' },
    { trail_id: 'MED-TR-021', verifier_email: 'verifier1@medshare.org', decision: 'REJECTED', remarks: 'Pack opened with missing foil seals. Fails safety policy.' },
    { trail_id: 'MED-TR-022', verifier_email: 'verifier2@medshare.org', decision: 'REJECTED', remarks: 'Cold-chain insulin stored at room temperature by individual donor.' }
  ];

  for (const v of verifications) {
    db.run(
      `INSERT INTO verifications (donation_id, verifier_id, decision, remarks) VALUES (?, ?, ?, ?)`,
      [donMap[v.trail_id], uMap[v.verifier_email], v.decision, v.remarks]
    );
  }

  console.log('[DB] Seeding requests & handovers...');
  // Request 1: MATCHED for donation 15 (Cefixime)
  const req1 = db.run(
    `INSERT INTO requests (recipient_id, donation_id, quantity, status, match_score) VALUES (?, ?, ?, ?, ?)`,
    [uMap['recipient.sewa@example.com'], donMap['MED-TR-015'], 30, 'ACCEPTED', 88.5]
  );
  db.run(
    `INSERT INTO handovers (request_id, qr_scanned_at, confirmed_by_donor, confirmed_by_recipient) VALUES (?, ?, ?, ?)`,
    [req1.lastInsertRowid, null, 1, 0]
  );

  // Request 2: MATCHED for donation 16 (Vitamin D3)
  const req2 = db.run(
    `INSERT INTO requests (recipient_id, donation_id, quantity, status, match_score) VALUES (?, ?, ?, ?, ?)`,
    [uMap['recipient.clinic@example.com'], donMap['MED-TR-016'], 50, 'ACCEPTED', 92.0]
  );
  db.run(
    `INSERT INTO handovers (request_id, qr_scanned_at, confirmed_by_donor, confirmed_by_recipient) VALUES (?, ?, ?, ?)`,
    [req2.lastInsertRowid, null, 1, 0]
  );

  // Request 3: HANDED_OVER for donation 17 (Telmisartan)
  const req3 = db.run(
    `INSERT INTO requests (recipient_id, donation_id, quantity, status, match_score) VALUES (?, ?, ?, ?, ?)`,
    [uMap['recipient.hope@example.com'], donMap['MED-TR-017'], 40, 'ACCEPTED', 85.0]
  );
  db.run(
    `INSERT INTO handovers (request_id, qr_scanned_at, confirmed_by_donor, confirmed_by_recipient, completed_at) VALUES (?, ?, ?, ?, ?)`,
    [req3.lastInsertRowid, new Date().toISOString(), 1, 1, null]
  );

  // Request 4: COMPLETED for donation 18 (Atorvastatin)
  const req4 = db.run(
    `INSERT INTO requests (recipient_id, donation_id, quantity, status, match_score) VALUES (?, ?, ?, ?, ?)`,
    [uMap['recipient.sewa@example.com'], donMap['MED-TR-018'], 75, 'COMPLETED', 94.0]
  );
  db.run(
    `INSERT INTO handovers (request_id, qr_scanned_at, confirmed_by_donor, confirmed_by_recipient, completed_at) VALUES (?, ?, ?, ?, ?)`,
    [req4.lastInsertRowid, subDays(5) + 'T10:00:00.000Z', 1, 1, subDays(5) + 'T10:05:00.000Z']
  );

  // Request 5: PENDING request on approved donation 1 (Amoxicillin)
  db.run(
    `INSERT INTO requests (recipient_id, donation_id, quantity, status, match_score) VALUES (?, ?, ?, ?, ?)`,
    [uMap['recipient.clinic@example.com'], donMap['MED-TR-001'], 20, 'PENDING', 89.2]
  );

  console.log('[DB] Seeding urgent needs...');
  const urgentNeeds = [
    {
      recipient_email: 'recipient.sewa@example.com', med_name: 'Amoxicillin 500mg', quantity: 40, needed_by: addDays(7),
      lat: 19.0726, lng: 72.8845, status: 'OPEN'
    },
    {
      recipient_email: 'recipient.clinic@example.com', med_name: 'Human Insulin Regular 100IU/ml', quantity: 20, needed_by: addDays(5),
      lat: 19.0434, lng: 72.8550, status: 'OPEN'
    },
    {
      recipient_email: 'recipient.hope@example.com', med_name: 'Paracetamol 650mg', quantity: 100, needed_by: addDays(3),
      lat: 19.0400, lng: 72.8600, status: 'OPEN'
    },
    {
      recipient_email: 'recipient.relief@example.com', med_name: 'Salbutamol Inhaler 100mcg', quantity: 15, needed_by: addDays(10),
      lat: 19.0860, lng: 72.9090, status: 'OPEN'
    }
  ];

  for (const un of urgentNeeds) {
    db.run(
      `INSERT INTO urgent_needs (recipient_id, medicine_id, quantity, needed_by, lat, lng, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uMap[un.recipient_email], mMap[un.med_name], un.quantity, un.needed_by, un.lat, un.lng, un.status]
    );
  }

  console.log('[DB] Seeding personal inventory ("My Medicine Cabinet")...');
  const inventoryItems = [
    { owner_email: 'donor.indiv@example.com', medicine_name: 'Paracetamol 650mg', expiry_date: addDays(140), quantity: 3 },
    { owner_email: 'donor.indiv@example.com', medicine_name: 'Cetirizine 10mg', expiry_date: addDays(45), quantity: 2 },
    { owner_email: 'donor.indiv@example.com', medicine_name: 'Amoxicillin 500mg (Unused extra)', expiry_date: addDays(15), quantity: 1 },
    { owner_email: 'donor.indiv2@example.com', medicine_name: 'Pantoprazole 40mg', expiry_date: addDays(85), quantity: 4 },
    { owner_email: 'donor.indiv2@example.com', medicine_name: 'Oral Rehydration Salts', expiry_date: addDays(220), quantity: 6 },
    { owner_email: 'donor.indiv2@example.com', medicine_name: 'Cough Syrup Expectorant', expiry_date: subDays(10), quantity: 1 }
  ];

  const invMap = [];
  for (const inv of inventoryItems) {
    const res = db.run(
      `INSERT INTO inventory (owner_id, medicine_name, expiry_date, quantity) VALUES (?, ?, ?, ?)`,
      [uMap[inv.owner_email], inv.medicine_name, inv.expiry_date, inv.quantity]
    );
    invMap.push(res.lastInsertRowid);
  }

  console.log('[DB] Seeding disposal records...');
  db.run(
    `INSERT INTO disposal_records (source_type, source_id, reason, method, disposed_at) VALUES (?, ?, ?, ?, ?)`,
    ['donation', donMap['MED-TR-023'], 'Expired before matching', 'authorized_pharmacy_takeback', subDays(1) + 'T14:30:00.000Z']
  );
  db.run(
    `INSERT INTO disposal_records (source_type, source_id, reason, method, disposed_at) VALUES (?, ?, ?, ?, ?)`,
    ['inventory', invMap[5] || 1, 'Expired personal medication', 'chemical_inactivation', subDays(3) + 'T11:00:00.000Z']
  );

  console.log('[DB] Seeding audit events...');
  const auditEvents = [
    { type: 'donation', id: donMap['MED-TR-001'], action: 'LISTED', actor: uMap['donor.pharma@example.com'], meta: JSON.stringify({ batch: 'APX-AMX-204', quantity: 50 }) },
    { type: 'donation', id: donMap['MED-TR-001'], action: 'VERIFIED_APPROVED', actor: uMap['verifier1@medshare.org'], meta: JSON.stringify({ remarks: 'Packs sealed, verified' }) },
    { type: 'donation', id: donMap['MED-TR-018'], action: 'COMPLETED', actor: uMap['recipient.sewa@example.com'], meta: JSON.stringify({ qr_confirmed: true, recipient: 'Sewa Foundation' }) },
    { type: 'donation', id: donMap['MED-TR-021'], action: 'VERIFIED_REJECTED', actor: uMap['verifier1@medshare.org'], meta: JSON.stringify({ reason: 'Packaging opened' }) },
    { type: 'donation', id: donMap['MED-TR-023'], action: 'AUTO_EXPIRED', actor: null, meta: JSON.stringify({ system_cron: true, moved_to: 'disposal_records' }) }
  ];

  for (const ae of auditEvents) {
    db.run(
      `INSERT INTO audit_events (entity_type, entity_id, action, actor_id, metadata_json) VALUES (?, ?, ?, ?, ?)`,
      [ae.type, ae.id, ae.action, ae.actor, ae.meta]
    );
  }

  console.log('[DB] Seeding notifications...');
  const notifications = [
    { user_email: 'donor.indiv@example.com', type: 'EXPIRY_30', msg: 'Alert: Your medicine "Cetirizine 10mg" in your cabinet expires in 45 days. Consider donating now.' },
    { user_email: 'donor.indiv@example.com', type: 'EXPIRY_7', msg: 'Urgent: "Amoxicillin 500mg" in your cabinet expires in 15 days.' },
    { user_email: 'donor.pharma@example.com', type: 'URGENT_NEED_MATCH', msg: 'Asha Charitable Clinic needs Amoxicillin nearby! You have approved stock.' },
    { user_email: 'recipient.sewa@example.com', type: 'HANDOVER', msg: 'Handover complete for Atorvastatin 10mg (Batch ATO-CMP-01).' }
  ];

  for (const n of notifications) {
    db.run(
      `INSERT INTO notifications (user_id, type, message, read) VALUES (?, ?, ?, ?)`,
      [uMap[n.user_email], n.type, n.msg, 0]
    );
  }

  console.log('[DB] Seeding completed successfully!');
}

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
