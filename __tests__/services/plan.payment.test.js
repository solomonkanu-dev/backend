import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import * as planService from '../../src/services/plan.service.js';
import { handleWebhookEvent } from '../../src/services/plan.service.js';
import Plan from '../../src/models/Plan.js';
import Institute from '../../src/models/Institute.js';
import User from '../../src/models/user.js';
import AcademicTerm from '../../src/models/AcademicTerm.js';
import PlanPayment from '../../src/models/PlanPayment.js';

const cleanup = async () => {
  await PlanPayment.deleteMany({});
  await AcademicTerm.deleteMany({ name: /Payment Test/ });
  await Institute.deleteMany({ name: /Payment Test/ });
  await User.deleteMany({ email: /payment\.test/ });
};

describe('Plan payment service', () => {
  let admin;
  let superAdmin;
  let institute;
  let term;
  let plan;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    await Plan.updateOne(
      { name: 'free' },
      { name: 'free', displayName: 'Free', price: 0,
        limits: { maxStudents: 40, maxLecturers: 5, maxClasses: 3, maxStorageMB: 100 } },
      { upsert: true }
    );
    await Plan.updateOne(
      { name: 'standard' },
      { name: 'standard', displayName: 'Standard', price: 100,
        limits: { maxStudents: 100000, maxLecturers: 1000, maxClasses: 1000, maxStorageMB: 10000 } },
      { upsert: true }
    );
    plan = await Plan.findOne({ name: 'standard' });
  });

  beforeEach(async () => {
    await cleanup();
    // Distinct qrTokens — the User collection has a unique index on qrToken.
    admin = await User.create({
      fullName: 'Pay Admin', email: 'admin.payment.test@example.com',
      password: 'password123', role: 'admin', qrToken: 'qr-pt-admin',
    });
    superAdmin = await User.create({
      fullName: 'Pay Super', email: 'super.payment.test@example.com',
      password: 'password123', role: 'super_admin', qrToken: 'qr-pt-super',
    });
    institute = await Institute.create({
      name: 'Payment Test Institute', address: '1 Test St',
      phoneNumber: '000', targetLine: 'Testing', admin: admin._id,
    });
    admin.institute = institute._id;
    await admin.save();
    term = await AcademicTerm.create({
      name: 'Payment Test Term', type: 'term', academicYear: '2026',
      startDate: new Date('2026-01-01'), endDate: new Date('2026-04-30'),
      isCurrent: true, institute: institute._id,
    });
  });

  afterAll(async () => {
    await cleanup();
    await mongoose.disconnect();
  });

  it('records a manual cash payment, activates the plan and issues a receipt', async () => {
    const req = { user: { _id: superAdmin._id, role: 'super_admin' } };
    const payment = await planService.recordManualPayment(
      { instituteId: institute._id.toString(), studentCount: 30, method: 'cash' },
      req
    );

    expect(payment.status).toBe('completed');
    expect(payment.channel).toBe('manual');
    expect(payment.amount).toBe(30 * plan.price);
    expect(payment.receiptNumber).toMatch(/^SUB-\d{4}-\d{5}$/);

    const fresh = await Institute.findById(institute._id).populate('plan');
    expect(fresh.plan.name).toBe('standard');
    expect(fresh.subscription.studentsPaidFor).toBe(30);
    expect(new Date(fresh.planExpiry).toDateString()).toBe(
      new Date(term.endDate).toDateString()
    );
  });

  it('rejects an invalid manual payment method', async () => {
    const req = { user: { _id: superAdmin._id, role: 'super_admin' } };
    await expect(
      planService.recordManualPayment(
        { instituteId: institute._id.toString(), studentCount: 10, method: 'card' },
        req
      )
    ).rejects.toThrow(/cash or bank_transfer/i);
  });

  it('handleWebhookEvent activates a pending payment and is idempotent', async () => {
    const pending = await PlanPayment.create({
      institute: institute._id, plan: plan._id, term: term._id,
      studentCount: 50, pricePerStudent: plan.price, amount: 50 * plan.price,
      method: 'card', channel: 'online', status: 'pending', monimeSessionId: 'sess_test_1',
    });
    const event = {
      type: 'checkout_session.completed',
      data: { metadata: { planPaymentId: pending._id.toString() } },
    };

    await handleWebhookEvent(event);
    const afterFirst = await PlanPayment.findById(pending._id);
    expect(afterFirst.status).toBe('completed');
    expect(afterFirst.receiptNumber).toBeTruthy();
    const receipt1 = afterFirst.receiptNumber;
    const paidAt1 = afterFirst.paidAt.getTime();

    // Second delivery of the same webhook must be a no-op
    await handleWebhookEvent(event);
    const afterSecond = await PlanPayment.findById(pending._id);
    expect(afterSecond.status).toBe('completed');
    expect(afterSecond.receiptNumber).toBe(receipt1);
    expect(afterSecond.paidAt.getTime()).toBe(paidAt1);
  });

  it('createCheckout requires a current academic term', async () => {
    await AcademicTerm.updateOne({ _id: term._id }, { isCurrent: false });
    const user = { _id: admin._id, institute: institute._id, role: 'admin' };
    await expect(
      planService.createCheckout(20, user, 'https://example.com')
    ).rejects.toThrow(/current academic term/i);
  });

  it('createCheckout rejects a student count below live enrolment', async () => {
    await User.create(
      [1, 2, 3, 4, 5].map((n) => ({
        fullName: `Stu ${n}`, email: `s${n}.payment.test@example.com`,
        password: 'password123', role: 'student', institute: institute._id,
        qrToken: `qr-pt-s${n}`,
      }))
    );
    const user = { _id: admin._id, institute: institute._id, role: 'admin' };
    await expect(
      planService.createCheckout(3, user, 'https://example.com')
    ).rejects.toThrow(/at least/i);
  });

  it('getBillingSummary returns live count, rate and current term', async () => {
    await User.create(
      [1, 2, 3].map((n) => ({
        fullName: `Bil ${n}`, email: `b${n}.payment.test@example.com`,
        password: 'password123', role: 'student', institute: institute._id,
        qrToken: `qr-pt-b${n}`,
      }))
    );
    const summary = await planService.getBillingSummary({
      _id: admin._id, institute: institute._id, role: 'admin',
    });
    expect(summary.liveStudentCount).toBe(3);
    expect(summary.pricePerStudent).toBe(plan.price);
    expect(summary.currentTerm).not.toBeNull();
    expect(summary.currentTerm.name).toBe('Payment Test Term');
  });

  it('getMyPlan flags an expired subscription', async () => {
    await Institute.updateOne(
      { _id: institute._id },
      { plan: plan._id, planExpiry: new Date('2020-01-01'),
        subscription: { studentsPaidFor: 50 } }
    );
    const result = await planService.getMyPlan(
      { _id: superAdmin._id, role: 'super_admin' },
      institute._id.toString()
    );
    expect(result.expired).toBe(true);
    expect(result.plan.name).toBe('standard');
  });
});
