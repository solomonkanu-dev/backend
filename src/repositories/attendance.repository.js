import Attendance from '../models/Attendance.js';
import mongoose from 'mongoose';

export const findOne = (query) => Attendance.findOne(query);

export const findByStudentRecords = (query) =>
  Attendance.find(query)
    .populate('class', 'name')
    .populate('subject', 'name code')
    .sort({ date: -1 })
    .lean();

export const findByQuery = (query) =>
  Attendance.find(query)
    .populate('records.student', 'fullName studentProfile')
    .sort({ date: -1 });

export const createAttendance = (data) => Attendance.create(data);

export const insertManyAttendance = (docs, options) =>
  Attendance.insertMany(docs, options);

export const countByStudent = (studentId) =>
  Attendance.countDocuments({ 'records.student': studentId });

export const countByStudentAndStatus = (studentId, status) =>
  Attendance.countDocuments({ records: { $elemMatch: { student: studentId, status } } });

export const aggregateSummaryByClass = (classId, instituteId) =>
  Attendance.aggregate([
    { $unwind: '$records' },
    {
      $match: {
        class: new mongoose.Types.ObjectId(classId),
        institute: new mongoose.Types.ObjectId(instituteId),
      },
    },
    {
      $group: {
        _id: '$date',
        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

export const aggregateStudentSummary = (userId, classFilter) =>
  Attendance.aggregate([
    { $unwind: '$records' },
    { $match: { 'records.student': new mongoose.Types.ObjectId(userId), ...classFilter } },
    {
      $group: {
        _id: '$class',
        totalClasses: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } },
      },
    },
    {
      $project: {
        totalClasses: 1,
        present: 1,
        absent: 1,
        percentage: {
          $cond: [
            { $eq: ['$totalClasses', 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ['$present', '$totalClasses'] }, 100] }, 2] },
          ],
        },
      },
    },
    { $lookup: { from: 'classes', localField: '_id', foreignField: '_id', as: 'class' } },
    { $unwind: '$class' },
    { $project: { class: { name: '$class.name' }, totalClasses: 1, present: 1, absent: 1, percentage: 1 } },
  ]);

export const aggregateExamEligibility = (userId, classId) =>
  Attendance.aggregate([
    { $unwind: '$records' },
    {
      $match: {
        'records.student': new mongoose.Types.ObjectId(userId),
        class: new mongoose.Types.ObjectId(classId),
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
      },
    },
  ]);

export const aggregateClassWiseReport = (match) =>
  Attendance.aggregate([
    { $unwind: '$records' },
    { $match: match },
    {
      $group: {
        _id: '$records.student',
        totalClasses: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } },
      },
    },
    {
      $project: {
        totalClasses: 1,
        present: 1,
        absent: 1,
        percentage: {
          $cond: [
            { $eq: ['$totalClasses', 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ['$present', '$totalClasses'] }, 100] }, 2] },
          ],
        },
      },
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'student' } },
    { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        student: {
          _id: '$student._id',
          fullName: '$student.fullName',
          registrationNumber: '$student.studentProfile.registrationNumber',
        },
        totalClasses: 1,
        present: 1,
        absent: 1,
        percentage: 1,
      },
    },
    { $sort: { 'student.fullName': 1 } },
  ]);

export const aggregateStudentStats = (classId, studentId) =>
  Attendance.aggregate([
    { $unwind: '$records' },
    {
      $match: {
        class: new mongoose.Types.ObjectId(classId),
        'records.student': new mongoose.Types.ObjectId(studentId),
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
      },
    },
  ]);

export const findForExport = (instituteObjectId) =>
  Attendance.aggregate([
    { $match: { institute: instituteObjectId, type: 'student' } },
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

// ─── Employee Attendance (shared with employee.attendance) ───────────────────

export const findEmployeeAttendance = (match) =>
  Attendance.find(match).sort({ date: -1 }).lean();

export const aggregateEmployeeSummary = (employeeId, institute) =>
  Attendance.aggregate([
    {
      $match: {
        employee: mongoose.Types.ObjectId(employeeId),
        institute: mongoose.Types.ObjectId(institute),
        type: 'employee',
      },
    },
    {
      $group: {
        _id: null,
        totalDays: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        leave: { $sum: { $cond: [{ $eq: ['$status', 'leave'] }, 1, 0] } },
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
      $lookup: {
        from: 'users',
        let: { empId: mongoose.Types.ObjectId(employeeId) },
        pipeline: [{ $match: { $expr: { $eq: ['$_id', mongoose.Types.ObjectId(employeeId)] } } }],
        as: 'employee',
      },
    },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        employee: { _id: '$employee._id', fullName: '$employee.fullName' },
        totalDays: 1,
        present: 1,
        absent: 1,
        leave: 1,
        percentage: 1,
      },
    },
  ]);

export const countAttendance = (institute) =>
  Attendance.countDocuments({ institute });
