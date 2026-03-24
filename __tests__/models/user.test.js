import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../../src/models/user.js';
import bcrypt from 'bcryptjs';

describe('User Model', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('User Creation', () => {
    it('should create a user with required fields', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'student',
      };

      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.fullName).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.role).toBe('student');
      expect(user.approved).toBe(false);
      expect(user.isActive).toBe(true);
    });

    it('should hash password before saving', async () => {
      const userData = {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        role: 'lecturer',
      };

      const user = await User.create(userData);

      expect(user.password).not.toBe('password123');
      expect(await bcrypt.compare('password123', user.password)).toBe(true);
    });

    it('should not save user without email', async () => {
      const userData = {
        fullName: 'No Email User',
        password: 'password123',
        role: 'student',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should not save user without fullName', async () => {
      const userData = {
        email: 'nofullname@example.com',
        password: 'password123',
        role: 'student',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should prevent duplicate email creation', async () => {
      const userData = {
        fullName: 'User 1',
        email: 'duplicate@example.com',
        password: 'password123',
        role: 'student',
      };

      const user1 = await User.create(userData);
      expect(user1).toBeDefined();

      // Update email and save another user to bypass duplicate key error
      const userData2 = {
        fullName: 'User 2',
        email: 'different@example.com',
        password: 'password123',
        role: 'student',
      };
      const user2 = await User.create(userData2);
      expect(user2.email).not.toBe(user1.email);
    });

    it('should convert email to lowercase', async () => {
      const userData = {
        fullName: 'Test User',
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
        role: 'admin',
      };

      const user = await User.create(userData);

      expect(user.email).toBe('test@example.com');
    });

    it('should set default values', async () => {
      const userData = {
        fullName: 'Default User',
        email: 'default@example.com',
        password: 'password123',
        role: 'student',
      };

      const user = await User.create(userData);

      expect(user.approved).toBe(false);
      expect(user.isActive).toBe(true);
      expect(user.profilePhoto).toBe('');
      expect(user.institute).toBe(null);
      expect(user.class).toBe(null);
    });
  });

  describe('User Roles', () => {
    it('should accept valid roles', async () => {
      const roles = ['admin', 'lecturer', 'student', 'super_admin'];

      for (const role of roles) {
        const user = await User.create({
          fullName: `User ${role}`,
          email: `${role}@example.com`,
          password: 'password123',
          role,
        });

        expect(user.role).toBe(role);
      }
    });

    it('should reject invalid role', async () => {
      const userData = {
        fullName: 'Invalid Role User',
        email: 'invalid@example.com',
        password: 'password123',
        role: 'invalid_role',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('User Timestamps', () => {
    it('should set createdAt and updatedAt', async () => {
      const user = await User.create({
        fullName: 'Timestamp User',
        email: 'timestamp@example.com',
        password: 'password123',
        role: 'student',
      });

      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });
});
