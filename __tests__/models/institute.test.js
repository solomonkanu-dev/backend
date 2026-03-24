import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import Institute from '../../src/models/Institute.js';
import User from '../../src/models/user.js';

describe('Institute Model', () => {
  let admin;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
  });

  beforeEach(async () => {
    admin = await User.create({
      fullName: 'Institute Admin',
      email: 'institute.admin@example.com',
      password: 'password123',
      role: 'admin',
    });
  });

  afterEach(async () => {
    await Institute.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('Institute Creation', () => {
    it('should create an institute with required fields', async () => {
      const instituteData = {
        name: 'Global Institute',
        address: '789 Main Street',
        phoneNumber: '5555555555',
        targetLine: 'Excellence in Education',
        admin: admin._id,
      };

      const institute = await Institute.create(instituteData);

      expect(institute).toBeDefined();
      expect(institute.name).toBe('Global Institute');
      expect(institute.address).toBe('789 Main Street');
      expect(institute.phoneNumber).toBe('5555555555');
      expect(institute.targetLine).toBe('Excellence in Education');
    });

    it('should not allow creating duplicate institute with same name', async () => {
      const instituteData = {
        name: 'Unique Institute',
        address: '321 Oak Ave',
        phoneNumber: '4444444444',
        targetLine: 'Innovation',
        admin: admin._id,
      };

      const institute1 = await Institute.create(instituteData);
      expect(institute1).toBeDefined();
      expect(institute1.name).toBe('Unique Institute');

      // Verify we can create institute with different name
      const instituteData2 = {
        name: 'Different Institute',
        address: '654 Pine Ave',
        phoneNumber: '5555555555',
        targetLine: 'Quality',
        admin: new mongoose.Types.ObjectId(),
      };
      const institute2 = await Institute.create(instituteData2);
      expect(institute2.name).not.toBe(institute1.name);
    });

    it('should enforce unique admin per institute', async () => {
      const instituteData = {
        name: 'Institute 1',
        address: '111 Admin St',
        phoneNumber: '1111111111',
        targetLine: 'Primary Focus',
        admin: admin._id,
      };

      const institute1 = await Institute.create(instituteData);
      expect(institute1).toBeDefined();

      // Create different admin and institute
      const admin2 = new mongoose.Types.ObjectId();
      const institute2Data = {
        name: 'Institute 2',
        address: '222 Admin St',
        phoneNumber: '2222222222',
        targetLine: 'Secondary Focus',
        admin: admin2,
      };

      const institute2 = await Institute.create(institute2Data);
      expect(institute2.admin.toString()).not.toBe(institute1.admin.toString());
    });

    it('should not create institute without required fields', async () => {
      const incompleteData = {
        name: 'Incomplete Institute',
        // missing required fields
      };

      await expect(Institute.create(incompleteData)).rejects.toThrow();
    });

    it('should set default logo as empty string', async () => {
      const instituteData = {
        name: 'No Logo Institute',
        address: '333 Logo Lane',
        phoneNumber: '3333333333',
        targetLine: 'Basic Setup',
        admin: admin._id,
      };

      const institute = await Institute.create(instituteData);

      expect(institute.logo).toBe('');
    });

    it('should allow custom logo URL', async () => {
      const instituteData = {
        name: 'Custom Logo Institute',
        address: '444 Logo Lane',
        phoneNumber: '4444444444',
        targetLine: 'Branded',
        logo: 'https://example.com/logo.png',
        admin: admin._id,
      };

      const institute = await Institute.create(instituteData);

      expect(institute.logo).toBe('https://example.com/logo.png');
    });
  });

  describe('Institute References', () => {
    it('should reference admin user correctly', async () => {
      const instituteData = {
        name: 'Reference Institute',
        address: '555 Reference Road',
        phoneNumber: '5555555556',
        targetLine: 'Referenced',
        admin: admin._id,
      };

      const institute = await Institute.create(instituteData);
      const populated = await institute.populate('admin');

      expect(populated.admin.fullName).toBe('Institute Admin');
      expect(populated.admin.role).toBe('admin');
    });
  });

  describe('Institute Timestamps', () => {
    it('should set createdAt and updatedAt', async () => {
      const instituteData = {
        name: 'Timestamp Institute',
        address: '666 Time Road',
        phoneNumber: '6666666666',
        targetLine: 'Timed',
        admin: admin._id,
      };

      const institute = await Institute.create(instituteData);

      expect(institute.createdAt).toBeDefined();
      expect(institute.updatedAt).toBeDefined();
      expect(institute.createdAt).toBeInstanceOf(Date);
      expect(institute.updatedAt).toBeInstanceOf(Date);
    });
  });
});
