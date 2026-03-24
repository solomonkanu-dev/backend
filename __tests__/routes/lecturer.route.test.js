import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import lecturerRoute from '../../src/routes/lecturer.route.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import jwt from 'jsonwebtoken';

describe('Lecturer Routes', () => {
  let app;
  let adminToken;
  let adminUser;
  let institute;
  let lecturerUser;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    app = express();
    app.use(express.json());
    app.use('/lecturers', lecturerRoute);

    institute = await Institute.create({
      name: 'Lecturer Route Test Institute',
      address: '123 Lecturer St',
      phoneNumber: '1234567890',
      targetLine: 'Lecturer',
      admin: new mongoose.Types.ObjectId(),
    });

    adminUser = await User.create({
      fullName: 'Lecturer Admin',
      email: 'lecturer.admin@example.com',
      password: 'password123',
      role: 'admin',
      institute: institute._id,
      approved: true,
    });

    lecturerUser = await User.create({
      fullName: 'Test Lecturer',
      email: 'test.lecturer@example.com',
      password: 'password123',
      role: 'lecturer',
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
    await User.deleteMany({ email: /lecturer\.(admin|route|test)/ });
    await Institute.deleteMany({ _id: institute._id });
    await mongoose.disconnect();
  });

  describe('GET /lecturers/employee', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/lecturers/employee');

      expect(res.status).toBe(401);
    });

    it('should return array of lecturers', async () => {
      const res = await request(app)
        .get('/lecturers/employee')
        .set('authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /lecturers/:id', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get(`/lecturers/${lecturerUser._id}`);

      expect(res.status).toBe(401);
    });

    it('should return lecturer by id', async () => {
      const res = await request(app)
        .get(`/lecturers/${lecturerUser._id}`)
        .set('authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('email', 'test.lecturer@example.com');
    });
  });
});
