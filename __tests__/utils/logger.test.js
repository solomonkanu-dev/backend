import { describe, it, expect } from '@jest/globals';
import logger from '../../src/utils/logger.js';

describe('Logger Utility', () => {
  describe('Logger Creation', () => {
    it('should create a logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should have log methods', () => {
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
    });
  });

  describe('Logger Methods', () => {
    it('should not throw when logging info level messages', () => {
      expect(() => {
        logger.info('Test info message');
      }).not.toThrow();
    });

    it('should not throw when logging error level messages', () => {
      expect(() => {
        logger.error('Test error message');
      }).not.toThrow();
    });

    it('should not throw when logging warning level messages', () => {
      expect(() => {
        logger.warn('Test warning message');
      }).not.toThrow();
    });

    it('should not throw when logging debug level messages', () => {
      expect(() => {
        logger.debug('Test debug message');
      }).not.toThrow();
    });
  });

  describe('Logger with Error Objects', () => {
    it('should handle error objects without throwing', () => {
      const error = new Error('Test error');
      expect(() => {
        logger.error(error);
      }).not.toThrow();
    });

    it('should handle string messages without throwing', () => {
      expect(() => {
        logger.info('String message');
      }).not.toThrow();
    });

    it('should handle object data without throwing', () => {
      expect(() => {
        logger.info({ userId: 123, action: 'login' });
      }).not.toThrow();
    });
  });
});
