import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import superAdminRoute from '../../src/routes/superAdmin.route.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import jwt from 'jsonwebtoken';

describe('SuperAdmin Routes', () => {
  let app;
  let superAdminToken;
  let superAdminUser;
  let pendingAdminUser;
  let institute;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    app = express();
    app.use(express.json());
    app.use('/superadmin', superAdminRoute);

    institute = await Institute.create({
      name: 'SuperAdmin Route Test Institute',
      address: '123 SuperAdmin St',
      phoneNumber: '1234567890',
      targetLine: 'SuperAdmin',
      admin: new mongoose.Types.ObjectId(),
    });

    superAdminUser = await User.create({
      fullName: 'Super Admin User',
      email: 'superadmin.route.test@example.com',
      password: 'password123',
      role: 'super_admin',
      approved: true,
    });

    pendingAdminUser = await User.create({
      fullName: 'Pending Admin',
      email: 'pending.admin@example.com',
      password: 'password123',
      role: 'admin',
      approved: false,
    });

    superAdminToken = jwt.sign(
      { id: superAdminUser._id, role: 'super_admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
  });

  afterAll(async () => {
    await User.deleteMany({ email: /superadmin|pending\.admin/ });
    await Institute.deleteMany({ _id: institute._id });
    await mongoose.disconnect();
  });

  describe('POST /superadmin/super-admin/login', () => {
    it('should return 400 if email is invalid', async () => {
      const res = await request(app)
        .post('/superadmin/super-admin/login')
        .send({
          email: 'not-an-email',
          password: 'password123',
        });

      expect(res.status).toBe(400);
    });

    it('should return 401 for unknown user', async () => {
      const res = await request(app)
        .post('/superadmin/super-admin/login')
        .send({
          email: 'unknown@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
    });

    it('should login super admin successfully', async () => {
      const res = await request(app)
        .post('/superadmin/super-admin/login')
        .send({
          email: 'superadmin.route.test@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });
  });

  describe('GET /superadmin/pending-admins', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/superadmin/pending-admins');

      expect(res.status).toBe(401);
    });

    it('should return pending admins', async () => {
      const res = await request(app)
        .get('/superadmin/pending-admins')
        .set('authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('GET /superadmin/stats', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/superadmin/stats');

      expect(res.status).toBe(401);
    });

    it('should return system stats', async () => {
      const res = await request(app)
        .get('/superadmin/stats')
        .set('authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('PATCH /superadmin/approve-admin/:adminId', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .patch(`/superadmin/approve-admin/${pendingAdminUser._id}`);

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid id', async () => {
      const res = await request(app)
        .patch('/superadmin/approve-admin/invalid-id')
        .set('authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
    });

    it('should approve admin with valid id', async () => {
      const res = await request(app)
        .patch(`/superadmin/approve-admin/${pendingAdminUser._id}`)
        .set('authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
    });
  });
});
