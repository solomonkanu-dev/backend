import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import errorHandler from '../../src/middlewares/errorHandler.js';
import * as loggerModule from '../../src/utils/logger.js';

// Mock logger methods
const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Replace logger temporarily in tests
const originalError = loggerModule.default.error;
const originalInfo = loggerModule.default.info;
const originalWarn = loggerModule.default.warn;
const originalDebug = loggerModule.default.debug;

describe('Error Handler Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    // Mock logger methods
    loggerModule.default.error = jest.fn();
  });

  afterEach(() => {
    // Restore original methods
    loggerModule.default.error = originalError;
    loggerModule.default.info = originalInfo;
    loggerModule.default.warn = originalWarn;
    loggerModule.default.debug = originalDebug;
  });

  describe('Error Logging', () => {
    it('should log error to logger', () => {
      const error = new Error('Test error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(loggerModule.default.error).toHaveBeenCalledWith(error);
    });

    it('should log error with custom message', () => {
      const error = new Error('Custom error message');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(loggerModule.default.error).toHaveBeenCalledWith(error);
    });
  });

  describe('Error Response Status', () => {
    it('should return 500 status code by default', () => {
      const error = new Error('Internal Server Error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should return custom status code if error has status', () => {
      const error = new Error('Unauthorized');
      error.status = 401;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return custom status code from error property', () => {
      const error = new Error('Bad Request');
      error.status = 400;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Error Response Body', () => {
    it('should return error message in response', () => {
      const error = new Error('Test error message');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Test error message',
      });
    });

    it('should return generic message if error has no message', () => {
      const error = new Error();
      error.message = '';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error',
      });
    });

    it('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Development error');
      error.stack = 'Error: Development error\n  at ...:1:1';

      errorHandler(error, mockReq, mockRes, mockNext);

      const callArg = mockRes.json.mock.calls[0][0];
      expect(callArg).toHaveProperty('stack');
      expect(callArg.stack).toBe('Error: Development error\n  at ...:1:1');
    });

    it('should not include stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Production error');
      error.stack = 'Error: Production error\n  at ...:1:1';

      errorHandler(error, mockReq, mockRes, mockNext);

      const callArg = mockRes.json.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('stack');
    });

    it('should set success to false', () => {
      const error = new Error('Test error');

      errorHandler(error, mockReq, mockRes, mockNext);

      const callArg = mockRes.json.mock.calls[0][0];
      expect(callArg.success).toBe(false);
    });
  });

  describe('Various Error Types', () => {
    it('should handle ValidationError', () => {
      const error = new Error('Validation failed');
      error.status = 422;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(422);
    });

    it('should handle NotFoundError', () => {
      const error = new Error('Resource not found');
      error.status = 404;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle TypeError', () => {
      const error = new TypeError('Cannot read property');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Cannot read property',
        })
      );
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Generic error',
        })
      );
    });
  });
});
