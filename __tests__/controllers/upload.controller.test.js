import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { uploadProfilePhoto, getProfilePhoto } from '../../src/controllers/upload.controller.js';

describe('Upload Controller', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('exports functions', () => {
    expect(uploadProfilePhoto).toBeDefined();
    expect(getProfilePhoto).toBeDefined();
  });

  it('uploadProfilePhoto returns 400 when no file', async () => {
    const mockReq = { user: { id: '000' }, file: null };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    await uploadProfilePhoto(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('getProfilePhoto returns 404 when user not found', async () => {
    const mockReq = { user: { id: '000000000000000000000000' } };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    await getProfilePhoto(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(404);
  });
});
