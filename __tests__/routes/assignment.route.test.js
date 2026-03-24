import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import assignmentRoute from '../../src/routes/assignment.route.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import Class from '../../src/models/Class.js';
import Subject from '../../src/models/Subject.js';
import Assignment from '../../src/models/Assignment.js';
import jwt from 'jsonwebtoken';

describe('Assignment Routes', () => {
  let app;
  let lecturerToken;
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
    app.use('/assignments', assignmentRoute);

    institute = await Institute.create({
      name: 'Assignment Route Test Institute',
      address: '123 Assignment St',
      phoneNumber: '1234567890',
      targetLine: 'Assignment',
      admin: new mongoose.Types.ObjectId(),
    });

    lecturerUser = await User.create({
      fullName: 'Assignment Lecturer',
      email: 'assignment.lecturer@example.com',
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

    lecturerToken = jwt.sign(
      { id: lecturerUser._id, role: 'lecturer', institute: institute._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
  });

  afterAll(async () => {
    await User.deleteMany({ email: /assignment\./ });
    await Subject.deleteMany({ institute: institute._id });
    await Assignment.deleteMany({ institute: institute._id });
    await Class.deleteMany({ institute: institute._id });
    await Institute.deleteMany({ _id: institute._id });
    await mongoose.disconnect();
  });

  describe('POST /create-assignment', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/assignments/create-assignment')
        .send({
          title: 'New Assignment',
          subjectId: subject._id,
          dueDate: new Date(),
        });

      expect(res.status).toBe(401);
    });

    it('should create assignment with valid data', async () => {
      const res = await request(app)
        .post('/assignments/create-assignment')
        .set('authorization', `Bearer ${lecturerToken}`)
        .send({
          title: 'Assignment Route Test',
          description: 'Test description',
          subjectId: subject._id.toString(),
          dueDate: new Date(),
        });

      expect(400).toContain(res.status);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /assignments/subject/:subjectId', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get(`/assignments/subject/${subject._id}`);

      expect(res.status).toBe(401);
    });

    it('should return array of assignments', async () => {
      const res = await request(app)
        .get(`/assignments/subject/${subject._id}`)
        .set('authorization', `Bearer ${lecturerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
