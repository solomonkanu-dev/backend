import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, jest } from '@jest/globals';
import { createClass, addStudentToClass } from '../../src/controllers/class.controller.js';
import Class from '../../src/models/Class.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import mongoose from 'mongoose';

describe('Class Controller', () => {
  let mockReq;
  let mockRes;
  let admin;
  let lecturer;
  let student;
  let institute;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    institute = await Institute.create({
      name: 'Class Controller Institute',
      address: '789 Class Ave',
      phoneNumber: '7897897890',
      targetLine: 'Classroom',
      admin: new mongoose.Types.ObjectId(),
    });
  });

  beforeEach(async () => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    admin = await User.create({
      fullName: 'Class Admin',
      email: 'class.admin@example.com',
      password: 'password123',
      role: 'admin',
      institute: institute._id,
      approved: true,
    });

    lecturer = await User.create({
      fullName: 'Class Lecturer',
      email: 'class.lecturer@example.com',
      password: 'password123',
      role: 'lecturer',
      institute: institute._id,
      approved: true,
    });

    student = await User.create({
      fullName: 'Class Student',
      email: 'class.student@example.com',
      password: 'password123',
      role: 'student',
      institute: institute._id,
      approved: true,
    });
  });

  afterEach(async () => {
    await Class.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    await Institute.deleteMany({});
    await mongoose.disconnect();
  });

  describe('CreateClass', () => {
    it('should create a class when admin provides valid data', async () => {
      mockReq = {
        user: {
          role: 'admin',
          institute: institute._id,
        },
        body: {
          name: 'Mathematics 101',
          lecturerId: lecturer._id.toString(),
        },
      };

      await createClass(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.class.name).toBe('Mathematics 101');
    });

    it('should return 403 if user is not admin', async () => {
      mockReq = {
        user: {
          role: 'lecturer',
          institute: institute._id,
        },
        body: {
          name: 'Physics 101',
          code: 'PHYS101',
          lecturerId: lecturer._id.toString(),
        },
      };

      await createClass(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Access denied',
      });
    });

    it('should return 400 if required fields are missing', async () => {
      mockReq = {
        user: {
          role: 'admin',
          institute: institute._id,
        },
        body: {
          name: 'Incomplete Class',
          // missing code and lecturerId
        },
      };

      await createClass(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'All fields are required',
      });
    });

    it('should return 404 if lecturer does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      mockReq = {
        user: {
          role: 'admin',
          institute: institute._id,
        },
        body: {
          name: 'Chemistry 101',
          code: 'CHEM101',
          lecturerId: fakeId.toString(),
        },
      };

      await createClass(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Lecturer not found',
      });
    });

    it('should return 404 if lecturer is from different institute', async () => {
      const otherInstitute = await Institute.create({
        name: 'Other Institute',
        address: '999 Other St',
        phoneNumber: '9999999991',
        targetLine: 'Different',
        admin: new mongoose.Types.ObjectId(),
      });

      const otherLecturer = await User.create({
        fullName: 'Other Lecturer',
        email: 'other.lecturer@example.com',
        password: 'password123',
        role: 'lecturer',
        institute: otherInstitute._id,
      });

      mockReq = {
        user: {
          role: 'admin',
          institute: institute._id,
        },
        body: {
          name: 'Biology 101',
          code: 'BIO101',
          lecturerId: otherLecturer._id.toString(),
        },
      };

      await createClass(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Lecturer not found',
      });

      await otherInstitute.deleteOne();
    });

    it('should prevent duplicate class names in same institute', async () => {
      await Class.create({
        name: 'Duplicate Name',
        lecturer: lecturer._id,
        institute: institute._id,
      });

      mockReq = {
        user: {
          role: 'admin',
          institute: institute._id,
        },
        body: {
          name: 'Duplicate Name',
          lecturerId: lecturer._id.toString(),
        },
      };

      await createClass(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('AddStudentToClass', () => {
    let testClass;

    beforeEach(async () => {
      testClass = await Class.create({
        name: 'Test Class',
        lecturer: lecturer._id,
        institute: institute._id,
      });
    });

    it('should add student to class', async () => {
      mockReq = {
        user: {
          role: 'admin',
          institute: institute._id,
        },
        body: {
          classId: testClass._id.toString(),
          studentId: student._id.toString(),
        },
      };

      await addStudentToClass(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const updatedClass = await Class.findById(testClass._id);
      expect(updatedClass.students.map(id => id.toString())).toContain(student._id.toString());
    });

    it('should return 403 if user is not admin', async () => {
      mockReq = {
        user: {
          role: 'lecturer',
          institute: institute._id,
        },
        body: {
          classId: testClass._id.toString(),
          studentId: student._id.toString(),
        },
      };

      await addStudentToClass(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Access denied',
      });
    });

    it('should return 404 if student does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      mockReq = {
        user: {
          role: 'admin',
          institute: institute._id,
        },
        body: {
          classId: testClass._id.toString(),
          studentId: fakeId.toString(),
        },
      };

      await addStudentToClass(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Student not found',
      });
    });

    it('should return 404 if class does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      mockReq = {
        user: {
          role: 'admin',
          institute: institute._id,
        },
        body: {
          classId: fakeId.toString(),
          studentId: student._id.toString(),
        },
      };

      await addStudentToClass(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Class not found',
      });
    });

    it('should return 400 if student is already in class', async () => {
      await Class.findByIdAndUpdate(testClass._id, {
        $push: { students: student._id },
      });

      mockReq = {
        user: {
          role: 'admin',
          institute: institute._id,
        },
        body: {
          classId: testClass._id.toString(),
          studentId: student._id.toString(),
        },
      };

      await addStudentToClass(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Student already in class',
      });
    });
  });
});
