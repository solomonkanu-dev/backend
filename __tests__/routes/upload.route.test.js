import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import uploadRoute from '../../src/routes/upload.route.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import jwt from 'jsonwebtoken';

describe('Upload Routes', () => {
  let app;
  let userToken;
  let user;
  let institute;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    app = express();
    app.use(express.json());
    app.use('/upload', uploadRoute);

    institute = await Institute.create({
      name: 'Upload Route Test Institute',
      address: '123 Upload St',
      phoneNumber: '1234567890',
      targetLine: 'Upload',
      admin: new mongoose.Types.ObjectId(),
    });

    user = await User.create({
      fullName: 'Upload Test User',
      email: 'upload.route.test@example.com',
      password: 'password123',
      role: 'student',
      institute: institute._id,
      approved: true,
    });

    userToken = jwt.sign(
      { id: user._id, role: 'student', institute: institute._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
  });

  afterAll(async () => {
    await User.deleteMany({ email: /upload\.route\.test/ });
    await Institute.deleteMany({ _id: institute._id });
    await mongoose.disconnect();
  });

  describe('POST /upload/profile-photo', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/upload/profile-photo')
        .attach('profilePhoto', Buffer.from('test'), 'test.jpg');

      expect(res.status).toBe(401);
    });

    it('should return 400 if no file provided', async () => {
      const res = await request(app)
        .post('/upload/profile-photo')
        .set('authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /upload/profile-photo', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/upload/profile-photo');

      expect(res.status).toBe(401);
    });

    it('should return 404 if user has no profile photo', async () => {
      const res = await request(app)
        .get('/upload/profile-photo')
        .set('authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });
  });
});
