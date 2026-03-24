import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, jest } from '@jest/globals';
import { getLecturers, getLecturerById } from '../../src/controllers/lecturer.controller.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import mongoose from 'mongoose';

describe('Lecturer Controller', () => {
  let mockReq;
  let mockRes;
  let institute;
  let lecturer1;
  let lecturer2;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    institute = await Institute.create({
      name: 'Lecturer Controller Institute',
      address: '456 Lecturer Lane',
      phoneNumber: '4564564560',
      targetLine: 'Teaching',
      admin: new mongoose.Types.ObjectId(),
    });
  });

  beforeEach(async () => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    lecturer1 = await User.create({
      fullName: 'Lecturer One',
      email: 'lecturer.one@example.com',
      password: 'password123',
      role: 'lecturer',
      institute: institute._id,
      approved: true,
    });

    lecturer2 = await User.create({
      fullName: 'Lecturer Two',
      email: 'lecturer.two@example.com',
      password: 'password123',
      role: 'lecturer',
      institute: institute._id,
      approved: true,
    });

    await User.create({
      fullName: 'Not A Lecturer',
      email: 'student@example.com',
      password: 'password123',
      role: 'student',
      institute: institute._id,
      approved: true,
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await Institute.deleteMany({});
    await mongoose.disconnect();
  });

  describe('GetLecturers', () => {
    it('should return all lecturers', async () => {
      mockReq = {};

      await getLecturers(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBe(2);
    });

    it('should only return users with lecturer role', async () => {
      mockReq = {};

      await getLecturers(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      const roles = responseData.map(user => user.role);
      expect(roles).toEqual(['lecturer', 'lecturer']);
    });

    it('should populate institute information', async () => {
      mockReq = {};

      await getLecturers(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData[0].institute).toBeDefined();
      expect(responseData[0].institute.name).toBe('Lecturer Controller Institute');
    });

    it('should return empty array if no lecturers', async () => {
      await User.deleteMany({ role: 'lecturer' });

      mockReq = {};

      await getLecturers(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData).toEqual([]);
    });
  });

  describe('GetLecturerById', () => {
    it('should return lecturer by ID', async () => {
      mockReq = {
        params: {
          id: lecturer1._id.toString(),
        },
      };

      await getLecturerById(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.fullName).toBe('Lecturer One');
      expect(responseData.email).toBe('lecturer.one@example.com');
      expect(responseData.role).toBe('lecturer');
    });

    it('should populate institute for lecturer', async () => {
      mockReq = {
        params: {
          id: lecturer1._id.toString(),
        },
      };

      await getLecturerById(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.fullName).toBe('Lecturer One');
      expect(responseData.role).toBe('lecturer');
    });

    it('should return 404 for non-existent lecturer', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      mockReq = {
        params: {
          id: fakeId.toString(),
        },
      };

      await getLecturerById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Lecturer not found',
      });
    });

    it('should return 404 if user is not a lecturer', async () => {
      const student = await User.findOne({ role: 'student' });

      mockReq = {
        params: {
          id: student._id.toString(),
        },
      };

      await getLecturerById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Lecturer not found',
      });
    });
  });
});
