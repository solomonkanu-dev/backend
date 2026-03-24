import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { superAdminLogin, getPendingAdmins, getSystemStats } from '../../src/controllers/superAdmin.controller.js';
import User from '../../src/models/user.js';

describe('SuperAdmin Controller', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
  });

  afterAll(async () => {
    await User.deleteMany({ email: /superadmin.test/ });
    await mongoose.disconnect();
  });

  it('exports functions', () => {
    expect(superAdminLogin).toBeDefined();
    expect(getPendingAdmins).toBeDefined();
    expect(getSystemStats).toBeDefined();
  });

  it('superAdminLogin returns 401 for unknown user', async () => {
    const mockReq = { body: { email: 'noone@example.com', password: 'x' } };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    await superAdminLogin(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it('getPendingAdmins returns data structure', async () => {
    const mockReq = {};
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    await getPendingAdmins(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    const payload = mockRes.json.mock.calls[0][0];
    expect(payload).toHaveProperty('message');
    expect(payload).toHaveProperty('data');
  });
});
