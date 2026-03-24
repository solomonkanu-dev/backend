import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { submitAssignment, getSubmissionsForAssignment, getMySubmissions } from '../../src/controllers/submission.controller.js';
import Submission from '../../src/models/Submission.js';

describe('Submission Controller', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
  });

  afterAll(async () => {
    await Submission.deleteMany({});
    await mongoose.disconnect();
  });

  it('exports functions', () => {
    expect(submitAssignment).toBeDefined();
    expect(getSubmissionsForAssignment).toBeDefined();
    expect(getMySubmissions).toBeDefined();
  });

  it('submitAssignment returns 403 for non-student', async () => {
    const mockReq = { user: { role: 'lecturer' }, body: {} };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    await submitAssignment(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('getSubmissionsForAssignment returns array', async () => {
    const mockReq = { params: { assignmentId: new mongoose.Types.ObjectId().toString() } };
    const mockRes = { json: jest.fn().mockReturnThis() };

    await getSubmissionsForAssignment(mockReq, mockRes);
    expect(Array.isArray(mockRes.json.mock.calls[0][0])).toBe(true);
  });
});
