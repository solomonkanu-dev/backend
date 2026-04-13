import StudentFee from '../models/StudentFee.js';
import mongoose from 'mongoose';

export const aggregateFeeSummary = (instituteId) =>
  StudentFee.aggregate([
    { $match: { institute: new mongoose.Types.ObjectId(instituteId) } },
    {
      $group: {
        _id: null,
        totalExpected: { $sum: '$totalAmount' },
        totalCollected: { $sum: { $subtract: ['$totalAmount', '$balance'] } },
        totalOutstanding: { $sum: '$balance' },
        totalStudents: { $sum: 1 },
        paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
        partialCount: { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
        unpaidCount: { $sum: { $cond: [{ $eq: ['$status', 'unpaid'] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        totalExpected: 1,
        totalCollected: 1,
        totalOutstanding: 1,
        totalStudents: 1,
        paidCount: 1,
        partialCount: 1,
        unpaidCount: 1,
        collectionRate: {
          $cond: [
            { $gt: ['$totalExpected', 0] },
            { $round: [{ $multiply: [{ $divide: ['$totalCollected', '$totalExpected'] }, 100] }, 2] },
            0,
          ],
        },
      },
    },
  ]);

export const aggregateFeeByClass = (instituteId) =>
  StudentFee.aggregate([
    { $match: { institute: new mongoose.Types.ObjectId(instituteId) } },
    {
      $group: {
        _id: '$class',
        totalExpected: { $sum: '$totalAmount' },
        totalCollected: { $sum: { $subtract: ['$totalAmount', '$balance'] } },
        totalOutstanding: { $sum: '$balance' },
        totalStudents: { $sum: 1 },
        paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
        partialCount: { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
        unpaidCount: { $sum: { $cond: [{ $eq: ['$status', 'unpaid'] }, 1, 0] } },
      },
    },
    { $lookup: { from: 'classes', localField: '_id', foreignField: '_id', as: 'classInfo' } },
    { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        classId: '$_id',
        className: '$classInfo.name',
        totalExpected: 1,
        totalCollected: 1,
        totalOutstanding: 1,
        totalStudents: 1,
        paidCount: 1,
        partialCount: 1,
        unpaidCount: 1,
        collectionRate: {
          $cond: [
            { $gt: ['$totalExpected', 0] },
            { $round: [{ $multiply: [{ $divide: ['$totalCollected', '$totalExpected'] }, 100] }, 2] },
            0,
          ],
        },
      },
    },
    { $sort: { totalOutstanding: -1 } },
  ]);

export const aggregateFeeByStatus = (instituteId) =>
  StudentFee.aggregate([
    { $match: { institute: new mongoose.Types.ObjectId(instituteId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalCollected: { $sum: { $subtract: ['$totalAmount', '$balance'] } },
        totalOutstanding: { $sum: '$balance' },
      },
    },
    {
      $project: {
        _id: 0,
        status: '$_id',
        count: 1,
        totalAmount: 1,
        totalCollected: 1,
        totalOutstanding: 1,
      },
    },
    { $sort: { status: 1 } },
  ]);

export const findDefaulters = (instituteId, limit) =>
  StudentFee.find({
    institute: instituteId,
    status: { $in: ['unpaid', 'partial'] },
    balance: { $gt: 0 },
  })
    .populate('student', 'fullName email studentProfile.registrationNumber')
    .populate('class', 'name')
    .sort({ balance: -1 })
    .limit(limit)
    .select('student class totalAmount balance status');

export const aggregateCollectionTrend = (instituteId, since) =>
  StudentFee.aggregate([
    { $match: { institute: new mongoose.Types.ObjectId(instituteId), createdAt: { $gte: since } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        totalBilled: { $sum: '$totalAmount' },
        totalCollected: { $sum: { $subtract: ['$totalAmount', '$balance'] } },
        totalOutstanding: { $sum: '$balance' },
        studentCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        totalBilled: 1,
        totalCollected: 1,
        totalOutstanding: 1,
        studentCount: 1,
      },
    },
    { $sort: { year: 1, month: 1 } },
  ]);
