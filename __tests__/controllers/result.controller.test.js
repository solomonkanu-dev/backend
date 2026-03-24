import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { assignMarks } from '../../src/controllers/result.controller.js';
import Result from '../../src/models/Result.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import Subject from '../../src/models/Subject.js';

describe('Result Controller', () => {
  let institute;
  let admin;
  let lecturer;
  let student;
  let subject;
  let mockReq;
  let mockRes;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    institute = await Institute.create({
      name: 'Result Institute',
      address: '2 Marks St',
      phoneNumber: '2223334444',
      targetLine: 'Results',
      admin: new mongoose.Types.ObjectId(),
    });
  });

  beforeEach(async () => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    admin = await User.create({ fullName: 'Result Admin', email: `result.admin.${Date.now()}@example.com`, password: 'password', role: 'admin', institute: institute._id, approved: true });

    lecturer = await User.create({ fullName: 'Result Lecturer', email: `result.lecturer.${Date.now()}@example.com`, password: 'password', role: 'lecturer', institute: institute._id, approved: true });

    student = await User.create({ fullName: 'Result Student', email: `result.student.${Date.now()}@example.com`, password: 'password', role: 'student', institute: institute._id, approved: true });

    subject = await Subject.create({ name: 'Test Subject', class: new mongoose.Types.ObjectId(), lecturer: lecturer._id, institute: institute._id, totalMarks: 100 });
  });

  afterEach(async () => {
    await Result.deleteMany({});
    await User.deleteMany({});
    await Subject.deleteMany({});
  });

  afterAll(async () => {
    await Institute.deleteMany({});
    await mongoose.disconnect();
  });

  it('returns 403 for unauthorized roles', async () => {
    mockReq = { user: { role: 'student' }, body: {} };
    await assignMarks(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('returns 404 if student not found', async () => {
    mockReq = { user: admin, body: { studentId: new mongoose.Types.ObjectId(), subjectId: subject._id, classId: subject.class, marksObtained: 50 } };
    await assignMarks(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 if subject not found', async () => {
    mockReq = { user: admin, body: { studentId: student._id, subjectId: new mongoose.Types.ObjectId(), classId: subject.class, marksObtained: 50 } };
    await assignMarks(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 when marks exceed totalMarks', async () => {
    mockReq = { user: lecturer, body: { studentId: student._id, subjectId: subject._id, classId: subject.class, marksObtained: 150 } };
    await assignMarks(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('assigns marks successfully and returns result', async () => {
    mockReq = { user: lecturer, body: { studentId: student._id, subjectId: subject._id, classId: subject.class, marksObtained: 75 } };
    await assignMarks(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    const response = mockRes.json.mock.calls[0][0];
    expect(response.result).toBeDefined();
    expect(response.result.marksObtained).toBe(75);
  });
});
