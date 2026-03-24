import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, jest } from '@jest/globals';
import { login, getMe, logout } from '../../src/controllers/auth.controller.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

describe('Auth Controller', () => {
  let mockReq;
  let mockRes;
  let testUser;
  let institute;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    institute = await Institute.create({
      name: 'Auth Controller Test Institute',
      address: '123 Auth St',
      phoneNumber: '1234567890',
      targetLine: 'Security',
      admin: new mongoose.Types.ObjectId(),
    });
  });

  beforeEach(async () => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
    };

    testUser = await User.create({
      fullName: 'Test Auth User',
      email: 'auth.user@example.com',
      password: 'password123',
      role: 'student',
      institute: institute._id,
      approved: true,
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await Institute.deleteMany({});
    await mongoose.disconnect();
  });

  describe('Login', () => {
    it('should login user with valid credentials', async () => {
      mockReq = {
        body: {
          email: 'auth.user@example.com',
          password: 'password123',
        },
      };

      await login(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.token).toBeDefined();
      expect(responseData.user).toBeDefined();
      expect(responseData.user.email).toBe('auth.user@example.com');
    });

    it('should return 401 with invalid email', async () => {
      mockReq = {
        body: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid credentials',
      });
    });

    it('should return 401 with invalid password', async () => {
      mockReq = {
        body: {
          email: 'auth.user@example.com',
          password: 'wrongpassword',
        },
      };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid credentials',
      });
    });

    it('should return 403 if user account is not approved', async () => {
      const unapprovedUser = await User.create({
        fullName: 'Unapproved User',
        email: 'unapproved@example.com',
        password: 'password123',
        role: 'admin',
        approved: false,
      });

      mockReq = {
        body: {
          email: 'unapproved@example.com',
          password: 'password123',
        },
      };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Account pending approval',
      });
    });

    it('should return valid JWT token', async () => {
      mockReq = {
        body: {
          email: 'auth.user@example.com',
          password: 'password123',
        },
      };

      await login(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      const decoded = jwt.verify(responseData.token, process.env.JWT_SECRET);

      expect(decoded.id).toBe(testUser._id.toString());
      expect(decoded.role).toBe('student');
    });

    it('should return user data in response', async () => {
      mockReq = {
        body: {
          email: 'auth.user@example.com',
          password: 'password123',
        },
      };

      await login(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.user.email).toBe('auth.user@example.com');
      expect(responseData.user.fullName).toBe('Test Auth User');
    });
  });

  describe('GetMe', () => {
    it('should return authenticated user data', async () => {
      mockReq = {
        user: {
          id: testUser._id,
        },
      };

      await getMe(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.email).toBe('auth.user@example.com');
      expect(responseData.fullName).toBe('Test Auth User');
    });

    it('should not return password in response', async () => {
      mockReq = {
        user: {
          id: testUser._id,
        },
      };

      await getMe(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.password).toBeUndefined();
    });

    it('should return user role', async () => {
      mockReq = {
        user: {
          id: testUser._id,
        },
      };

      await getMe(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.role).toBe('student');
    });
  });

  describe('Logout', () => {
    it('should clear authToken cookie', () => {
      mockReq = {};

      logout(mockReq, mockRes);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'token',
        '',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        })
      );
    });

    it('should set secure cookie in production', () => {
      process.env.NODE_ENV = 'production';

      logout(mockReq, mockRes);

      const cookieCall = mockRes.cookie.mock.calls[0];
      expect(cookieCall[2].secure).toBe(true);
    });

    it('should set sameSite to lax', () => {
      logout(mockReq, mockRes);

      const cookieCall = mockRes.cookie.mock.calls[0];
      expect(cookieCall[2].sameSite).toBe('lax');
    });

    it('should return success message', () => {
      logout(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Logged out successfully',
        statusCode: 200,
      }));
    });
  });
});
