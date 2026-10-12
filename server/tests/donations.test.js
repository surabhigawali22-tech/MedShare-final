const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

describe('Donations & Verification Suite', () => {
  let pharmaToken;
  let indivToken;
  let verifierToken;

  before(async () => {
    const pharmaLogin = await request(app).post('/api/auth/login').send({ email: 'donor.pharma@example.com', password: 'Password123!' });
    pharmaToken = pharmaLogin.body.token;

    const indivLogin = await request(app).post('/api/auth/login').send({ email: 'donor.indiv@example.com', password: 'Password123!' });
    indivToken = indivLogin.body.token;

    const verifierLogin = await request(app).post('/api/auth/login').send({ email: 'verifier1@medshare.org', password: 'Password123!' });
    verifierToken = verifierLogin.body.token;
  });

  test('Medicines autocomplete search returns matching drugs', async () => {
    const res = await request(app).get('/api/medicines?search=Paracetamol');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.medicines.length > 0);
  });

  test('Auto-validation rejects past expiry date', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', 'Bearer ' + pharmaToken)
      .send({ medicine_id: 1, batch_no: 'EXP-TEST', expiry_date: '2023-01-01', quantity: 10, packaging: 'sealed' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('past'));
  });

  test('Auto-validation rejects remaining shelf life under 90 days', async () => {
    const in40Days = new Date(Date.now() + 40 * 86400000).toISOString().split('T')[0];
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', 'Bearer ' + pharmaToken)
      .send({ medicine_id: 1, batch_no: 'SHELFLIFE-40D', expiry_date: in40Days, quantity: 10, packaging: 'sealed' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('minimum required standard'));
  });

  test('Auto-validation rejects opened packaging', async () => {
    const in150Days = new Date(Date.now() + 150 * 86400000).toISOString().split('T')[0];
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', 'Bearer ' + pharmaToken)
      .send({ medicine_id: 1, batch_no: 'OPEN-TEST', expiry_date: in150Days, quantity: 10, packaging: 'opened' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('sealed'));
  });

  test('Auto-validation rejects individual donor for Rx / cold-chain insulin', async () => {
    const in180Days = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', 'Bearer ' + indivToken)
      .send({ medicine_id: 12, batch_no: 'INS-INDIV', expiry_date: in180Days, quantity: 5, packaging: 'sealed', storage_condition: 'cold-chain' });
    assert.strictEqual(res.status, 403);
    assert.ok(res.body.error.includes('verified institutional donors'));
  });

  test('Valid donation creation and verifier review flow', async () => {
    const in200Days = new Date(Date.now() + 200 * 86400000).toISOString().split('T')[0];
    const createRes = await request(app)
      .post('/api/donations')
      .set('Authorization', 'Bearer ' + pharmaToken)
      .send({ medicine_id: 1, batch_no: 'AUTO-BATCH-1', expiry_date: in200Days, quantity: 25, packaging: 'sealed', storage_condition: 'normal' });
    assert.strictEqual(createRes.status, 201);
    const donationId = createRes.body.donation.id;
    assert.strictEqual(createRes.body.donation.status, 'UNDER_REVIEW');

    // Verifier approves
    const verifyRes = await request(app)
      .post(`/api/verifications/${donationId}`)
      .set('Authorization', 'Bearer ' + verifierToken)
      .send({ decision: 'APPROVED', remarks: 'Batch seal and cold-chain compliance confirmed.' });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.body.status, 'APPROVED');
  });
});
