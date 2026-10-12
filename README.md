# MedShare – Medicine Donation & Expiry Management Platform

> **Healthcare Regulatory Disclaimer**:  
> MedShare is a digital coordination and redistribution platform designed to eliminate pharmaceutical waste and assist charitable clinics, registered NGOs, and underserved patients. MedShare facilitates verified logistics and safety tracking; it **does not** replace statutory pharmacist dispensing oversight, physician prescription mandates, or government regulatory procedures (e.g., CDSCO, Bio-Medical Waste Management Rules).

---

## 📋 Executive Overview

Every year, millions worth of valid, unexpired medicines are discarded while low-income patients and charitable dispensaries face severe shortages. **MedShare** bridges this divide through two core operational pillars:

1. **Pillar A: Medicine DONATION**  
   `List → Pharmacist Verify → Shelf-Life Match → Request Allocation → QR Handover → Completed`
2. **Pillar B: EXPIRY MANAGEMENT**  
   `Validation Safeguards → Automated Advance Alerts (90d, 30d, 7d) → Pre-Expiry Redistribution → Regulated Disposal Queue`

---

## 🛠️ Tech Stack

- **Frontend**: React 19 (Vite) + React Router + Tailwind CSS (Responsive, mobile-first design).
- **Icons & Effects**: Lucide React + Canvas Confetti.
- **Internationalization**: `i18next` + `react-i18next` (English, हिन्दी Hindi, मराठी Marathi).
- **Mapping & Heatmaps**: Leaflet + OpenStreetMap (No paid API keys required).
- **QR Engine**: `qrcode` (SVG/Canvas generation) + `html5-qrcode` (Live camera scanner with manual fallback).
- **Backend**: Node.js + Express REST API.
- **Authentication & RBAC**: JWT (JSON Web Tokens), `bcryptjs` password hashing, multi-tier Role-Based Access Control middleware.
- **Data Validation**: Zod schema validation middleware.
- **File Uploads**: `multer` storing packaging and batch verification images locally in `/uploads`.
- **Database**: SQLite (via `better-sqlite3`) with full PostgreSQL parity (`schema.sql` and `seed.sql`).
- **Scheduler**: `node-cron` daily automated midnight expiry scan and alerting engine.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation & Running

You can run the project from either the root folder or the `Medshare-main` subfolder:

```bash
# 1. Navigate to the project folder
cd Medshare-main

# 2. Install dependencies for root, server, and client
npm install
npm --prefix server install
npm --prefix client install

# 3. Seed database (generates 30 medicines, 25 donations, users, requests, urgent needs, audits)
npm run seed

# 4. Start both Backend and Frontend concurrently
npm run dev
```

