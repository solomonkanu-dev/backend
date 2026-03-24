import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import subjectRoute from '../../src/routes/subject.route.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import Class from '../../src/models/Class.js';
import Subject from '../../src/models/Subject.js';
import jwt from 'jsonwebtoken';

describe('Subject Routes', () => {
  let app;
  let adminToken;
  let lecturerToken;
  let adminUser;
  let lecturerUser;
  let institute;
  let classDoc;
  let subject;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    app = express();
    app.use(express.json());
    app.use('/subjects', subjectRoute);

    institute = await Institute.create({
      name: 'Subject Route Test Institute',
      address: '123 Subject St',
      phoneNumber: '1234567890',
      targetLine: 'Subject',
      admin: new mongoose.Types.ObjectId(),
    });

    adminUser = await User.create({
      fullName: 'Subject Admin',
      email: 'subject.admin@example.com',
      password: 'password123',
      role: 'admin',
      institute: institute._id,
      approved: true,
    });

    lecturerUser = await User.create({
      fullName: 'Subject Lecturer',
      email: 'subject.lecturer@example.com',
      password: 'password123',
      role: 'lecturer',
      institute: institute._id,
      approved: true,
    });

    classDoc = await Class.create({
      name: 'Test Class',
      code: 'TC-001',
      institute: institute._id,
      lecturer: lecturerUser._id,
    });

    subject = await Subject.create({
      name: 'Test Subject',
      code: 'TS-001',
      class: classDoc._id,
      lecturer: lecturerUser._id,
      institute: institute._id,
    });

    adminToken = jwt.sign(
      { id: adminUser._id, role: 'admin', institute: institute._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    lecturerToken = jwt.sign(
      { id: lecturerUser._id, role: 'lecturer', class: classDoc._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
  });

  afterAll(async () => {
    await User.deleteMany({ email: /subject\./ });
    await Subject.deleteMany({ institute: institute._id });
    if (classDoc) await Class.deleteMany({ _id: classDoc._id });
    await Institute.deleteMany({ _id: institute._id });
    await mongoose.disconnect();
  });

  describe('POST /subjects', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/subjects')
        .send({
          name: 'New Subject',
          classId: classDoc._id,
          lecturerId: lecturerUser._id,
        });

      expect(res.status).toBe(401);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/subjects')
        .set('authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should create subject with valid data', async () => {
      const res = await request(app)
        .post('/subjects')
        .set('authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Subject Test',
          code: 'NST-001',
          classId: classDoc._id,
          lecturerId: lecturerUser._id,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /subjects', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/subjects');

      expect(res.status).toBe(401);
    });

    it('should return array of subjects', async () => {
      const res = await request(app)
        .get('/subjects')
        .set('authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /subjects/:id', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get(`/subjects/${subject._id}`);

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid id', async () => {
      const res = await request(app)
        .get('/subjects/invalid-id')
        .set('authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('should return subject by id', async () => {
      const res = await request(app)
        .get(`/subjects/${subject._id}`)
        .set('authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /subjects/lecturer', () => {
    it('should return lecturer subjects', async () => {
      const res = await request(app)
        .get('/subjects/lecturer')
        .set('authorization', `Bearer ${lecturerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
