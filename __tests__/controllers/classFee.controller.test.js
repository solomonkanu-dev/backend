import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { assignFeesToClass } from '../../src/controllers/classFee.controller.js';
import ClassFee from '../../src/models/ClassFee.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';

describe('ClassFee Controller', () => {
  let institute;
  let admin;
  let mockReq;
  let mockRes;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    institute = await Institute.create({
      name: 'ClassFee Institute',
      address: '1 Fee St',
      phoneNumber: '1112223333',
      targetLine: 'Fees',
      admin: new mongoose.Types.ObjectId(),
    });
  });

  beforeEach(async () => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    admin = await User.create({
      fullName: 'Fees Admin',
      email: `classfee.admin.${Date.now()}@example.com`,
      password: 'password123',
      role: 'admin',
      institute: institute._id,
      approved: true,
    });
  });

  afterEach(async () => {
    await ClassFee.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    await Institute.deleteMany({});
    await mongoose.disconnect();
  });

  it('returns 403 if req.user has no institute', async () => {
    mockReq = { user: { id: admin._id } , body: { classId: new mongoose.Types.ObjectId(), fees: [] } };
    await assignFeesToClass(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('assigns fees to a class (upsert)', async () => {
    const classId = new mongoose.Types.ObjectId();
    mockReq = { user: { id: admin._id, institute: institute._id }, body: { classId, fees: [{ fee: new mongoose.Types.ObjectId(), amount: 100 }] } };

    await assignFeesToClass(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    const response = mockRes.json.mock.calls[0][0];
    expect(response.classFee).toBeDefined();
    const found = await ClassFee.findOne({ class: classId });
    expect(found).not.toBeNull();
  });
});
