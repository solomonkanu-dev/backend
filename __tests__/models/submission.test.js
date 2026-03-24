import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import Submission from '../../src/models/Submission.js';
import Assignment from '../../src/models/Assignment.js';
import User from '../../src/models/user.js';
import Subject from '../../src/models/Subject.js';
import Class from '../../src/models/Class.js';
import Institute from '../../src/models/Institute.js';

describe('Submission Model', () => {
  let student;
  let assignment;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
  });

  beforeEach(async () => {
    const institute = await Institute.create({
      name: 'Submission Test Institute',
      address: '888 Submit Ave',
      phoneNumber: '8888888888',
      targetLine: 'Submit',
      admin: new mongoose.Types.ObjectId(),
    });

    const lecturer = await User.create({
      fullName: 'Submission Lecturer',
      email: 'submit.lecturer@example.com',
      password: 'password123',
      role: 'lecturer',
      institute: institute._id,
    });

    student = await User.create({
      fullName: 'Submission Student',
      email: 'submit.student@example.com',
      password: 'password123',
      role: 'student',
      institute: institute._id,
    });

    const classData = await Class.create({
      name: 'Submission Class',
      code: 'SUBMIT101',
      institute: institute._id,
      lecturer: lecturer._id,
    });

    const subject = await Subject.create({
      name: 'Submission Subject',
      code: 'SUBMITSUB',
      class: classData._id,
      lecturer: lecturer._id,
      institute: institute._id,
    });

    assignment = await Assignment.create({
      title: 'Test Submission Assignment',
      subject: subject._id,
      lecturer: lecturer._id,
    });
  });

  afterEach(async () => {
    await Submission.deleteMany({});
    await Assignment.deleteMany({});
    await Subject.deleteMany({});
    await Class.deleteMany({});
    await User.deleteMany({});
    await Institute.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('Submission Creation', () => {
    it('should create a submission with required fields', async () => {
      const submissionData = {
        assignment: assignment._id,
        student: student._id,
        fileUrl: 'https://example.com/submission.pdf',
      };

      const submission = await Submission.create(submissionData);

      expect(submission).toBeDefined();
      expect(submission.assignment).toEqual(assignment._id);
      expect(submission.student).toEqual(student._id);
      expect(submission.fileUrl).toBe('https://example.com/submission.pdf');
    });

    it('should allow submission with score', async () => {
      const submissionData = {
        assignment: assignment._id,
        student: student._id,
        fileUrl: 'https://example.com/submission.pdf',
        score: 95,
      };

      const submission = await Submission.create(submissionData);

      expect(submission.score).toBe(95);
    });

    it('should allow submission without fileUrl', async () => {
      const submissionData = {
        assignment: assignment._id,
        student: student._id,
      };

      const submission = await Submission.create(submissionData);

      expect(submission).toBeDefined();
      expect(submission.fileUrl).toBeUndefined();
    });

    it('should allow submission without score', async () => {
      const submissionData = {
        assignment: assignment._id,
        student: student._id,
        fileUrl: 'https://example.com/submission.pdf',
      };

      const submission = await Submission.create(submissionData);

      expect(submission.score).toBeUndefined();
    });

    it('should allow multiple submissions for same assignment', async () => {
      const submissionData1 = {
        assignment: assignment._id,
        student: student._id,
        fileUrl: 'https://example.com/sub1.pdf',
      };

      const submission1 = await Submission.create(submissionData1);

      const submissionData2 = {
        assignment: assignment._id,
        student: student._id,
        fileUrl: 'https://example.com/sub2.pdf',
      };

      const submission2 = await Submission.create(submissionData2);

      expect(submission1).toBeDefined();
      expect(submission2).toBeDefined();
      expect(submission1._id).not.toEqual(submission2._id);
    });
  });

  describe('Submission References', () => {
    it('should reference assignment correctly', async () => {
      const submissionData = {
        assignment: assignment._id,
        student: student._id,
        fileUrl: 'https://example.com/submission.pdf',
      };

      const submission = await Submission.create(submissionData);
      const populated = await submission.populate('assignment');

      expect(populated.assignment.title).toBe('Test Submission Assignment');
    });

    it('should reference student correctly', async () => {
      const submissionData = {
        assignment: assignment._id,
        student: student._id,
        fileUrl: 'https://example.com/submission.pdf',
      };

      const submission = await Submission.create(submissionData);
      const populated = await submission.populate('student');

      expect(populated.student.fullName).toBe('Submission Student');
      expect(populated.student.role).toBe('student');
    });
  });

  describe('Submission Timestamps', () => {
    it('should set createdAt and updatedAt', async () => {
      const submissionData = {
        assignment: assignment._id,
        student: student._id,
        fileUrl: 'https://example.com/submission.pdf',
      };

      const submission = await Submission.create(submissionData);

      expect(submission.createdAt).toBeDefined();
      expect(submission.updatedAt).toBeDefined();
      expect(submission.createdAt).toBeInstanceOf(Date);
      expect(submission.updatedAt).toBeInstanceOf(Date);
    });
  });
});
