import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import {
  suspendInstitute,
  archiveInstitute,
  restoreInstitute,
} from '../../src/controllers/superAdmin.controller.js';
import Institute from '../../src/models/Institute.js';
import User from '../../src/models/user.js';

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

// next() that rethrows so a controller error surfaces as a rejected promise
const rethrow = (err) => {
  throw err;
};

const NAME = 'Lifecycle Test Institute';
const EMAIL = 'lifecycle.admin@example.com';

describe('SuperAdmin — institute lifecycle', () => {
  let institute;
  let admin;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    await Institute.deleteMany({ name: NAME });
    await User.deleteMany({ email: EMAIL });

    admin = await User.create({
      fullName: 'Lifecycle Admin',
      email: EMAIL,
      password: 'password123',
      role: 'admin',
    });
    institute = await Institute.create({
      name: NAME,
      address: '1 Test Street',
      phoneNumber: '000',
      targetLine: 'Testing',
      admin: admin._id,
    });
  });

  afterAll(async () => {
    await Institute.deleteMany({ name: NAME });
    await User.deleteMany({ email: EMAIL });
    await mongoose.disconnect();
  });

  const idParam = () => ({ params: { instituteId: String(institute._id) }, body: {} });

  it('defaults a new institute to active status', () => {
    expect(institute.status).toBe('active');
  });

  it('suspends an institute with a reason', async () => {
    const res = mockRes();
    await suspendInstitute(
      { params: { instituteId: String(institute._id) }, body: { reason: 'Non-payment' } },
      res,
      rethrow
    );
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.status).toBe('suspended');
    expect(payload.data.statusReason).toBe('Non-payment');

    const fresh = await Institute.findById(institute._id);
    expect(fresh.status).toBe('suspended');
  });

  it('rejects suspending an already-suspended institute', async () => {
    await expect(suspendInstitute(idParam(), mockRes(), rethrow)).rejects.toThrow(
      /already suspended/i
    );
  });

  it('archives a suspended institute', async () => {
    const res = mockRes();
    await archiveInstitute(idParam(), res, rethrow);
    expect(res.json.mock.calls[0][0].data.status).toBe('archived');
  });

  it('restores an institute to active and clears the reason', async () => {
    const res = mockRes();
    await restoreInstitute({ params: { instituteId: String(institute._id) } }, res, rethrow);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.status).toBe('active');
    expect(payload.data.statusReason).toBe('');
  });

  it('errors for an unknown institute', async () => {
    await expect(
      suspendInstitute(
        { params: { instituteId: new mongoose.Types.ObjectId().toString() }, body: {} },
        mockRes(),
        rethrow
      )
    ).rejects.toThrow(/not found/i);
  });

  it('rejects an invalid institute ID', async () => {
    await expect(
      suspendInstitute({ params: { instituteId: 'not-an-id' }, body: {} }, mockRes(), rethrow)
    ).rejects.toThrow(/invalid/i);
  });
});
