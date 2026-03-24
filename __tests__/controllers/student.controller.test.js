import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, jest } from '@jest/globals';
import { getStudents, getStudentById } from '../../src/controllers/student.controller.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import mongoose from 'mongoose';

describe('Student Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let institute;
  let student1;
  let student2;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    institute = await Institute.create({
      name: 'Student Controller Institute',
      address: '321 Student Way',
      phoneNumber: '3213213210',
      targetLine: 'Learning',
      admin: new mongoose.Types.ObjectId(),
    });
  });

  beforeEach(async () => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    student1 = await User.create({
      fullName: 'Student One',
      email: 'student.one@example.com',
      password: 'password123',
      role: 'student',
      institute: institute._id,
      approved: true,
    });

    student2 = await User.create({
      fullName: 'Student Two',
      email: 'student.two@example.com',
      password: 'password123',
      role: 'student',
      institute: institute._id,
      approved: true,
    });

    await User.create({
      fullName: 'Not A Student',
      email: 'lecturer@example.com',
      password: 'password123',
      role: 'lecturer',
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

  describe('GetStudents', () => {
    it('should return all students', async () => {
      mockReq = {};

      await getStudents(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBe(2);
    });

    it('should not return non-student users', async () => {
      mockReq = {};

      await getStudents(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      const roles = responseData.map(user => user.role);
      expect(roles).toEqual(['student', 'student']);
    });

    it('should populate institute information', async () => {
      mockReq = {};

      await getStudents(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData[0].institute).toBeDefined();
      expect(responseData[0].institute.name).toBe('Student Controller Institute');
    });

    it('should return empty array if no students', async () => {
      await User.deleteMany({ role: 'student' });

      mockReq = {};

      await getStudents(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData).toEqual([]);
    });
  });

  describe('GetStudentById', () => {
    it('should return student by ID', async () => {
      mockReq = {
        params: {
          id: student1._id.toString(),
        },
      };

      await getStudentById(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.fullName).toBe('Student One');
      expect(responseData.email).toBe('student.one@example.com');
    });

    it('should populate institute for student', async () => {
      mockReq = {
        params: {
          id: student1._id.toString(),
        },
      };

      await getStudentById(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.institute).toBeDefined();
      expect(responseData.institute.name).toBe('Student Controller Institute');
    });

    it('should return 404 for non-existent student', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      mockReq = {
        params: {
          id: fakeId.toString(),
        },
      };

      await getStudentById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User not found',
      });
    });

    it('should return 404 if user is not a student', async () => {
      const lecturer = await User.findOne({ role: 'lecturer' });

      mockReq = {
        params: {
          id: lecturer._id.toString(),
        },
      };

      await getStudentById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User not found',
      });
    });
  });
});
