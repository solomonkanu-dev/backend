import EmployeeAttendance from '../models/EmployeeAttendance.js';
import mongoose from 'mongoose';

export const createMany = (records) =>
  Promise.all(records.map((r) => EmployeeAttendance.create(r)));

export const findByQuery = (match) =>
  EmployeeAttendance.find(match)
    .populate('lecturer', 'fullName email')
    .sort({ date: -1 })
    .lean();

export const aggregateSummary = (lecturerObjectId, instituteObjectId) =>
  EmployeeAttendance.aggregate([
    { $match: { lecturer: lecturerObjectId, institute: instituteObjectId } },
    { $unwind: '$records' },
    {
      $group: {
        _id: null,
        totalDays: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } },
        leave: { $sum: { $cond: [{ $eq: ['$records.status', 'leave'] }, 1, 0] } },
      },
    },
    {
      $project: {
        totalDays: 1,
        present: 1,
        absent: 1,
        leave: 1,
        percentage: {
          $cond: [
            { $eq: ['$totalDays', 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ['$present', '$totalDays'] }, 100] }, 2] },
          ],
        },
      },
    },
    {
      $lookup: { from: 'users', localField: 'lecturer', foreignField: '_id', as: 'lecturer' },
    },
    { $unwind: { path: '$lecturer', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        lecturer: { _id: '$lecturer._id', fullName: '$lecturer.fullName' },
        totalDays: 1,
        present: 1,
        absent: 1,
        leave: 1,
        percentage: 1,
      },
    },
  ]);
