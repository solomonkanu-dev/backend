import Attendance from '../models/Attendance.js';
import StudentFee from '../models/StudentFee.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import User from '../models/user.js';
import mongoose from 'mongoose';

export const aggregateAttendanceSummary = (baseMatch) =>
  Attendance.aggregate([
    { $match: baseMatch },
    { $unwind: '$records' },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } },
      },
    },
  ]);

export const aggregateAttendanceByClass = (baseMatch) =>
  Attendance.aggregate([
    { $match: baseMatch },
    { $unwind: '$records' },
    {
      $group: {
        _id: '$class',
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
      },
    },
    { $lookup: { from: 'classes', localField: '_id', foreignField: '_id', as: 'classInfo' } },
    {
      $project: {
        className: { $ifNull: [{ $arrayElemAt: ['$classInfo.name', 0] }, 'Unknown'] },
        total: 1,
        present: 1,
        rate: {
          $cond: [
            { $gt: ['$total', 0] },
            { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1] },
            0,
          ],
        },
      },
    },
    { $sort: { rate: -1 } },
    { $limit: 10 },
  ]);

export const aggregateFeeDefaults = (match) =>
  StudentFee.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalBilled: { $sum: '$totalAmount' },
        totalOutstanding: { $sum: '$balance' },
      },
    },
  ]);

export const aggregateFeeDefaultsByInstitute = (baseMatch) =>
  StudentFee.aggregate([
    { $match: baseMatch },
    { $match: { status: { $in: ['unpaid', 'partial'] } } },
    {
      $group: {
        _id: '$institute',
        defaultCount: { $sum: 1 },
        totalOutstanding: { $sum: '$balance' },
      },
    },
    { $lookup: { from: 'institutes', localField: '_id', foreignField: '_id', as: 'inst' } },
    {
      $project: {
        instituteName: { $ifNull: [{ $arrayElemAt: ['$inst.name', 0] }, 'Unknown'] },
        defaultCount: 1,
        totalOutstanding: 1,
      },
    },
    { $sort: { totalOutstanding: -1 } },
    { $limit: 10 },
  ]);

export const findAssignments = (match) =>
  Assignment.find(match).select('_id class').lean();

export const findSubmissions = (filter) =>
  Submission.find(filter).select('assignment isLate status').lean();

export const aggregateSubmissionsByClass = (assignmentIds) =>
  Submission.aggregate([
    { $match: { assignment: { $in: assignmentIds } } },
    { $lookup: { from: 'assignments', localField: 'assignment', foreignField: '_id', as: 'assignmentDoc' } },
    { $unwind: '$assignmentDoc' },
    {
      $group: {
        _id: '$assignmentDoc.class',
        submitted: { $sum: 1 },
        late: { $sum: { $cond: ['$isLate', 1, 0] } },
        graded: { $sum: { $cond: [{ $eq: ['$status', 'graded'] }, 1, 0] } },
      },
    },
    { $lookup: { from: 'classes', localField: '_id', foreignField: '_id', as: 'classInfo' } },
    {
      $project: {
        className: { $ifNull: [{ $arrayElemAt: ['$classInfo.name', 0] }, 'Unknown'] },
        submitted: 1,
        late: 1,
        graded: 1,
      },
    },
    { $sort: { submitted: -1 } },
    { $limit: 10 },
  ]);

export const aggregateClassStudentCount = (classIds, instId) =>
  mongoose.model('Class').aggregate([
    {
      $match: {
        _id: { $in: classIds },
        ...(instId ? { institute: instId } : {}),
      },
    },
    { $project: { studentCount: { $size: { $ifNull: ['$students', []] } } } },
    { $group: { _id: null, total: { $sum: '$studentCount' } } },
  ]);

export const aggregateEnrollmentSnapshot = (baseMatch) =>
  User.aggregate([
    { $match: baseMatch },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        approved: { $sum: { $cond: ['$approved', 1, 0] } },
      },
    },
  ]);

export const aggregateEnrollmentMonthly = (baseMatch) =>
  User.aggregate([
    { $match: baseMatch },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

export const aggregateEnrollmentByClass = (baseMatch) =>
  User.aggregate([
    { $match: baseMatch },
    { $group: { _id: '$class', count: { $sum: 1 } } },
    { $lookup: { from: 'classes', localField: '_id', foreignField: '_id', as: 'classInfo' } },
    {
      $project: {
        className: { $ifNull: [{ $arrayElemAt: ['$classInfo.name', 0] }, 'No Class'] },
        count: 1,
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

export const aggregateEnrollmentByInstitute = (baseMatch) =>
  User.aggregate([
    { $match: baseMatch },
    { $group: { _id: '$institute', count: { $sum: 1 } } },
    { $lookup: { from: 'institutes', localField: '_id', foreignField: '_id', as: 'inst' } },
    {
      $project: {
        instituteName: { $ifNull: [{ $arrayElemAt: ['$inst.name', 0] }, 'Unknown'] },
        count: 1,
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
