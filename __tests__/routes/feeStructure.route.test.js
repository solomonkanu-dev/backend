import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import feeRoute from '../../src/routes/feeStructure.route.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import FeeStructure from '../../src/models/FeeStructure.js';
import jwt from 'jsonwebtoken';

describe('FeeStructure Routes', () => {
  let app;
  let adminUser;
  let adminToken;
  let institute;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    app = express();
    app.use(express.json());
    app.use('/fees', feeRoute);

    institute = await Institute.create({ name: 'FR Institute', address: 'x', phoneNumber: 'x', targetLine: 'x', admin: new mongoose.Types.ObjectId() });

    adminUser = await User.create({ fullName: 'Fees Route Admin', email: `fees.route.admin.${Date.now()}@example.com`, password: 'password', role: 'admin', institute: institute._id, approved: true });

    adminToken = jwt.sign({ id: adminUser._id, role: 'admin', institute: institute._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  });

  afterEach(async () => {
    await FeeStructure.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Institute.deleteMany({});
    await mongoose.disconnect();
  });

  it('rejects unauthenticated POST', async () => {
    const res = await request(app).post('/fees').send({});
    expect(res.status).toBe(401);
  });

  it('creates fee structure via POST with admin token', async () => {
    const payload = { category: 'all', particulars: [{ label: 'A', amount: 10 }] };
    const res = await request(app).post('/fees').set('authorization', `Bearer ${adminToken}`).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('lists fee structures via GET', async () => {
    await FeeStructure.create({ category: 'all', particulars: [{ label: 'A', amount: 10 }], totalAmount: 10, instituteId: institute._id });
    const res = await request(app).get('/fees').set('authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
