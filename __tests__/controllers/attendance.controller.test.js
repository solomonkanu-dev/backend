import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { markAttendance, getMyAttendance, getSubjectAttendance } from '../../src/controllers/attendance.controller.js';
import Attendance from '../../src/models/Attendance.js';

describe('Attendance Controller', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
  });

  afterAll(async () => {
    await Attendance.deleteMany({});
    await mongoose.disconnect();
  });

  it('exports functions', () => {
    expect(markAttendance).toBeDefined();
    expect(getMyAttendance).toBeDefined();
    expect(getSubjectAttendance).toBeDefined();
  });

  it('markAttendance returns 403 for non-lecturer', async () => {
    const mockReq = { user: { role: 'student' }, body: {} };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    await markAttendance(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('getMyAttendance returns 403 for non-student', async () => {
    const mockReq = { user: { role: 'lecturer' } };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    await getMyAttendance(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('getSubjectAttendance returns array', async () => {
    const mockReq = { user: { id: new mongoose.Types.ObjectId(), institute: new mongoose.Types.ObjectId() }, query: { subjectId: new mongoose.Types.ObjectId().toString() } };
    const mockRes = { json: jest.fn().mockReturnThis() };

    await getSubjectAttendance(mockReq, mockRes);
    expect(Array.isArray(mockRes.json.mock.calls[0][0])).toBe(true);
  });
});
