import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import StudentFee from '../../src/models/StudentFee.js';
import FeeParticular from '../../src/models/Fees.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';

describe('StudentFee Model', () => {
  let institute;
  let student;
  let admin;
  let feeParticular;

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

    student = await User.create({
      fullName: 'StudentFee Student',
      email: 'studentfee.student@test.com',
      password: 'password123',
      role: 'student',
      institute: institute._id,
      approved: true,
    });

    admin = await User.create({
      fullName: 'StudentFee Admin',
      email: 'studentfee.admin@test.com',
      password: 'password123',
      role: 'admin',
      institute: institute._id,
      approved: true,
    });

    feeParticular = await FeeParticular.create({
      title: 'Tuition Fee',
      amount: 5000,
      description: 'Monthly tuition',
      institute: institute._id,
      createdBy: admin._id,
    });
  });

  afterAll(async () => {
    await StudentFee.deleteMany({});
    await FeeParticular.deleteMany({});
    await User.deleteMany({ email: /studentfee\./ });
    await Institute.deleteMany({});
    await mongoose.disconnect();
  });

  describe('Create', () => {
    it('should create student fee with valid data', async () => {
      const studentFee = await StudentFee.create({
        student: student._id,
        class: new mongoose.Types.ObjectId(),
        fees: [{ fee: feeParticular._id, amount: 5000 }],
        totalAmount: 5000,
        institute: institute._id,
      });

      expect(studentFee).toBeDefined();
      expect(studentFee._id).toBeDefined();
      expect(studentFee.status).toBe('unpaid');
      expect(studentFee.totalAmount).toBe(5000);
    });

    it('should create student fee with partial status', async () => {
      const studentFee = await StudentFee.create({
        student: student._id,
        class: new mongoose.Types.ObjectId(),
        fees: [{ fee: feeParticular._id, amount: 5000 }],
        totalAmount: 5000,
        status: 'partial',
        institute: institute._id,
      });

      expect(studentFee.status).toBe('partial');
    });

    it('should create student fee with paid status', async () => {
      const studentFee = await StudentFee.create({
        student: student._id,
        class: new mongoose.Types.ObjectId(),
        fees: [{ fee: feeParticular._id, amount: 5000 }],
        totalAmount: 5000,
        status: 'paid',
        institute: institute._id,
      });

      expect(studentFee.status).toBe('paid');
    });

    it('should fail without student', async () => {
      await expect(
        StudentFee.create({
          class: new mongoose.Types.ObjectId(),
          fees: [{ fee: feeParticular._id, amount: 5000 }],
          totalAmount: 5000,
          institute: institute._id,
        })
      ).rejects.toThrow();
    });

    it('should fail without class', async () => {
      await expect(
        StudentFee.create({
          student: student._id,
          fees: [{ fee: feeParticular._id, amount: 5000 }],
          totalAmount: 5000,
          institute: institute._id,
        })
      ).rejects.toThrow();
    });

    it('should fail without institute', async () => {
      await expect(
        StudentFee.create({
          student: student._id,
          class: new mongoose.Types.ObjectId(),
          fees: [{ fee: feeParticular._id, amount: 5000 }],
          totalAmount: 5000,
        })
      ).rejects.toThrow();
    });

    it('should fail with invalid status', async () => {
      await expect(
        StudentFee.create({
          student: student._id,
          class: new mongoose.Types.ObjectId(),
          fees: [{ fee: feeParticular._id, amount: 5000 }],
          totalAmount: 5000,
          status: 'invalid',
          institute: institute._id,
        })
      ).rejects.toThrow();
    });

    it('should default status to unpaid', async () => {
      const studentFee = await StudentFee.create({
        student: student._id,
        class: new mongoose.Types.ObjectId(),
        fees: [{ fee: feeParticular._id, amount: 5000 }],
        totalAmount: 5000,
        institute: institute._id,
      });

      expect(studentFee.status).toBe('unpaid');
    });
  });

  describe('Read', () => {
    let studentFee;

    beforeAll(async () => {
      studentFee = await StudentFee.create({
        student: student._id,
        class: new mongoose.Types.ObjectId(),
        fees: [{ fee: feeParticular._id, amount: 5000 }],
        totalAmount: 5000,
        status: 'unpaid',
        institute: institute._id,
      });
    });

    it('should find student fee by id', async () => {
      const found = await StudentFee.findById(studentFee._id);

      expect(found).toBeDefined();
      expect(found._id).toEqual(studentFee._id);
      expect(found.totalAmount).toBe(5000);
    });

    it('should find student fee by student', async () => {
      const found = await StudentFee.find({ student: student._id });

      expect(found.length).toBeGreaterThanOrEqual(1);
    });

    it('should populate student reference', async () => {
      const found = await StudentFee.findById(studentFee._id).populate(
        'student'
      );

      expect(found.student.fullName).toBe('StudentFee Student');
    });

    it('should populate fee reference within fees array', async () => {
      const found = await StudentFee.findById(studentFee._id).populate(
        'fees.fee'
      );

      expect(found.fees[0].fee.title).toBe('Tuition Fee');
    });

    it('should populate institute reference', async () => {
      const found = await StudentFee.findById(studentFee._id).populate(
        'institute'
      );

      expect(found.institute.name).toBe('Test Institute');
    });

    it('should find student fees by status', async () => {
      const found = await StudentFee.find({
        student: student._id,
        status: 'unpaid',
      });

      expect(found.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Update', () => {
    let studentFee;

    beforeAll(async () => {
      studentFee = await StudentFee.create({
        student: student._id,
        class: new mongoose.Types.ObjectId(),
        fees: [{ fee: feeParticular._id, amount: 5000 }],
        totalAmount: 5000,
        status: 'unpaid',
        institute: institute._id,
      });
    });

    it('should update status to partial', async () => {
      const updated = await StudentFee.findByIdAndUpdate(
        studentFee._id,
        { status: 'partial' },
        { new: true }
      );

      expect(updated.status).toBe('partial');
    });

    it('should update status to paid', async () => {
      const updated = await StudentFee.findByIdAndUpdate(
        studentFee._id,
        { status: 'paid' },
        { new: true }
      );

      expect(updated.status).toBe('paid');
    });

    it('should update amount', async () => {
      const updated = await StudentFee.findByIdAndUpdate(
        studentFee._id,
        { totalAmount: 6000 },
        { new: true }
      );

      expect(updated.totalAmount).toBe(6000);
    });

    it('should fail to update with invalid status', async () => {
      await expect(
        StudentFee.findByIdAndUpdate(
          studentFee._id,
          { status: 'invalid' },
          { new: true, runValidators: true }
        )
      ).rejects.toThrow();
    });
  });

  describe('Delete', () => {
    it('should delete student fee', async () => {
      const studentFee = await StudentFee.create({
        student: student._id,
        class: new mongoose.Types.ObjectId(),
        fees: [{ fee: feeParticular._id, amount: 5000 }],
        totalAmount: 5000,
        institute: institute._id,
      });

      await StudentFee.findByIdAndDelete(studentFee._id);

      const found = await StudentFee.findById(studentFee._id);
      expect(found).toBeNull();
    });

    it('should delete multiple student fees for student', async () => {
      const tempStudent = await User.create({
        fullName: 'Temp Student',
        email: 'studentfee.temp@test.com',
        password: 'password123',
        role: 'student',
        institute: institute._id,
        approved: true,
      });

      await StudentFee.create({
        student: tempStudent._id,
        class: new mongoose.Types.ObjectId(),
        fees: [{ fee: feeParticular._id, amount: 5000 }],
        totalAmount: 5000,
        institute: institute._id,
        assignedBy: admin._id,
      });

      await StudentFee.deleteMany({ student: tempStudent._id });
      const found = await StudentFee.find({ student: tempStudent._id });

      expect(found).toHaveLength(0);

      await User.findByIdAndDelete(tempStudent._id);
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt', async () => {
      const studentFee = await StudentFee.create({
        student: student._id,
        class: new mongoose.Types.ObjectId(),
        fees: [{ fee: feeParticular._id, amount: 5000 }],
        totalAmount: 5000,
        institute: institute._id,
        assignedBy: admin._id,
      });

      expect(studentFee.createdAt).toBeDefined();
      expect(studentFee.updatedAt).toBeDefined();
    });

    it('should update updatedAt on modification', async () => {
      const studentFee = await StudentFee.create({
        student: student._id,
        class: new mongoose.Types.ObjectId(),
        fees: [{ fee: feeParticular._id, amount: 5000 }],
        totalAmount: 5000,
        status: 'unpaid',
        institute: institute._id,
        assignedBy: admin._id,
      });

      const originalTime = studentFee.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      await StudentFee.findByIdAndUpdate(
        studentFee._id,
        { status: 'paid' }
      );

      const updated = await StudentFee.findById(studentFee._id);

      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        originalTime.getTime()
      );
    });
  });
});
