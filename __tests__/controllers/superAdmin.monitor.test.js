import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import {
  getSubscriptionReport,
  getAcademicReport,
} from '../../src/controllers/superAdmin.controller.js';

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

// next() that rethrows so a failed controller surfaces as a test failure
const rethrow = (err) => {
  throw err;
};

describe('SuperAdmin monitor — subscriptions & academics', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('exports the new monitor controllers', () => {
    expect(getSubscriptionReport).toBeDefined();
    expect(getAcademicReport).toBeDefined();
  });

  it('getSubscriptionReport returns a well-formed SubscriptionReport', async () => {
    const res = mockRes();
    await getSubscriptionReport({ query: {} }, res, rethrow);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);

    const { data } = payload;
    expect(data.summary).toEqual(
      expect.objectContaining({
        mrr: expect.any(Number),
        arr: expect.any(Number),
        activeSubscriptions: expect.any(Number),
        paidSubscriptions: expect.any(Number),
        freeSubscriptions: expect.any(Number),
        expiringSoon: expect.any(Number),
        expired: expect.any(Number),
        unassigned: expect.any(Number),
      })
    );
    expect(Array.isArray(data.byPlan)).toBe(true);
    expect(Array.isArray(data.expiring)).toBe(true);
    expect(Array.isArray(data.expired)).toBe(true);

    // Invariant: active = paid + free
    expect(data.summary.activeSubscriptions).toBe(
      data.summary.paidSubscriptions + data.summary.freeSubscriptions
    );
  });

  it('getSubscriptionReport honours the expiringDays query param', async () => {
    const res = mockRes();
    await getSubscriptionReport({ query: { expiringDays: '7' } }, res, rethrow);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  it('getAcademicReport returns a well-formed AcademicReport', async () => {
    const res = mockRes();
    await getAcademicReport({ query: { months: 6 } }, res, rethrow);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);

    const { data } = payload;
    expect(data.summary).toEqual(
      expect.objectContaining({
        classes: expect.any(Number),
        subjects: expect.any(Number),
        assignments: expect.any(Number),
        assignmentsGraded: expect.any(Number),
        assignmentsPending: expect.any(Number),
        resultsPublished: expect.any(Number),
      })
    );
    expect(Array.isArray(data.gradeDistribution)).toBe(true);
    expect(Array.isArray(data.byInstitute)).toBe(true);
    expect(Array.isArray(data.inactiveInstitutes)).toBe(true);

    // One trend point per month in the requested window
    expect(data.attendanceTrend).toHaveLength(6);
    for (const point of data.attendanceTrend) {
      expect(point).toEqual(
        expect.objectContaining({
          year: expect.any(Number),
          month: expect.any(Number),
        })
      );
      expect(point.month).toBeGreaterThanOrEqual(1);
      expect(point.month).toBeLessThanOrEqual(12);
    }
  });

  it('getAcademicReport clamps the months window', async () => {
    const res = mockRes();
    // 0 is clamped up to 1
    await getAcademicReport({ query: { months: '0' } }, res, rethrow);
    expect(res.json.mock.calls[0][0].data.attendanceTrend).toHaveLength(1);
  });
});
