import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import adminRoute from '../../src/routes/admin.route.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import jwt from 'jsonwebtoken';

describe('Admin Routes', () => {
  let app;
  let adminToken;
  let adminUser;
  let institute;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    app = express();
    app.use(express.json());
    app.use('/admin', adminRoute);

    institute = await Institute.create({
      name: 'Admin Route Test Institute',
      address: '123 Admin St',
      phoneNumber: '1234567890',
      targetLine: 'Admin',
      admin: new mongoose.Types.ObjectId(),
    });

    adminUser = await User.create({
      fullName: 'Admin Route Test',
      email: 'admin.route.test@example.com',
      password: 'password123',
      role: 'admin',
      institute: institute._id,
      approved: true,
    });

    adminToken = jwt.sign(
      { id: adminUser._id, role: 'admin', institute: institute._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
  });

  afterAll(async () => {
    await User.deleteMany({ email: /admin.route.test/ });
    await Institute.deleteMany({ _id: institute._id });
    await mongoose.disconnect();
  });

  describe('POST /admin/admin-request', () => {
    it('should return 400 if fullName is missing', async () => {
      const res = await request(app)
        .post('/admin/admin-request')
        .send({
          email: 'newemail@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(400);
    });

    it('should create admin signup request with valid data', async () => {
      const unique = Date.now();
      const res = await request(app)
        .post('/admin/admin-request')
        .send({
          fullName: 'New Admin',
          email: `admin.route.test+${unique}@example.com`,
          password: 'password123',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /admin/create-user', () => {
    it('should return 400 without authentication', async () => {
      const res = await request(app)
        .post('/admin/create-user')
        .send({
          fullName: 'New Student',
          email: 'student@example.com',
          role: 'student',
        });

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid role', async () => {
      const res = await request(app)
        .post('/admin/create-user')
        .set('authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'New User',
          email: 'newuser@example.com',
          role: 'invalid_role',
        });

      expect(res.status).toBe(400);
    });
  });
});
