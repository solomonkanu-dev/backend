import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import submissionRoute from '../../src/routes/submission.route.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import Class from '../../src/models/Class.js';
import Subject from '../../src/models/Subject.js';
import Assignment from '../../src/models/Assignment.js';
import Submission from '../../src/models/Submission.js';
import jwt from 'jsonwebtoken';

describe('Submission Routes', () => {
  let app;
  let studentToken;
  let lecturerToken;
  let studentUser;
  let lecturerUser;
  let institute;
  let assignment;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    app = express();
    app.use(express.json());
    app.use('/submissions', submissionRoute);

    institute = await Institute.create({
      name: 'Submission Route Test Institute',
      address: '123 Submission St',
      phoneNumber: '1234567890',
      targetLine: 'Submission',
      admin: new mongoose.Types.ObjectId(),
    });

    studentUser = await User.create({
      fullName: 'Submission Student',
      email: 'submission.student@example.com',
      password: 'password123',
      role: 'student',
      institute: institute._id,
      approved: true,
    });

    lecturerUser = await User.create({
      fullName: 'Submission Lecturer',
      email: 'submission.lecturer@example.com',
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

    const subject = await Subject.create({
      name: 'Test Subject',
      code: 'TS-001',
      class: classDoc._id,
      lecturer: lecturerUser._id,
      institute: institute._id,
    });

    assignment = await Assignment.create({
      title: 'Test Assignment',
      subject: subject._id,
      lecturer: lecturerUser._id,
      institute: institute._id,
      dueDate: new Date(),
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
    await User.deleteMany({ email: /submission\./ });
    await Subject.deleteMany({ institute: institute._id });
    await Assignment.deleteMany({ institute: institute._id });
    await Submission.deleteMany({ institute: institute._id });
    await Class.deleteMany({ institute: institute._id });
    await Institute.deleteMany({ _id: institute._id });
    await mongoose.disconnect();
  });

  describe('POST /submissions', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/submissions')
        .send({
          assignmentId: assignment._id,
          fileUrl: 'https://example.com/file.pdf',
        });

      expect(res.status).toBe(401);
    });

    it('should create submission with valid data', async () => {
      const res = await request(app)
        .post('/submissions')
        .set('authorization', `Bearer ${studentToken}`)
        .send({
          assignmentId: assignment._id.toString(),
          fileUrl: 'https://example.com/file.pdf',
        });

      expect([200, 201]).toContain(res.status);
    });
  });

  describe('GET /submissions/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/submissions/me');

      expect(res.status).toBe(401);
    });

    it('should return user submissions', async () => {
      const res = await request(app)
        .get('/submissions/me')
        .set('authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /submissions/assignment/:assignmentId', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get(`/submissions/assignment/${assignment._id}`);

      expect(res.status).toBe(401);
    });

    it('should return submissions for assignment', async () => {
      const res = await request(app)
        .get(`/submissions/assignment/${assignment._id}`)
        .set('authorization', `Bearer ${lecturerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
