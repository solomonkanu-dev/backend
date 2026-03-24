import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import classRoute from '../../src/routes/class.route.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import Class from '../../src/models/Class.js';
import jwt from 'jsonwebtoken';

describe('Class Routes', () => {
  let app;
  let adminToken;
  let adminUser;
  let lecturerUser;
  let institute;
  let classDoc;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    app = express();
    app.use(express.json());
    app.use('/classes', classRoute);

    institute = await Institute.create({
      name: 'Class Route Test Institute',
      address: '123 Class St',
      phoneNumber: '1234567890',
      targetLine: 'Class',
      admin: new mongoose.Types.ObjectId(),
    });

    adminUser = await User.create({
      fullName: 'Class Admin',
      email: 'class.admin@example.com',
      password: 'password123',
      role: 'admin',
      institute: institute._id,
      approved: true,
    });

    lecturerUser = await User.create({
      fullName: 'Class Lecturer',
      email: 'class.lecturer@example.com',
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

    classDoc = await Class.create({
      name: 'Test Class',
      code: 'TC-001',
      institute: institute._id,
      lecturer: lecturerUser._id,
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /class\.(admin|lecturer|route)/ });
    await Class.deleteMany({ institute: institute._id });
    await Institute.deleteMany({ _id: institute._id });
    await mongoose.disconnect();
  });

  describe('POST /classes', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/classes')
        .send({
          name: 'New Class',
          code: 'NC-001',
        });

      expect(res.status).toBe(401);
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/classes')
        .set('authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TC-002',
          lecturerId: lecturerUser._id,
        });

      expect(res.status).toBe(400);
    });

    it('should create class with valid data', async () => {
      const res = await request(app)
        .post('/classes')
        .set('authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Class Route Test Class',
          code: 'CRTT-001',
          lecturerId: lecturerUser._id,
        });

      expect([201, 200]).toContain(res.status);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /classes', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/classes');

      expect(res.status).toBe(401);
    });

    it('should return array of classes', async () => {
      const res = await request(app)
        .get('/classes')
        .set('authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /classes/:id', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get(`/classes/${classDoc._id}`);

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid id', async () => {
      const res = await request(app)
        .get('/classes/invalid-id')
        .set('authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('should return class by id', async () => {
      const res = await request(app)
        .get(`/classes/${classDoc._id}`)
        .set('authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });
});
