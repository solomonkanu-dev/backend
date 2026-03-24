import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import auth from '../../src/middlewares/auth.js';
import User from '../../src/models/user.js';
import mongoose from 'mongoose';
import Institute from '../../src/models/Institute.js';

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let testUser;
  let institute;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    institute = await Institute.create({
      name: 'Auth Test Institute',
      address: '123 Auth St',
      phoneNumber: '1234567890',
      targetLine: 'Security',
      admin: new mongoose.Types.ObjectId(),
    });

    testUser = await User.create({
      fullName: 'Auth Test User',
      email: 'auth.test@example.com',
      password: 'password123',
      role: 'student',
      institute: institute._id,
      approved: true,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Institute.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('Valid Token', () => {
    it('should call next() with valid token', async () => {
      const token = jwt.sign(
        { id: testUser._id, role: testUser.role },
        process.env.JWT_SECRET
      );

      mockReq = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      await auth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user._id.toString()).toBe(testUser._id.toString());
    });

    it('should attach user to request object', async () => {
      const token = jwt.sign(
        { id: testUser._id, role: testUser.role },
        process.env.JWT_SECRET
      );

      mockReq = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      await auth(mockReq, mockRes, mockNext);

      expect(mockReq.user.fullName).toBe('Auth Test User');
      expect(mockReq.user.email).toBe('auth.test@example.com');
      expect(mockReq.user.password).toBeUndefined(); // password should be excluded
    });

    it('should populate institute in user object', async () => {
      const token = jwt.sign(
        { id: testUser._id, role: testUser.role },
        process.env.JWT_SECRET
      );

      mockReq = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      await auth(mockReq, mockRes, mockNext);

      expect(mockReq.user.institute).toBeDefined();
      expect(mockReq.user.institute.name).toBe('Auth Test Institute');
    });
  });

  describe('Missing Token', () => {
    it('should return 401 if no authorization header', async () => {
      mockReq = {
        headers: {},
      };

      await auth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Not authenticated',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', async () => {
      mockReq = {
        headers: {
          authorization: 'invalid-token-format',
        },
      };

      await auth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Not authenticated',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if Bearer prefix missing', async () => {
      const token = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET
      );

      mockReq = {
        headers: {
          authorization: token, // Missing "Bearer " prefix
        },
      };

      await auth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Not authenticated',
      });
    });
  });

  describe('Invalid Token', () => {
    it('should return 401 if token is invalid', async () => {
      mockReq = {
        headers: {
          authorization: 'Bearer invalid.token.here',
        },
      };

      await auth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token is not valid',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token is expired', async () => {
      const expiredToken = jwt.sign(
        { id: testUser._id, role: testUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      mockReq = {
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      };

      await new Promise(resolve => setTimeout(resolve, 100));

      await auth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token is not valid',
      });
    });

    it('should return 401 if token was signed with different secret', async () => {
      const invalidToken = jwt.sign(
        { id: testUser._id, role: testUser.role },
        'different-secret'
      );

      mockReq = {
        headers: {
          authorization: `Bearer ${invalidToken}`,
        },
      };

      await auth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token is not valid',
      });
    });
  });

  describe('User Not Found', () => {
    it('should return 401 if user does not exist', async () => {
      const fakeUserId = new mongoose.Types.ObjectId();
      const token = jwt.sign(
        { id: fakeUserId, role: 'student' },
        process.env.JWT_SECRET
      );

      mockReq = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      await auth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User not found',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
