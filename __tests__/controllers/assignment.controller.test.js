import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { createAssignment, getAssignmentsBySubject } from '../../src/controllers/assignment.controller.js';
import Assignment from '../../src/models/Assignment.js';

describe('Assignment Controller', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
  });

  afterAll(async () => {
    await Assignment.deleteMany({});
    await mongoose.disconnect();
  });

  it('exports functions', () => {
    expect(createAssignment).toBeDefined();
    expect(getAssignmentsBySubject).toBeDefined();
  });

  it('createAssignment returns 403 for non-lecturer', async () => {
    const mockReq = { user: { role: 'student' }, body: {} };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    await createAssignment(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('getAssignmentsBySubject returns array', async () => {
    const mockReq = { params: { subjectId: new mongoose.Types.ObjectId().toString() }, user: { institute: new mongoose.Types.ObjectId() } };
    const mockRes = { json: jest.fn().mockReturnThis() };

    await getAssignmentsBySubject(mockReq, mockRes);
    expect(Array.isArray(mockRes.json.mock.calls[0][0])).toBe(true);
  });
});
