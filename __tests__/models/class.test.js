import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import Class from '../../src/models/Class.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';

describe('Class Model', () => {
  let lecturer;
  let institute;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
  });

  beforeEach(async () => {
    // Create test institute
    institute = await Institute.create({
      name: 'Test Institute',
      address: '123 Test St',
      phoneNumber: '1234567890',
      targetLine: 'Excellence',
      admin: new mongoose.Types.ObjectId(),
    });

    // Create test lecturer
    lecturer = await User.create({
      fullName: 'Test Lecturer',
      email: 'lecturer@example.com',
      password: 'password123',
      role: 'lecturer',
      institute: institute._id,
    });
  });

  afterEach(async () => {
    await Class.deleteMany({});
    await User.deleteMany({});
    await Institute.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('Class Creation', () => {
    it('should create a class with required fields', async () => {
      const classData = {
        name: 'Mathematics 101',
        institute: institute._id,
        lecturer: lecturer._id,
      };

      const newClass = await Class.create(classData);

      expect(newClass).toBeDefined();
      expect(newClass.name).toBe('Mathematics 101');
      expect(newClass.students).toEqual([]);
    });

    it('should trim name field', async () => {
      const classData = {
        name: '  Physics 202  ',
        institute: institute._id,
        lecturer: lecturer._id,
      };

      const newClass = await Class.create(classData);

      expect(newClass.name).toBe('Physics 202');
    });

    it('should require both institute and lecturer', async () => {
      const classData = {
        name: 'Chemistry 303',
        institute: institute._id,
        // missing lecturer
      };

      let err;
      try {
        await Class.create(classData);
      } catch (e) {
        err = e;
      }

      expect(err).toBeDefined();
    });

    it('should not allow duplicate names in same institute', async () => {
      const classData = {
        name: 'Biology 404',
        institute: institute._id,
        lecturer: lecturer._id,
      };

      await Class.create(classData);

      await expect(Class.create(classData)).rejects.toThrow();
    });

    it('should not create class without required fields', async () => {
      const incompleteData = {
        name: 'Incomplete Class',
        institute: institute._id,
      };

      await expect(Class.create(incompleteData)).rejects.toThrow();
    });
  });

  describe('Class References', () => {
    it('should reference lecturer correctly', async () => {
      const classData = {
        name: 'Test Class',
        institute: institute._id,
        lecturer: lecturer._id,
      };

      const newClass = await Class.create(classData);
      const populated = await newClass.populate('lecturer');

      expect(populated.lecturer.fullName).toBe('Test Lecturer');
    });

    it('should support students array', async () => {
      const student = await User.create({
        fullName: 'Test Student',
        email: 'student@example.com',
        password: 'password123',
        role: 'student',
        institute: institute._id,
      });

      const classData = {
        name: 'Student Test Class',
        institute: institute._id,
        lecturer: lecturer._id,
        students: [student._id],
      };

      const newClass = await Class.create(classData);

      expect(newClass.students.length).toBe(1);
      expect(newClass.students[0]).toEqual(student._id);
    });
  });

  describe('Class Timestamps', () => {
    it('should set createdAt and updatedAt', async () => {
      const classData = {
        name: 'Timestamp Class',
        code: 'TIME101',
        institute: institute._id,
        lecturer: lecturer._id,
      };

      const newClass = await Class.create(classData);

      expect(newClass.createdAt).toBeDefined();
      expect(newClass.updatedAt).toBeDefined();
    });
  });
});
