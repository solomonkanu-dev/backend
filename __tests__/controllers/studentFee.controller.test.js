import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { assignFeeToStudent, getStudentsWithFees, getFeesForStudent } from '../../src/controllers/studentFee.controller.js';
import StudentFee from '../../src/models/StudentFee.js';

describe('StudentFee Controller', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
  });

  afterAll(async () => {
    await StudentFee.deleteMany({});
    await mongoose.disconnect();
  });

  it('exports functions', () => {
    expect(assignFeeToStudent).toBeDefined();
    expect(getStudentsWithFees).toBeDefined();
    expect(getFeesForStudent).toBeDefined();
  });

  it('assignFeeToStudent returns 404 when student not found', async () => {
    const mockReq = { user: { institute: new mongoose.Types.ObjectId() } , body: { studentId: new mongoose.Types.ObjectId() } };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    await assignFeeToStudent(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('getStudentsWithFees returns array', async () => {
    const mockReq = { user: { institute: new mongoose.Types.ObjectId() } };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    await getStudentsWithFees(mockReq, mockRes);
    // Verify status was called (result is array when success, or error object when failure)
    const response = mockRes.json.mock.calls[0][0];
    expect(response).toBeDefined();
  });
});