- **Frontend UI**: [http://localhost:5173](http://localhost:5173)  
- **Backend REST API**: [http://localhost:5000](http://localhost:5000)  
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)  
- **Sample Public Batch Trail**: [http://localhost:5173](http://localhost:5173) (Click Batch Trail `MED-TR-001`)

---

## 🔑 Demo Credentials

All seeded demo accounts are pre-configured with the standard password: `Password123!`

| Role | Account Email | Organisation / Entity | Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@medshare.org` | MedShare Central HQ | Manage users, approve NGOs, adjust safety rules, audit logs, demand heatmap |
| **Verifier** | `verifier1@medshare.org` | Dr. Aditi Sharma (Chief Pharmacist) | Review queue, check packaging & storage, clinical approve/reject |
| **Verifier** | `verifier2@medshare.org` | Dr. Rajesh Mehta (Clinical Pharmacist)| Pharmacist verification queue |
| **Donor (Pharma)** | `donor.pharma@example.com` | Apex Care Pharmacy | List surplus, cold-chain/Rx donations, accept requests, display QR |
| **Donor (Hospital)** | `donor.hosp@example.com` | Lifeline Multi-Specialty Hospital | Cold-chain, insulin, vaccines, large institutional donations |
| **Donor (Distributor)**| `donor.dist@example.com` | MediSupply Global Logistics | Bulk medicines, pallet lot tracking |
| **Donor (Individual)** | `donor.indiv@example.com` | Rahul Verma | Household sealed medicines, Medicine Cabinet |
| **Recipient (NGO)** | `recipient.sewa@example.com` | Sewa Community Health Foundation | Browse surplus, request stock, post urgent needs, scan QR handover |
| **Recipient (Clinic)** | `recipient.clinic@example.com`| Asha Charitable Clinic | Browse surplus, request stock, post urgent needs, scan QR handover |
| **Recipient (Patient)**| `recipient.indiv@example.com` | Amit Kumar | Individual low-income patient requests |

*Note: In the web interface, you can quickly switch between any of these personas instantly via the Profile Dropdown in the header.*

---

## 🌟 Unique Core Features

### 1. Shelf-Life Match Engine (AI Scoring Formula)
Instead of first-come first-served waste, MedShare uses a multi-factor recommendation algorithm (`GET /api/donations/:id/matches`) to rank recipients:

$$\text{Match Score} = 0.45 \times \text{Usability} + 0.30 \times \text{Proximity} + 0.15 \times \text{Urgency} + 0.10 \times \text{Trust}$$

- **Usability (45%)**: Computes whether the recipient's daily usage rate can absorb the quantity before the expiration date:
  $$\text{expectedUseDays} = \frac{\text{quantity}}{\text{recipient\_avg\_daily\_demand}}$$
  $$\text{Usability Score} = \text{clamp}\left(100 \times \frac{\text{daysLeft} - \text{expectedUseDays}}{\text{daysLeft}}, 0, 100\right)$$
  *(If $\text{expectedUseDays} > \text{daysLeft}$, the item is flagged "likely to expire unused" and scores 0).*
- **Proximity (30%)**: Calculated with the Haversine formula (100 at 0 km, linearly decreasing to 0 at `MAX_RADIUS_KM` = 50 km).
- **Urgency (15%)**: 100 if the recipient has an open urgent need for that specific medicine, else 0.
- **Trust (10%)**: Calculated from admin verification status and past handover completion rate.
- **Explainable UI**: Donors and Verifiers see a complete visual breakdown for every component.

### 2. Batch Trail with QR & Tamper-Evident Handover
- Every approved medicine batch receives an immutable Batch Trail ID (e.g., `MED-TR-001`).
- **Public Timeline** (`/api/trail/:trailId` and public UI): Shows timeline from submission, clinical verification (by pharmacist name and timestamp), matching, and handover completion.
- **QR Handover Gate**: Physical transfer requires the recipient to scan the donor's dynamically generated QR code (or enter the Trail ID). Handover confirmation via QR is the **only** way to mark a donation `COMPLETED`, preventing double-claiming and inventory leakage.
- **Append-Only Audit Ledger**: All actions log immutably to `audit_events`.

### 3. Impact & Reputation Score
- Donors earn reputation points **strictly** upon verified, completed handovers:
  - Base: 50 points
  - Near-expiry rescue bonus (shelf life $\le 120$ days): +25 points
  - Urgent need fulfillment bonus: +25 points
- **Tiers & Badges**: Bronze, Silver, Gold, Platinum.
- **Personal Impact Dashboard**: Real-time counter of medicines donated, units, estimated economic value saved (₹), organisations helped, and environmental pharmaceutical waste diverted (kg).
- **Public Leaderboard**: Top donors and institutional champions.

### 4. Safety Score (0–100) on Every Listing
A multi-parameter rating computed dynamically from:
- Remaining Shelf Life (max 35 pts)
- Original Factory Packaging Seal (max 30 pts)
- Storage Integrity & Cold-Chain Certification (max 20 pts)
- Donor Past Reliability & Inspection Record (max 15 pts)
- Pharmacist Verification Endorsement (+5 bonus)

---

## 🛡️ Extra Features

- **Demand-Gap Geospatial Map**: Leaflet OpenStreetMap layer comparing open emergency needs (red circles) vs active surplus pools (green circles) across geographic areas.
- **Pre-Expiry Redistribution ("NEAR-EXPIRY RESCUE")**: Listings with $\le 60$ days remaining are highlighted and filterable for priority rescue dispatch.
- **"My Medicine Cabinet"**: Household inventory tracking with color-coded alerts (Green $>90$d, Amber $30-90$d, Red $<30$d) and a one-click **"Donate this Medicine"** button that pre-fills the donation form.
- **Disposal Queue**: Expired medications are automatically moved to a regulated disposal queue with statutory bio-medical waste instructions and a compliance log.
- **Multilingual Support**: Switch seamlessly between English, हिन्दी (Hindi), and मराठी (Marathi) via the globe menu.
- **In-App Notification Centre**: Live alerts with unread counter for verifications, match acceptances, and expiry alerts.
- **Dark Mode**: High-contrast, healthcare-tailored dark mode toggle with local storage persistence.

---

## 🧪 Automated Test Suite

MedShare includes a comprehensive test suite covering core safety algorithms, state machine logic, and end-to-end flows:

```bash
# Run all server test suites
npm --prefix Medshare-main/server test
```

### Tests Included:
1. `tests/expiryValidation.test.js`: Past expiry rejection, 90-day minimum shelf life enforcement, custom threshold configuration.
2. `tests/matchEngine.test.js`: Haversine distance, usability score formulas, proximity scaling, urgency bonuses, multi-factor weighting.
3. `tests/safetyScore.test.js`: Opened packaging penalty, cold-chain compliance, donor rejection history, pharmacist approval bonus.
4. `tests/stateMachine.test.js`: State transition validation (`LISTED` → `UNDER_REVIEW` → `APPROVED` → `MATCHED` → `HANDED_OVER` → `COMPLETED`), double-claiming prevention.
5. `tests/e2e.test.js`: Full happy-path lifecycle from donation listing to pharmacist review, match ranking, request acceptance, QR handover, points award, and public ledger validation.

---

## 📐 REST API Reference

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user / institution |
| `POST` | `/api/auth/login` | Public | Sign in and receive JWT token |
| `GET` | `/api/auth/me` | Authenticated | Get current authenticated profile |
| `GET` | `/api/medicines` | Public | Autocomplete and search approved medicines catalog |
| `GET` | `/api/donations` | Public | Browse approved surplus listings with filters |
| `POST` | `/api/donations` | Donor, Admin | Create donation listing with packaging photo |
| `GET` | `/api/donations/my` | Donor, Admin | View donor's listings and timeline progress |
| `GET` | `/api/donations/:id/matches` | Public / Auth | Shelf-Life Match Engine ranked recipients |
| `GET` | `/api/verifications/queue`| Verifier, Admin | Pharmacist clinical inspection queue |
| `POST` | `/api/verifications/:id` | Verifier, Admin | Approve or reject donation with clinical remarks |
| `POST` | `/api/requests` | Recipient, Admin| Request stock allocation |
| `POST` | `/api/requests/:id/respond`| Donor, Admin | Accept or decline request |
| `GET` | `/api/handovers/:requestId`| Donor, Recipient| Retrieve handover session and QR code |
| `POST` | `/api/handovers/scan` | Recipient, Admin| Scan QR code to complete transfer & award points |
| `GET` | `/api/trail/:trailId` | **Public** | Public Batch Trail ledger & timeline |
| `GET` | `/api/inventory` | Authenticated | "My Medicine Cabinet" user inventory |
| `POST` | `/api/inventory` | Authenticated | Add medicine to personal cabinet |
| `GET` | `/api/disposal` | Public / Auth | Disposal queue & bio-medical waste guidelines |
| `POST` | `/api/disposal/log` | Authenticated | Log safe disposal method and date |
| `GET` | `/api/urgent-needs` | Public | List open emergency medicine needs |
| `POST` | `/api/urgent-needs` | Recipient, Admin| Post urgent medicine need & alert donors |
| `GET` | `/api/impact/me` | Authenticated | Personal impact metrics & points |
| `GET` | `/api/impact/leaderboard` | Public | Public donor reputation leaderboard |
| `GET` | `/api/admin/users` | Admin | Manage users and approve NGOs/clinics |
| `PATCH`| `/api/admin/users/:id/verify`| Admin | Verify or revoke institution |
| `GET` | `/api/admin/settings` | Admin | Retrieve system settings |
| `PUT` | `/api/admin/settings` | Admin | Update system parameters |
| `GET` | `/api/admin/heatmap` | Admin | Geospatial demand-gap data |
| `GET` | `/api/admin/reports` | Admin | Overall lifecycle analytics & audit events |

---

## 📄 License & Regulatory Note

Developed for public good under the MIT License. Built with React, Tailwind CSS, Express, SQLite/PostgreSQL, Leaflet, and Node.js.
