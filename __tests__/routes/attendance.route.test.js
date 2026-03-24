import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import attendanceRoute from '../../src/routes/attendance.route.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import Class from '../../src/models/Class.js';
import Subject from '../../src/models/Subject.js';
import Attendance from '../../src/models/Attendance.js';
import jwt from 'jsonwebtoken';

describe('Attendance Routes', () => {
  let app;
  let studentToken;
  let lecturerToken;
  let studentUser;
  let lecturerUser;
  let institute;
  let subject;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    app = express();
    app.use(express.json());
    app.use('/attendance', attendanceRoute);

    institute = await Institute.create({
      name: 'Attendance Route Test Institute',
      address: '123 Attendance St',
      phoneNumber: '1234567890',
      targetLine: 'Attendance',
      admin: new mongoose.Types.ObjectId(),
    });

    studentUser = await User.create({
      fullName: 'Attendance Student',
      email: 'attendance.student@example.com',
      password: 'password123',
      role: 'student',
      institute: institute._id,
      approved: true,
    });

    lecturerUser = await User.create({
      fullName: 'Attendance Lecturer',
      email: 'attendance.lecturer@example.com',
      password: 'password123',
      role: 'lecturer',
      institute: institute._id,
      approved: true,
    });

    const classDoc = await Class.create({
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

    studentToken = jwt.sign(
      { id: studentUser._id, role: 'student', institute: institute._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    lecturerToken = jwt.sign(
      { id: lecturerUser._id, role: 'lecturer', institute: institute._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
  });

  afterAll(async () => {
    await User.deleteMany({ email: /attendance\./ });
    await Subject.deleteMany({ institute: institute._id });
    await Class.deleteMany({ institute: institute._id });
    await Attendance.deleteMany({ institute: institute._id });
    await Institute.deleteMany({ _id: institute._id });
    await mongoose.disconnect();
  });

  describe('POST /attendance', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/attendance')
        .send({
          subjectId: subject._id,
          date: new Date(),
          records: [],
        });

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-lecturer', async () => {
      const res = await request(app)
        .post('/attendance')
        .set('authorization', `Bearer ${studentToken}`)
        .send({
          subjectId: subject._id,
          date: new Date(),
          records: [],
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /attendance/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/attendance/me');

      expect(res.status).toBe(401);
    });

    it('should return student attendance', async () => {
      const res = await request(app)
        .get('/attendance/me')
        .set('authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /attendance/subject', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/attendance/subject');

      expect(res.status).toBe(401);
    });

    it('should return subject attendance', async () => {
      const res = await request(app)
        .get('/attendance/subject')
        .set('authorization', `Bearer ${lecturerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
