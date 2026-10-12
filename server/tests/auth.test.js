const { test, describe } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

describe('Auth & RBAC Test Suite', () => {
  test('Healthcheck endpoint returns 200 and disclaimer', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(res.body.disclaimer.includes('MedShare'));
  });

  test('Valid login returns JWT and user profile', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'donor.pharma@example.com', password: 'Password123!' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.role, 'donor');
    assert.ok(res.body.user.reputation);
  });

  test('Invalid login returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'donor.pharma@example.com', password: 'WrongPassword' });
    assert.strictEqual(res.status, 401);
  });

  test('Registration of NGO recipient sets verified = 0 pending approval', async () => {
    const uniqueEmail = `ngo.test.${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Community Relief Care',
        email: uniqueEmail,
        password: 'Password123!',
        role: 'recipient',
        org_type: 'ngo',
        address: 'Worli, Mumbai'
      });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.user.verified, 0);
  });
});
