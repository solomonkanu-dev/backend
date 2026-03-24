import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { createSubjectForClass, getSubjects, getSubjectById } from '../../src/controllers/subject.controller.js';
import Subject from '../../src/models/Subject.js';

describe('Subject Controller', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
  });

  afterAll(async () => {
    await Subject.deleteMany({});
    await mongoose.disconnect();
  });

  it('exports functions', () => {
    expect(createSubjectForClass).toBeDefined();
    expect(getSubjects).toBeDefined();
    expect(getSubjectById).toBeDefined();
  });

  it('createSubjectForClass returns 403 for non-admin/lecturer', async () => {
    const mockReq = { user: { role: 'student' }, body: {} };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    await createSubjectForClass(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('getSubjects returns array', async () => {
    const mockReq = { user: { institute: new mongoose.Types.ObjectId() } };
    const mockRes = { json: jest.fn().mockReturnThis() };

    await getSubjects(mockReq, mockRes);
    expect(Array.isArray(mockRes.json.mock.calls[0][0])).toBe(true);
  });
});
