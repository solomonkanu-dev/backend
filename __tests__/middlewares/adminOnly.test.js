import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { adminOnly } from '../../src/middlewares/adminOnly.js';

describe('Admin Only Middleware', () => {
  let req, res, next;

  beforeAll(() => {
    next = jest.fn();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('adminOnly', () => {
    it('should call next() when user is admin', () => {
      req = {
        user: {
          role: 'admin',
        },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      adminOnly(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should deny access when user is student', () => {
      next.mockClear();
      req = {
        user: {
          role: 'student',
        },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access denied' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when user is lecturer', () => {
      next.mockClear();
      req = {
        user: {
          role: 'lecturer',
        },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access denied' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when user is super_admin', () => {
      next.mockClear();
      req = {
        user: {
          role: 'super_admin',
        },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access denied' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle case-sensitive role check', () => {
      next.mockClear();
      req = {
        user: {
          role: 'Admin', // uppercase A
        },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access with undefined role', () => {
      next.mockClear();
      req = {
        user: {
          role: undefined,
        },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access with null role', () => {
      next.mockClear();
      req = {
        user: {
          role: null,
        },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return response object for method chaining', () => {
      next.mockClear();
      req = {
        user: {
          role: 'lecturer',
        },
      };
      const chainResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      res = chainResponse;

      adminOnly(req, res, next);

      expect(res.status()).toBe(chainResponse);
    });
  });
});
