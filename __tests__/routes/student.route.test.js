import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import studentRoute from '../../src/routes/student.route.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import jwt from 'jsonwebtoken';

describe('Student Routes', () => {
  let app;
  let adminToken;
  let adminUser;
  let institute;
  let studentUser;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    app = express();
    app.use(express.json());
    app.use('/students', studentRoute);

    institute = await Institute.create({
      name: 'Student Route Test Institute',
      address: '123 Student St',
      phoneNumber: '1234567890',
      targetLine: 'Student',
      admin: new mongoose.Types.ObjectId(),
    });

    adminUser = await User.create({
      fullName: 'Student Admin',
      email: 'student.admin@example.com',
      password: 'password123',
      role: 'admin',
      institute: institute._id,
      approved: true,
    });

    studentUser = await User.create({
      fullName: 'Test Student',
      email: 'test.student@example.com',
      password: 'password123',
      role: 'student',
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
    await User.deleteMany({ email: /student\.(admin|route|test)/ });
    await Institute.deleteMany({ _id: institute._id });
    await mongoose.disconnect();
  });

  describe('GET /students', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/students');

      expect(res.status).toBe(401);
    });

    it('should return array of students', async () => {
      const res = await request(app)
        .get('/students')
        .set('authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /students/:id', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get(`/students/${studentUser._id}`);

      expect(res.status).toBe(401);
    });

    it('should return student by id', async () => {
      const res = await request(app)
        .get(`/students/${studentUser._id}`)
        .set('authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('email', 'test.student@example.com');
    });
  });
});
