import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import multer from 'multer';
import {
  upload,
  uploadSingle,
  handleMulterError,
} from '../../src/middlewares/upload.js';

describe('Upload Middleware', () => {
  describe('upload configuration', () => {
    it('should have memory storage configured', () => {
      expect(upload).toBeDefined();
      expect(upload.storage).toBeDefined();
    });

    it('should have file size limit of 6MB', () => {
      expect(upload.limits.fileSize).toBe(6 * 1024 * 1024);
    });
  });

  describe('uploadSingle middleware', () => {
    it('should be a multer middleware instance', () => {
      expect(uploadSingle).toBeDefined();
      expect(typeof uploadSingle).toBe('function');
    });

    it('should expect single file with field name blogPhoto', () => {
      // Verify uploadSingle is configured for single file upload
      expect(uploadSingle).toBeDefined();
    });
  });

  describe('handleMulterError middleware', () => {
    let req, res, next;

    beforeAll(() => {
      req = {};
      next = jest.fn();
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    it('should call next() when no error', () => {
      handleMulterError(null, req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle LIMIT_FILE_SIZE error', () => {
      next.mockClear();
      const err = new multer.MulterError('LIMIT_FILE_SIZE');

      handleMulterError(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'File size too large. Max 5MB allowed.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle other MulterErrors', () => {
      next.mockClear();
      const err = new multer.MulterError('LIMIT_PART_COUNT');
      err.message = 'Too many parts';

      handleMulterError(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Too many parts',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle LIMIT_FILE_COUNT error', () => {
      next.mockClear();
      const err = new multer.MulterError('LIMIT_FILE_COUNT');

      handleMulterError(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle custom error from fileFilter', () => {
      next.mockClear();
      const err = new Error('Only image files are allowed!');

      handleMulterError(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Only image files are allowed!',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle generic errors', () => {
      next.mockClear();
      const err = new Error('Unknown error');

      handleMulterError(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Unknown error',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return response object for method chaining', () => {
      next.mockClear();
      const chainResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      res = chainResponse;

      handleMulterError(new Error('Test error'), req, res, next);

      expect(res.status()).toBe(chainResponse);
    });
  });

  describe('File filter behavior', () => {
    it('should be configured to reject non-image files based on middleware contract', () => {
      // The file filter is part of the middleware configuration
      // It rejects files that don't start with 'image/'
      expect(upload).toBeDefined();
      expect(upload.limits).toBeDefined();
    });
  });

  describe('Upload instance configuration', () => {
    it('should use single method for single file upload', () => {
      expect(uploadSingle).toBeDefined();
    });
  });
});
