import mongoose from 'mongoose';
import * as repo from '../repositories/studentFee.repository.js';
import User from '../models/user.js';
import { AppError } from '../errors/AppError.js';

export const getStructuresForStudent = async (studentId) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) throw new AppError('Invalid student ID', 400);

  const student = await User.findById(studentId);
  if (!student) throw new AppError('Student not found', 404);

  const instituteId = student.institute?._id || student.institute;
  return repo.findStructuresForStudent(instituteId, student.class, studentId);
};

export const assignFeeToStudent = async ({ studentId, selectedParticulars }) => {
  const student = await User.findById(studentId);
  if (!student) throw new AppError('Student not found', 404);

  const instituteId = student.institute?._id || student.institute;

  const existing = await repo.findOneStudentFee(studentId, instituteId);
  if (existing) throw new AppError('Fees have already been assigned to this student', 409);

  let fees;

  if (Array.isArray(selectedParticulars) && selectedParticulars.length > 0) {
    fees = selectedParticulars.map((p) => ({ label: p.label, amount: Number(p.amount), paid: 0 }));
  } else {
    const structures = await repo.findStructuresForStudent(instituteId, student.class, studentId);
    if (structures.length === 0) throw new AppError('No fee structures found for this student', 404);
    fees = structures.flatMap((s) => s.particulars.map((p) => ({ label: p.label, amount: p.amount, paid: 0 })));
  }

  const totalAmount = fees.reduce((sum, f) => sum + f.amount, 0);

  return repo.createStudentFee({
    student: studentId,
    class: student.class,
    institute: instituteId,
    fees,
    totalAmount,
    balance: totalAmount,
  });
};

export const getStudentsWithFees = (instituteId) => repo.findStudentsWithFees(instituteId);

export const getFeesForStudent = (studentId, instituteId) =>
  repo.findFeesForStudent(studentId, instituteId);
