import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import Result from '../../src/models/Result.js';
import User from '../../src/models/user.js';
import Subject from '../../src/models/Subject.js';
import Class from '../../src/models/Class.js';
import Institute from '../../src/models/Institute.js';

describe('Result Model', () => {
  let institute;
  let student;
  let lecturer;
  let subject;
  let classDoc;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    institute = await Institute.create({
      name: 'Test Institute',
      address: '123 Main St',
      phoneNumber: '1234567890',
      targetLine: 'Test',
      admin: new mongoose.Types.ObjectId(),
    });

    student = await User.create({
      fullName: 'Result Student',
      email: 'result.student@test.com',
      password: 'password123',
      role: 'student',
      institute: institute._id,
      approved: true,
    });

    lecturer = await User.create({
      fullName: 'Result Lecturer',
      email: 'result.lecturer@test.com',
      password: 'password123',
      role: 'lecturer',
      institute: institute._id,
      approved: true,
    });

    classDoc = await Class.create({
      name: 'Test Class',
      code: 'TC-001',
      institute: institute._id,
      lecturer: lecturer._id,
    });

    subject = await Subject.create({
      name: 'Test Subject',
      code: 'TS-001',
      class: classDoc._id,
      lecturer: lecturer._id,
      institute: institute._id,
    });
  });

  afterAll(async () => {
    await Result.deleteMany({});
    await Subject.deleteMany({});
    await Class.deleteMany({});
    await User.deleteMany({ email: /result\./ });
    await Institute.deleteMany({});
    await mongoose.disconnect();
  });

  describe('Create', () => {
    it('should create result with valid data', async () => {
      const unique = Date.now();
      const tempSubject = await Subject.create({
        name: `Temp Subject ${unique}`,
        code: `TS-${unique}`,
        class: classDoc._id,
        lecturer: lecturer._id,
        institute: institute._id,
      });

      const result = await Result.create({
        student: student._id,
        subject: tempSubject._id,
        class: classDoc._id,
        marksObtained: 85,
        totalScore: 85,
        grade: 'A',
        institute: institute._id,
      });

      await Subject.findByIdAndDelete(tempSubject._id);

      expect(result).toBeDefined();
      expect(result._id).toBeDefined();
      expect(result.totalScore).toBe(85);
      expect(result.grade).toBe('A');
    });

    it('should create result with all fields', async () => {
      const unique = Date.now() + 1;
      const tempSubject = await Subject.create({
        name: `Temp Subject ${unique}`,
        code: `TS-${unique}`,
        class: classDoc._id,
        lecturer: lecturer._id,
        institute: institute._id,
      });

      const result = await Result.create({
        student: student._id,
        subject: tempSubject._id,
        class: classDoc._id,
        marksObtained: 92,
        totalScore: 92,
        grade: 'A+',
        institute: institute._id,
      });

      await Subject.findByIdAndDelete(tempSubject._id);

      expect(result.student).toEqual(student._id);
      expect(result.subject).toEqual(tempSubject._id);
      expect(result.institute).toEqual(institute._id);
    });

    it('should allow creating result with minimal fields', async () => {
      const unique = Date.now() + 2;
      const tempSubject = await Subject.create({
        name: `Temp Subject ${unique}`,
        code: `TS-${unique}`,
        class: classDoc._id,
        lecturer: lecturer._id,
        institute: institute._id,
      });

      const result = await Result.create({
        subject: tempSubject._id,
        class: classDoc._id,
        marksObtained: 0,
        institute: institute._id,
      });

      await Subject.findByIdAndDelete(tempSubject._id);

      expect(result).toBeDefined();
      expect(result._id).toBeDefined();
      expect(result.student).toBeUndefined();
    });

    it('should allow zero score', async () => {
      const unique = Date.now() + 3;
      const tempSubject = await Subject.create({
        name: `Temp Subject ${unique}`,
        code: `TS-${unique}`,
        class: classDoc._id,
        lecturer: lecturer._id,
        institute: institute._id,
      });

      const result = await Result.create({
        student: student._id,
        subject: tempSubject._id,
        class: classDoc._id,
        marksObtained: 0,
        totalScore: 0,
        grade: 'F',
        institute: institute._id,
      });

      await Subject.findByIdAndDelete(tempSubject._id);

      expect(result.totalScore).toBe(0);
    });

    it('should allow null/undefined fields', async () => {
      const unique = Date.now() + 4;
      const tempSubject = await Subject.create({
        name: `Temp Subject ${unique}`,
        code: `TS-${unique}`,
        class: classDoc._id,
        lecturer: lecturer._id,
        institute: institute._id,
      });

      const result = await Result.create({
        student: student._id,
        subject: tempSubject._id,
        class: classDoc._id,
        marksObtained: 50,
        institute: institute._id,
      });

      await Subject.findByIdAndDelete(tempSubject._id);

      expect(result.totalScore).toBeUndefined();
      expect(result.grade).toBeUndefined();
    });
  });

  describe('Read', () => {
    let result;
    let testStudent;
    let testSubject;

    beforeAll(async () => {
      testStudent = await User.create({
        fullName: 'Result Read Test Student',
        email: 'result.read.student@test.com',
        password: 'password123',
        role: 'student',
        institute: institute._id,
        approved: true,
      });

      testSubject = await Subject.create({
        name: 'Result Read Test Subject',
        code: 'RRTS-001',
        class: classDoc._id,
        lecturer: lecturer._id,
        institute: institute._id,
      });

      result = await Result.create({
        student: testStudent._id,
        subject: testSubject._id,
        class: classDoc._id,
        marksObtained: 78,
        totalScore: 78,
        grade: 'B+',
        institute: institute._id,
      });
    });

    afterAll(async () => {
      await User.findByIdAndDelete(testStudent._id);
      await Subject.findByIdAndDelete(testSubject._id);
    });

    it('should find result by id', async () => {
      const found = await Result.findById(result._id);

      expect(found).toBeDefined();
      expect(found._id).toEqual(result._id);
      expect(found.grade).toBe('B+');
    });

    it('should find result by student and subject', async () => {
      const found = await Result.findOne({
        student: testStudent._id,
        subject: testSubject._id,
      });

      expect(found).toBeDefined();
      expect(found.totalScore).toBe(78);
    });

    it('should populate student reference', async () => {
      const found = await Result.findById(result._id).populate('student');

      expect(found.student.fullName).toBe('Result Read Test Student');
    });

    it('should populate subject reference', async () => {
      const found = await Result.findById(result._id).populate('subject');

      expect(found.subject.name).toBe('Result Read Test Subject');
    });

    it('should populate institute reference', async () => {
      const found = await Result.findById(result._id).populate('institute');

      expect(found.institute.name).toBe('Test Institute');
    });

    it('should find multiple results for student', async () => {
      const results = await Result.find({ student: testStudent._id });

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.grade === 'B+')).toBe(true);
    });

    it('should find results for subject', async () => {
      const results = await Result.find({ subject: testSubject._id });

      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Update', () => {
    let result;

    beforeAll(async () => {
      result = await Result.create({
        student: student._id,
        subject: subject._id,
        class: classDoc._id,
        marksObtained: 70,
        totalScore: 70,
        grade: 'C',
        institute: institute._id,
      });
    });

    it('should update totalScore', async () => {
      const updated = await Result.findByIdAndUpdate(
        result._id,
        { totalScore: 85 },
        { new: true }
      );

      expect(updated.totalScore).toBe(85);
    });

    it('should update grade', async () => {
      const updated = await Result.findByIdAndUpdate(
        result._id,
        { grade: 'B' },
        { new: true }
      );

      expect(updated.grade).toBe('B');
    });

    it('should update student reference', async () => {
      const newStudent = await User.create({
        fullName: 'Another Student',
        email: 'result.another@test.com',
        password: 'password123',
        role: 'student',
        institute: institute._id,
        approved: true,
      });

      const updated = await Result.findByIdAndUpdate(
        result._id,
        { student: newStudent._id },
        { new: true }
      );

      expect(updated.student).toEqual(newStudent._id);

      await User.findByIdAndDelete(newStudent._id);
    });

    it('should update multiple fields at once', async () => {
      const updated = await Result.findByIdAndUpdate(
        result._id,
        {
          totalScore: 95,
          grade: 'A+',
        },
        { new: true }
      );

      expect(updated.totalScore).toBe(95);
      expect(updated.grade).toBe('A+');
    });
  });

  describe('Delete', () => {
    it('should delete result', async () => {
      const result = await Result.create({
        student: student._id,
        subject: subject._id,
        class: classDoc._id,
        marksObtained: 80,
        totalScore: 80,
        grade: 'A',
        institute: institute._id,
      });

      await Result.findByIdAndDelete(result._id);

      const found = await Result.findById(result._id);
      expect(found).toBeNull();
    });

    it('should delete multiple results for student', async () => {
      const tempStudent = await User.create({
        fullName: 'Temp Student',
        email: 'result.temp@test.com',
        password: 'password123',
        role: 'student',
        institute: institute._id,
        approved: true,
      });

      await Result.create({
        student: tempStudent._id,
        class: classDoc._id,
        marksObtained: 70,
        totalScore: 70,
        institute: institute._id,
      });

      await Result.deleteMany({ student: tempStudent._id });
      const found = await Result.find({ student: tempStudent._id });

      expect(found).toHaveLength(0);

      await User.findByIdAndDelete(tempStudent._id);
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt', async () => {
      const result = await Result.create({
        student: student._id,
        class: classDoc._id,
        marksObtained: 88,
        totalScore: 88,
        grade: 'B+',
        institute: institute._id,
      });

      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });
});
