import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { requestAdminSignup, createStudent, createInstitute } from '../../src/controllers/admin.controller.js';
import User from '../../src/models/user.js';

describe('Admin Controller', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
  });

  afterAll(async () => {
    await User.deleteMany({ email: /admin.test/ });
    await mongoose.disconnect();
  });

  it('exports functions', () => {
    expect(requestAdminSignup).toBeDefined();
    expect(createStudent).toBeDefined();
    expect(createInstitute).toBeDefined();
  });

  it('requestAdminSignup creates a signup request', async () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    const unique = Date.now();
    const mockReq = {
      body: {
        fullName: 'Admin Test',
        email: `admin.test+${unique}@example.com`,
        password: 'password123',
      },
    };

    await requestAdminSignup(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    const created = await User.findOne({ email: mockReq.body.email });
    expect(created).toBeDefined();
  });

  it('createStudent returns 403 for non-admin', async () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockReq = { user: { role: 'student' }, body: {} };

    await createStudent(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
  });
});
