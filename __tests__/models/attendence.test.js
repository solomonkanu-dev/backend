import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import Attendance from '../../src/models/Attendance.js';
import User from '../../src/models/user.js';
import Subject from '../../src/models/Subject.js';
import Class from '../../src/models/Class.js';
import Institute from '../../src/models/Institute.js';

describe('Attendance Model', () => {
  let institute;
  let lecturer;
  let student;
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

    lecturer = await User.create({
      fullName: 'Test Lecturer',
      email: 'attendance.lecturer@test.com',
      password: 'password123',
      role: 'lecturer',
      institute: institute._id,
      approved: true,
    });

    student = await User.create({
      fullName: 'Test Student',
      email: 'attendance.student@test.com',
      password: 'password123',
      role: 'student',
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
    await Attendance.deleteMany({});
    await Subject.deleteMany({});
    await Class.deleteMany({});
    await User.deleteMany({ email: /attendance\./ });
    await Institute.deleteMany({});
    await mongoose.disconnect();
  });

  describe('Create', () => {
    it('should create attendance with valid data', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attendance = await Attendance.create({
        class: classDoc._id,
        institute: institute._id,
        date: today,
        records: [
          {
            student: student._id,
            status: 'present',
          },
        ],
        markedBy: lecturer._id,
      });

      expect(attendance).toBeDefined();
      expect(attendance._id).toBeDefined();
      expect(attendance.class).toEqual(classDoc._id);
      expect(attendance.records.length).toBe(1);
      expect(attendance.records[0].status).toBe('present');
    });

    it('should fail to create attendance without subject', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await expect(
        Attendance.create({
          class: classDoc._id,
          institute: institute._id,
          date: today,
          records: [{ student: student._id, status: 'present' }],
          markedBy: lecturer._id,
        })
      ).resolves.toBeDefined();
    });

    it('should fail to create attendance without student', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await expect(
        Attendance.create({
          class: classDoc._id,
          institute: institute._id,
          date: today,
          records: [],
          markedBy: lecturer._id,
        })
      ).resolves.toBeDefined();
    });

    it('should fail to create attendance with invalid status', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await expect(
        Attendance.create({
          class: classDoc._id,
          institute: institute._id,
          date: today,
          records: [{ student: student._id, status: 'invalid' }],
          markedBy: lecturer._id,
        })
      ).rejects.toThrow();
    });

    it('should enforce unique constraint on subject, student, and date', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Clear any existing attendance for this combination
      await Attendance.deleteMany({
        subject: subject._id,
        student: student._id,
        date: today,
      });

      await Attendance.create({
        subject: subject._id,
        student: student._id,
        lecturer: lecturer._id,
        institute: institute._id,
        date: today,
        status: 'present',
      });

      await expect(
        Attendance.create({
          subject: subject._id,
          student: student._id,
          lecturer: lecturer._id,
          institute: institute._id,
          date: today,
          status: 'absent',
        })
      ).rejects.toThrow();
    });
  });;

  describe('Read', () => {
    let attendance;

    beforeAll(async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      attendance = await Attendance.create({
        subject: subject._id,
        student: student._id,
        lecturer: lecturer._id,
        institute: institute._id,
        date: yesterday,
        status: 'absent',
      });
    });

    it('should find attendance by id', async () => {
      const found = await Attendance.findById(attendance._id);

      expect(found).toBeDefined();
      expect(found._id).toEqual(attendance._id);
      expect(found.status).toBe('absent');
    });

    it('should find attendance by subject and student', async () => {
      const found = await Attendance.findOne({
        subject: subject._id,
        student: student._id,
      });

      expect(found).toBeDefined();
      expect(found.status).toBe('absent');
    });

    it('should populate references', async () => {
      const found = await Attendance.findById(attendance._id)
        .populate('subject')
        .populate('student')
        .populate('lecturer')
        .populate('institute');

      expect(found.subject.name).toBe('Test Subject');
      expect(found.student.fullName).toBe('Test Student');
      expect(found.lecturer.fullName).toBe('Test Lecturer');
      expect(found.institute.name).toBe('Test Institute');
    });
  });

  describe('Update', () => {
    it('should update attendance status', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(0, 0, 0, 0);

      const attendance = await Attendance.create({
        subject: subject._id,
        student: student._id,
        lecturer: lecturer._id,
        institute: institute._id,
        date: twoDaysAgo,
        status: 'present',
      });

      const updated = await Attendance.findByIdAndUpdate(
        attendance._id,
        { status: 'absent' },
        { new: true }
      );

      expect(updated.status).toBe('absent');
    });
  });

  describe('Delete', () => {
    it('should delete attendance', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      threeDaysAgo.setHours(0, 0, 0, 0);

      const attendance = await Attendance.create({
        subject: subject._id,
        student: student._id,
        lecturer: lecturer._id,
        institute: institute._id,
        date: threeDaysAgo,
        status: 'present',
      });

      await Attendance.findByIdAndDelete(attendance._id);

      const found = await Attendance.findById(attendance._id);
      expect(found).toBeNull();
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt', async () => {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      fourDaysAgo.setHours(0, 0, 0, 0);

      const attendance = await Attendance.create({
        subject: subject._id,
        student: student._id,
        lecturer: lecturer._id,
        institute: institute._id,
        date: fourDaysAgo,
        status: 'present',
      });

      expect(attendance.createdAt).toBeDefined();
      expect(attendance.updatedAt).toBeDefined();
    });
  });
});
