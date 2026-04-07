import * as repo from '../repositories/salary.repository.js';
import User from '../models/user.js';
import { AppError } from '../errors/AppError.js';

export const addSalary = async (body, user) => {
  if (user.role !== 'admin') throw new AppError('Only admins can add salary records', 403);

  const { lecturerId, role, salaryMonth, date, salary, bonus, deduction, remarks } = body;

  if (!lecturerId || !role || !salaryMonth || !date || salary === undefined) {
    throw new AppError('lecturerId, role, salaryMonth, date, and salary are required', 400);
  }

  const lecturer = await User.findOne({
    _id: lecturerId,
    role: { $in: ['lecturer', 'admin'] },
    institute: user.institute,
  });
  if (!lecturer) throw new AppError('Lecturer not found', 404);

  const existing = await repo.findOne({ lecturer: lecturerId, institute: user.institute, salaryMonth });
  if (existing) throw new AppError('Salary already recorded for this month', 409);

  return repo.createSalary({
    lecturer: lecturerId,
    institute: user.institute,
    role,
    salaryMonth,
    date,
    salary,
    bonus: bonus || 0,
    deduction: deduction || 0,
    remarks: remarks || '',
  });
};

export const getAllSalaries = async (query, user) => {
  if (user.role !== 'admin') throw new AppError('Access denied', 403);

  const { salaryMonth, status, page = 1, limit = 10 } = query;
  const match = { institute: user.institute };
  if (salaryMonth) match.salaryMonth = salaryMonth;
  if (status) match.status = status;

  const skip = (page - 1) * limit;
  const [salaries, total] = await Promise.all([
    repo.findPaginated(match, skip, parseInt(limit)),
    repo.countDocuments(match),
  ]);

  return { total, count: salaries.length, page: parseInt(page), pages: Math.ceil(total / limit), data: salaries };
};

export const getLecturerSalaries = async (lecturerId, query, user) => {
  if (!lecturerId) throw new AppError('lecturerId is required', 400);

  const lecturer = await User.findOne({ _id: lecturerId, institute: user.institute });
  if (!lecturer) throw new AppError('Lecturer not found', 404);

  const { salaryMonth, status } = query;
  const instituteId = user.institute?._id || user.institute;
  const match = { lecturer: lecturerId, institute: instituteId };
  if (salaryMonth) match.salaryMonth = salaryMonth;
  if (status) match.status = status;

  const salaries = await repo.findByLecturer(match);
  return { lecturer: { _id: lecturer._id, fullName: lecturer.fullName }, count: salaries.length, data: salaries };
};

export const getSalaryById = async (id, user) => {
  const salary = await repo.findById(id, user.institute);
  if (!salary) throw new AppError('Salary record not found', 404);
  return salary;
};

export const updateSalary = async (id, body, user) => {
  if (user.role !== 'admin') throw new AppError('Only admins can update salary records', 403);

  const salaryRecord = await repo.findOne({ _id: id, institute: user.institute });
  if (!salaryRecord) throw new AppError('Salary record not found', 404);
  if (salaryRecord.status !== 'pending') throw new AppError('Can only update pending salary records', 400);

  const { salary, bonus, deduction, remarks, status } = body;
  if (salary !== undefined) salaryRecord.salary = salary;
  if (bonus !== undefined) salaryRecord.bonus = bonus;
  if (deduction !== undefined) salaryRecord.deduction = deduction;
  if (remarks !== undefined) salaryRecord.remarks = remarks;
  if (status) salaryRecord.status = status;

  await salaryRecord.save();
  return salaryRecord;
};

export const markAsPaid = async (id, user) => {
  if (user.role !== 'admin') throw new AppError('Only admins can mark salary as paid', 403);

  const salary = await repo.findOne({ _id: id, institute: user.institute });
  if (!salary) throw new AppError('Salary record not found', 404);

  salary.status = 'paid';
  salary.paidDate = new Date();
  await salary.save();
  return salary;
};

export const getMonthlySalarySummary = async (salaryMonth, user) => {
  if (user.role !== 'admin') throw new AppError('Access denied', 403);
  if (!salaryMonth) throw new AppError('salaryMonth is required (format: YYYY-MM)', 400);

  const instituteId = user.institute?._id || user.institute;
  const summary = await repo.aggregateMonthly(instituteId, salaryMonth);

  if (!summary.length) {
    return { salaryMonth, totalSalary: 0, totalBonus: 0, totalDeduction: 0, totalAmount: 0, totalRecords: 0, paidCount: 0, pendingCount: 0 };
  }

  return { salaryMonth, ...summary[0] };
};

export const deleteSalary = async (id, user) => {
  if (user.role !== 'admin') throw new AppError('Only admins can delete salary records', 403);

  const salary = await repo.findOne({ _id: id, institute: user.institute });
  if (!salary) throw new AppError('Salary record not found', 404);
  if (salary.status !== 'pending') throw new AppError('Can only delete pending salary records', 400);

  await repo.deleteById(id);
};
