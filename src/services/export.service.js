import mongoose from 'mongoose';
import * as repo from '../repositories/export.repository.js';
import { AppError } from '../errors/AppError.js';

export const getInstituteId = (user, queryInstituteId) => {
  if (user.role === 'super_admin' && queryInstituteId) return queryInstituteId;
  return user.institute?._id || user.institute;
};

export const getStudentListData = async (instituteId) => {
  if (!instituteId) throw new AppError('Institute required', 400);
  const students = await repo.findStudents(instituteId);
  return students.map((s) => ({
    fullName: s.fullName,
    email: s.email,
    class: s.class?.name || '',
    status: s.isActive ? 'active' : 'suspended',
    createdAt: s.createdAt?.toISOString() || '',
  }));
};

export const getLecturerListData = async (instituteId) => {
  if (!instituteId) throw new AppError('Institute required', 400);
  const lecturers = await repo.findLecturers(instituteId);
  return lecturers.map((l) => ({
    fullName: l.fullName,
    email: l.email,
    department: l.lecturerProfile?.department || '',
    position: l.lecturerProfile?.position || '',
    status: l.isActive ? 'active' : 'suspended',
    createdAt: l.createdAt?.toISOString() || '',
  }));
};

export const getFeeCollectionData = async (instituteId) => {
  if (!instituteId) throw new AppError('Institute required', 400);
  const fees = await repo.findFees(instituteId);
  return fees.map((f) => ({
    studentName: f.student?.fullName || '',
    studentEmail: f.student?.email || '',
    className: f.class?.name || '',
    totalAmount: f.totalAmount,
    paid: (f.totalAmount || 0) - (f.balance || 0),
    balance: f.balance,
    status: f.status,
  }));
};

export const getSalaryReportData = async (queryInstituteId) => {
  const filter = {};
  if (queryInstituteId) filter.institute = queryInstituteId;
  const salaries = await repo.findSalaries(filter);
  return salaries.map((s) => ({
    lecturerName: s.lecturer?.fullName || '',
    instituteName: s.institute?.name || '',
    salary: s.salary,
    bonus: s.bonus,
    deduction: s.deduction,
    totalAmount: s.totalAmount,
    paymentStatus: s.status,
    salaryMonth: s.salaryMonth,
  }));
};

export const getAttendanceSummaryData = async (instituteId) => {
  if (!instituteId) throw new AppError('Institute required', 400);
  const objectId = new mongoose.Types.ObjectId(instituteId);
  return repo.aggregateAttendanceSummary(objectId);
};
