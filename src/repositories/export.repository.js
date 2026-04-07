import User from '../models/user.js';
import Salary from '../models/Salary.js';
import StudentFee from '../models/StudentFee.js';
import Attendance from '../models/Attendance.js';
import mongoose from 'mongoose';

export const findStudents = (instituteId) =>
  User.find({ role: 'student', institute: instituteId }).populate('class', 'name').lean();

export const findLecturers = (instituteId) =>
  User.find({ role: 'lecturer', institute: instituteId }).lean();

export const findFees = (instituteId) =>
  StudentFee.find({ institute: instituteId })
    .populate('student', 'fullName email')
    .populate('class', 'name')
    .lean();

export const findSalaries = (filter) =>
  Salary.find(filter)
    .populate('lecturer', 'fullName')
    .populate('institute', 'name')
    .lean();

export const aggregateAttendanceSummary = (objectId) =>
  Attendance.aggregate([
    { $match: { institute: objectId, type: 'student' } },
    { $unwind: '$records' },
    {
      $group: {
        _id: '$records.student',
        totalDays: { $sum: 1 },
        presentDays: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
        classId: { $first: '$class' },
      },
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'student' } },
    { $unwind: '$student' },
    { $lookup: { from: 'classes', localField: 'classId', foreignField: '_id', as: 'class' } },
    {
      $project: {
        _id: 0,
        studentName: '$student.fullName',
        studentEmail: '$student.email',
        className: { $ifNull: [{ $arrayElemAt: ['$class.name', 0] }, ''] },
        totalDays: 1,
        presentDays: 1,
        percentage: {
          $cond: [
            { $gt: ['$totalDays', 0] },
            { $round: [{ $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100] }, 2] },
            0,
          ],
        },
      },
    },
  ]);
