import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import authRoute from '../../src/routes/auth.route.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';

describe('Auth Routes', () => {
  let app;
  let institute;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    app = express();
    app.use(express.json());
    app.use('/auth', authRoute);

    institute = await Institute.create({
      name: 'Auth Route Test Institute',
      address: '123 Test St',
      phoneNumber: '1234567890',
      targetLine: 'Test',
      admin: new mongoose.Types.ObjectId(),
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /auth.route.test/ });
    await Institute.deleteMany({ _id: institute._id });
    await mongoose.disconnect();
  });

  describe('POST /auth/login', () => {
    it('should return 400 if email is invalid', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'not-an-email',
          password: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should login successfully with valid credentials', async () => {
      const user = await User.create({
        fullName: 'Auth Route Test User',
        email: 'auth.route.test@example.com',
        password: 'password123',
        role: 'student',
        institute: institute._id,
        approved: true,
      });

      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'auth.route.test@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    });
  });
});
