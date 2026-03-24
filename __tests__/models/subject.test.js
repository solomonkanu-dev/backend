import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import Subject from '../../src/models/Subject.js';
import Class from '../../src/models/Class.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';

describe('Subject Model', () => {
  let lecturer;
  let institute;
  let classData;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
  });

  beforeEach(async () => {
    institute = await Institute.create({
      name: 'Subject Test Institute',
      address: '456 Test Ave',
      phoneNumber: '9876543210',
      targetLine: 'Quality',
      admin: new mongoose.Types.ObjectId(),
    });

    lecturer = await User.create({
      fullName: 'Subject Lecturer',
      email: 'subject.lecturer@example.com',
      password: 'password123',
      role: 'lecturer',
      institute: institute._id,
    });

    classData = await Class.create({
      name: 'Test Class for Subject',
      code: 'SUBJ101',
      institute: institute._id,
      lecturer: lecturer._id,
    });
  });

  afterEach(async () => {
    await Subject.deleteMany({});
    await Class.deleteMany({});
    await User.deleteMany({});
    await Institute.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('Subject Creation', () => {
    it('should create a subject with required fields', async () => {
      const subjectData = {
        name: 'Advanced Mathematics',
        code: 'MATH401',
        class: classData._id,
        lecturer: lecturer._id,
        institute: institute._id,
      };

      const subject = await Subject.create(subjectData);

      expect(subject).toBeDefined();
      expect(subject.name).toBe('Advanced Mathematics');
    });

    it('should trim name field', async () => {
      const subjectData = {
        name: '  Chemistry Advanced  ',
        class: classData._id,
        lecturer: lecturer._id,
        institute: institute._id,
      };

      const subject = await Subject.create(subjectData);

      expect(subject.name).toBe('Chemistry Advanced');
    });

    it('should default totalMarks to 100', async () => {
      const subject = await Subject.create({
        name: 'Chemistry Lab',
        class: classData._id,
        lecturer: lecturer._id,
        institute: institute._id,
      });

      expect(subject.totalMarks).toBe(100);
    });

    it('should enforce unique code per class', async () => {
      const subject = await Subject.create({
        name: 'Unique Test',
        code: 'UNIQ001',
        class: classData._id,
        lecturer: lecturer._id,
        institute: institute._id,
      });

      expect(subject).toBeDefined();

      // Attempt to create another subject with same code in same class should fail
      const subjectData2 = {
        name: 'Unique Test 2',
        code: 'UNIQ001',
        class: classData._id,
        lecturer: lecturer._id,
        institute: institute._id,
      };

      await expect(Subject.create(subjectData2)).rejects.toThrow();
    });

    it('should not create subject without required fields', async () => {
      const incompleteData = {
        name: 'Incomplete Subject',
      };

      await expect(Subject.create(incompleteData)).rejects.toThrow();
    });
  });

  describe('Subject References', () => {
    it('should reference class correctly', async () => {
      const subjectData = {
        name: 'Reference Test',
        code: 'REF401',
        class: classData._id,
        lecturer: lecturer._id,
        institute: institute._id,
      };

      const subject = await Subject.create(subjectData);
      const populated = await subject.populate('class');

      expect(populated.class.name).toBe('Test Class for Subject');
    });

    it('should reference lecturer correctly', async () => {
      const subjectData = {
        name: 'Lecturer Reference',
        code: 'LECREF401',
        class: classData._id,
        lecturer: lecturer._id,
        institute: institute._id,
      };

      const subject = await Subject.create(subjectData);
      const populated = await subject.populate('lecturer');

      expect(populated.lecturer.fullName).toBe('Subject Lecturer');
    });
  });

  describe('Subject Timestamps', () => {
    it('should set createdAt and updatedAt', async () => {
      const subjectData = {
        name: 'Timestamp Subject',
        code: 'TIME401',
        class: classData._id,
        lecturer: lecturer._id,
        institute: institute._id,
      };

      const subject = await Subject.create(subjectData);

      expect(subject.createdAt).toBeDefined();
      expect(subject.updatedAt).toBeDefined();
    });
  });
});
