import mongoose from 'mongoose';
import User from '../models/user.js';
import * as repo from '../repositories/employeeAttendance.repository.js';
import { AppError } from '../errors/AppError.js';

export const markEmployeeAttendance = async ({ date, records }, user) => {
  if (!['admin', 'super_admin'].includes(user.role)) {
    throw new AppError('Only admins can mark employee attendance', 403);
  }

  if (!date || !records?.length) throw new AppError('date and records are required', 400);

  const attendanceDate = new Date(date);
  const employeeIds = records.map((r) => r.lecturerId);

  const employees = await User.find({
    _id: { $in: employeeIds },
    role: { $in: ['lecturer', 'admin'] },
    institute: user.institute,
  });

  if (employees.length !== employeeIds.length) {
    throw new AppError('One or more employees not found', 404);
  }

  const uniqueIds = new Set(employeeIds);
  if (uniqueIds.size !== employeeIds.length) {
    throw new AppError('Duplicate employee IDs in records', 400);
  }

  const docs = records.map((record) => ({
    institute: user.institute,
    lecturer: record.lecturerId,
    date: attendanceDate,
    records: [{ lecturer: record.lecturerId, status: record.status }],
    markedBy: user.id,
  }));

  return repo.createMany(docs);
};

export const getEmployeeAttendance = async ({ lecturerId, from, to }, user) => {
  if (!lecturerId) throw new AppError('lecturerId is required', 400);

  const match = {
    lecturer: new mongoose.Types.ObjectId(lecturerId),
    institute: new mongoose.Types.ObjectId(user.institute),
  };

  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = new Date(from);
    if (to) match.date.$lte = new Date(to);
  }

  const attendances = await repo.findByQuery(match);
  return { count: attendances.length, attendances };
};

export const getEmployeeAttendanceSummary = async (lecturerId, user) => {
  if (!lecturerId) throw new AppError('lecturerId is required', 400);

  const lecturerObjectId = new mongoose.Types.ObjectId(lecturerId);
  const instituteObjectId = new mongoose.Types.ObjectId(user.institute);

  const summary = await repo.aggregateSummary(lecturerObjectId, instituteObjectId);

  if (!summary.length) {
    return { lecturer: { _id: lecturerId }, totalDays: 0, present: 0, absent: 0, leave: 0, percentage: 0 };
  }

  return summary[0];
};
