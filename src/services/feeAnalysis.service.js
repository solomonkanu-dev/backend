import * as repo from '../repositories/feeAnalysis.repository.js';

export const getFeeSummary = async (instituteId) => {
  const result = await repo.aggregateFeeSummary(instituteId);
  return result[0] || {
    totalExpected: 0, totalCollected: 0, totalOutstanding: 0,
    totalStudents: 0, paidCount: 0, partialCount: 0, unpaidCount: 0, collectionRate: 0,
  };
};

export const getFeeByClass = (instituteId) => repo.aggregateFeeByClass(instituteId);

export const getFeeByStatus = (instituteId) => repo.aggregateFeeByStatus(instituteId);

export const getDefaulters = (instituteId, limitParam) => {
  const limit = Math.min(parseInt(limitParam) || 10, 100);
  return repo.findDefaulters(instituteId, limit);
};

export const getCollectionTrend = (instituteId) => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);
  return repo.aggregateCollectionTrend(instituteId, twelveMonthsAgo);
};
