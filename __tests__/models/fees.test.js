import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import FeeParticular from '../../src/models/Fees.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';

describe('FeeParticular Model', () => {
  let institute;
  let admin;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    institute = await Institute.create({
      name: 'Test Institute',
      address: '123 Main St',
      phoneNumber: '1234567890',
      targetLine: 'Test',
      admin: new mongoose.Types.ObjectId(),
    });

    admin = await User.create({
      fullName: 'Fee Admin',
      email: 'fee.admin@test.com',
      password: 'password123',
      role: 'admin',
      institute: institute._id,
      approved: true,
    });
  });

  afterAll(async () => {
    await FeeParticular.deleteMany({});
    await User.deleteMany({ email: /fee\./ });
    await Institute.deleteMany({});
    await mongoose.disconnect();
  });

  describe('Create', () => {
    it('should create fee particular with valid data', async () => {
      const unique = Date.now();
      const fee = await FeeParticular.create({
        title: `Tuition Fee ${unique}`,
        amount: 5000,
        description: 'Monthly tuition',
        institute: institute._id,
        createdBy: admin._id,
      });

      expect(fee).toBeDefined();
      expect(fee._id).toBeDefined();
      expect(fee.title).toBe(`Tuition Fee ${unique}`);
      expect(fee.amount).toBe(5000);
    });

    it('should create fee without optional fields', async () => {
      const unique = Date.now() + 1;
      const fee = await FeeParticular.create({
        title: `Lab Fee ${unique}`,
        amount: 1000,
        institute: institute._id,
        createdBy: admin._id,
      });

      expect(fee).toBeDefined();
      expect(fee.title).toBe(`Lab Fee ${unique}`);
    });

    it('should fail to create fee without title', async () => {
      const unique = Date.now() + 2;
      await expect(
        FeeParticular.create({
          amount: 5000,
          description: 'No title',
          institute: institute._id,
          createdBy: admin._id,
        })
      ).rejects.toThrow();
    });

    it('should fail to create fee without amount', async () => {
      const unique = Date.now() + 3;
      await expect(
        FeeParticular.create({
          title: `Test Fee ${unique}`,
          institute: institute._id,
          createdBy: admin._id,
        })
      ).rejects.toThrow();
    });

    it('should fail to create fee without institute', async () => {
      const unique = Date.now() + 4;
      await expect(
        FeeParticular.create({
          title: `Test Fee ${unique}`,
          amount: 5000,
          createdBy: admin._id,
        })
      ).rejects.toThrow();
    });

    it('should fail to create fee without createdBy', async () => {
      const unique = Date.now() + 5;
      await expect(
        FeeParticular.create({
          title: `Test Fee ${unique}`,
          amount: 5000,
          institute: institute._id,
        })
      ).rejects.toThrow();
    });

    it('should fail with negative amount', async () => {
      const unique = Date.now() + 6;
      await expect(
        FeeParticular.create({
          title: `Negative Fee ${unique}`,
          amount: -100,
          institute: institute._id,
          createdBy: admin._id,
        })
      ).rejects.toThrow();
    });

    it('should trim title', async () => {
      const unique = Date.now() + 7;
      const fee = await FeeParticular.create({
        title: `  Tuition Fee ${unique}  `,
        amount: 5000,
        institute: institute._id,
        createdBy: admin._id,
      });

      expect(fee.title).toBe(`Tuition Fee ${unique}`);
    });
  });

  describe('Read', () => {
    let fee;

    beforeAll(async () => {
      fee = await FeeParticular.create({
        title: 'Semester Fee',
        amount: 10000,
        institute: institute._id,
        createdBy: admin._id,
      });
    });

    it('should find fee by id', async () => {
      const found = await FeeParticular.findById(fee._id);

      expect(found).toBeDefined();
      expect(found._id).toEqual(fee._id);
      expect(found.title).toBe('Semester Fee');
    });

    it('should find fee by title', async () => {
      const found = await FeeParticular.findOne({ title: 'Semester Fee' });

      expect(found).toBeDefined();
      expect(found.amount).toBe(10000);
    });

    it('should populate institute reference', async () => {
      const found = await FeeParticular.findById(fee._id).populate(
        'institute'
      );

      expect(found.institute.name).toBe('Test Institute');
    });

    it('should populate createdBy reference', async () => {
      const found = await FeeParticular.findById(fee._id).populate(
        'createdBy'
      );

      expect(found.createdBy.fullName).toBe('Fee Admin');
    });

    it('should find all fees for an institute', async () => {
      const fees = await FeeParticular.find({ institute: institute._id });

      expect(fees.length).toBeGreaterThanOrEqual(1);
      expect(fees.some((f) => f.title === 'Semester Fee')).toBe(true);
    });
  });

  describe('Update', () => {
    let fee;

    beforeAll(async () => {
      fee = await FeeParticular.create({
        title: 'Original Title',
        amount: 5000,
        description: 'Original description',
        institute: institute._id,
        createdBy: admin._id,
      });
    });

    it('should update fee title', async () => {
      const updated = await FeeParticular.findByIdAndUpdate(
        fee._id,
        { title: 'Updated Title' },
        { new: true }
      );

      expect(updated.title).toBe('Updated Title');
    });

    it('should update fee amount', async () => {
      const updated = await FeeParticular.findByIdAndUpdate(
        fee._id,
        { amount: 8000 },
        { new: true }
      );

      expect(updated.amount).toBe(8000);
    });

    it('should not allow negative amount in update', async () => {
      await expect(
        FeeParticular.findByIdAndUpdate(
          fee._id,
          { amount: -500 },
          { new: true, runValidators: true }
        )
      ).rejects.toThrow();
    });
  });

  describe('Delete', () => {
    it('should delete fee particular', async () => {
      const fee = await FeeParticular.create({
        title: 'Fee to Delete',
        amount: 1000,
        institute: institute._id,
        createdBy: admin._id,
      });

      await FeeParticular.findByIdAndDelete(fee._id);

      const found = await FeeParticular.findById(fee._id);
      expect(found).toBeNull();
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt', async () => {
      const fee = await FeeParticular.create({
        title: 'Timestamp Test Fee',
        amount: 5000,
        institute: institute._id,
        createdBy: admin._id,
      });

      expect(fee.createdAt).toBeDefined();
      expect(fee.updatedAt).toBeDefined();
    });
  });
});
