import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import {
  createFeeStructure,
  getFeeStructures,
  getFeeStructureById,
  updateFeeStructure,
  deleteFeeStructure,
} from '../../src/controllers/feeStructure.controller.js';

import FeeStructure from '../../src/models/FeeStructure.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import Class from '../../src/models/Class.js';

describe('FeeStructure Controller', () => {
  let institute;
  let admin;
  let student;
  let cls;
  let mockReq;
  let mockRes;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    institute = await Institute.create({
      name: 'Fees Institute',
      address: '1 Test St',
      phoneNumber: '1231231234',
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
      email: `fees.admin.${Date.now()}@example.com`,
      password: 'password123',
      role: 'admin',
      institute: institute._id,
      approved: true,
    });

    student = await User.create({
      fullName: 'Fees Student',
      email: `fees.student.${Date.now()}@example.com`,
      password: 'password123',
      role: 'student',
      institute: institute._id,
      approved: true,
    });

    cls = await Class.create({
      name: 'Fees Class',
      lecturer: admin._id,
      institute: institute._id,
    });
  });

  afterEach(async () => {
    await FeeStructure.deleteMany({});
    await User.deleteMany({});
    await Class.deleteMany({});
  });

  afterAll(async () => {
    await Institute.deleteMany({});
    await mongoose.disconnect();
  });

  it('creates a fee structure for class and computes totalAmount', async () => {
    mockReq = {
      user: admin,
      body: {
        category: 'class',
        classId: cls._id.toString(),
        particulars: [
          { label: 'Tuition', amount: 1500 },
          { label: 'Lab', amount: 200 },
        ],
      },
    };

    await createFeeStructure(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    const data = mockRes.json.mock.calls[0][0].data;
    expect(data).toBeDefined();
    expect(data.totalAmount).toBe(1700);
    expect(data.category).toBe('class');
  });

  it('returns 400 when particulars are missing', async () => {
    mockReq = {
      user: admin,
      body: {
        category: 'all',
      },
    };

    await createFeeStructure(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('lists fee structures with pagination', async () => {
    // create two entries
    await FeeStructure.create({
      category: 'all',
      particulars: [{ label: 'A', amount: 100 }],
      totalAmount: 100,
      createdBy: admin._id,
      instituteId: institute._id,
    });

    await FeeStructure.create({
      category: 'class',
      classId: cls._id,
      particulars: [{ label: 'B', amount: 200 }],
      totalAmount: 200,
      createdBy: admin._id,
      instituteId: institute._id,
    });

    mockReq = {
      user: admin,
      query: { page: '1', limit: '10' },
    };

    await getFeeStructures(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const response = mockRes.json.mock.calls[0][0];
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('gets a fee structure by id', async () => {
    const created = await FeeStructure.create({
      category: 'student',
      studentId: student._id,
      particulars: [{ label: 'C', amount: 50 }],
      totalAmount: 50,
      createdBy: admin._id,
      instituteId: institute._id,
    });

    mockReq = { params: { id: created._id.toString() } };

    await getFeeStructureById(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const response = mockRes.json.mock.calls[0][0];
    expect(response.data._id.toString()).toBe(created._id.toString());
  });

  it('updates particulars and recomputes totalAmount', async () => {
    const created = await FeeStructure.create({
      category: 'all',
      particulars: [{ label: 'X', amount: 10 }],
      totalAmount: 10,
      createdBy: admin._id,
      instituteId: institute._id,
    });

    mockReq = {
      params: { id: created._id.toString() },
      body: { particulars: [{ label: 'X', amount: 30 }, { label: 'Y', amount: 20 }] },
    };

    await updateFeeStructure(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const updated = mockRes.json.mock.calls[0][0].data;
    expect(updated.totalAmount).toBe(50);
  });

  it('deletes a fee structure', async () => {
    const created = await FeeStructure.create({
      category: 'all',
      particulars: [{ label: 'D', amount: 5 }],
      totalAmount: 5,
      createdBy: admin._id,
      instituteId: institute._id,
    });

    mockReq = { params: { id: created._id.toString() } };

    await deleteFeeStructure(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const found = await FeeStructure.findById(created._id);
    expect(found).toBeNull();
  });
});
