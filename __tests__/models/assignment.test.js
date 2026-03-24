import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import Assignment from '../../src/models/Assignment.js';
import Subject from '../../src/models/Subject.js';
import User from '../../src/models/user.js';
import Class from '../../src/models/Class.js';
import Institute from '../../src/models/Institute.js';

describe('Assignment Model', () => {
  let lecturer;
  let subject;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
  });

  beforeEach(async () => {
    const institute = await Institute.create({
      name: 'Assignment Test Institute',
      address: '999 Assignment St',
      phoneNumber: '9999999999',
      targetLine: 'Testing',
      admin: new mongoose.Types.ObjectId(),
    });

    lecturer = await User.create({
      fullName: 'Assignment Lecturer',
      email: 'assign.lecturer@example.com',
      password: 'password123',
      role: 'lecturer',
      institute: institute._id,
    });

    const classData = await Class.create({
      name: 'Assignment Class',
      code: 'ASSIGN101',
      institute: institute._id,
      lecturer: lecturer._id,
    });

    subject = await Subject.create({
      name: 'Assignment Subject',
      code: 'ASSIGNSUB',
      class: classData._id,
      lecturer: lecturer._id,
      institute: institute._id,
    });
  });

  afterEach(async () => {
    await Assignment.deleteMany({});
    await Subject.deleteMany({});
    await Class.deleteMany({});
    await User.deleteMany({});
    await Institute.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('Assignment Creation', () => {
    it('should create an assignment with required fields', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 7 days from now

      const assignmentData = {
        title: 'Math Assignment 1',
        subject: subject._id,
        lecturer: lecturer._id,
        dueDate,
      };

      const assignment = await Assignment.create(assignmentData);

      expect(assignment).toBeDefined();
      expect(assignment.title).toBe('Math Assignment 1');
      expect(assignment.subject).toEqual(subject._id);
      expect(assignment.lecturer).toEqual(lecturer._id);
      expect(assignment.dueDate).toEqual(dueDate);
    });

    it('should create assignment with institute reference', async () => {
      const institute = await Institute.findOne({ name: 'Assignment Test Institute' });
      const dueDate = new Date();

      const assignmentData = {
        title: 'Physics Assignment 1',
        subject: subject._id,
        lecturer: lecturer._id,
        institute: institute._id,
        dueDate,
      };

      const assignment = await Assignment.create(assignmentData);

      expect(assignment.institute).toEqual(institute._id);
    });

    it('should allow creating assignment without dueDate', async () => {
      const assignmentData = {
        title: 'Optional Due Date Assignment',
        subject: subject._id,
        lecturer: lecturer._id,
      };

      const assignment = await Assignment.create(assignmentData);

      expect(assignment).toBeDefined();
      expect(assignment.title).toBe('Optional Due Date Assignment');
      expect(assignment.dueDate).toBeUndefined();
    });

    it('should allow assignment without title', async () => {
      const assignmentData = {
        subject: subject._id,
        lecturer: lecturer._id,
      };

      const assignment = await Assignment.create(assignmentData);

      expect(assignment).toBeDefined();
      expect(assignment.title).toBeUndefined();
    });
  });

  describe('Assignment References', () => {
    it('should reference subject correctly', async () => {
      const assignmentData = {
        title: 'Subject Reference Assignment',
        subject: subject._id,
        lecturer: lecturer._id,
      };

      const assignment = await Assignment.create(assignmentData);
      const populated = await assignment.populate('subject');

      expect(populated.subject.name).toBe('Assignment Subject');
    });

    it('should reference lecturer correctly', async () => {
      const assignmentData = {
        title: 'Lecturer Reference Assignment',
        subject: subject._id,
        lecturer: lecturer._id,
      };

      const assignment = await Assignment.create(assignmentData);
      const populated = await assignment.populate('lecturer');

      expect(populated.lecturer.fullName).toBe('Assignment Lecturer');
    });
  });

  describe('Assignment Timestamps', () => {
    it('should set createdAt and updatedAt', async () => {
      const assignmentData = {
        title: 'Timestamp Assignment',
        subject: subject._id,
        lecturer: lecturer._id,
      };

      const assignment = await Assignment.create(assignmentData);

      expect(assignment.createdAt).toBeDefined();
      expect(assignment.updatedAt).toBeDefined();
      expect(assignment.createdAt).toBeInstanceOf(Date);
      expect(assignment.updatedAt).toBeInstanceOf(Date);
    });
  });
});
