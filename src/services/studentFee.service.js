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
  if (!student.class) throw new AppError('Student has no class assigned. Please assign the student to a class first.', 400);

  const instituteId = student.institute?._id || student.institute;
  const classId = student.class?._id || student.class;

  const existing = await repo.findOneStudentFee(studentId, instituteId);

  if (Array.isArray(selectedParticulars) && selectedParticulars.length > 0) {
    // Manual particulars — always append (no structure-level dedup possible)
    const fees = selectedParticulars.map((p) => ({ label: p.label, amount: Number(p.amount), paid: 0 }));
    const addedAmount = fees.reduce((sum, f) => sum + f.amount, 0);

    if (existing) {
      return repo.updateStudentFeeById(existing._id, {
        $push: { fees: { $each: fees } },
        $inc: { totalAmount: addedAmount, balance: addedAmount },
      });
    }

    return repo.createStudentFee({
      student: studentId, class: classId, institute: instituteId,
      fees, feeStructures: [], totalAmount: addedAmount, balance: addedAmount,
    });
  }

  // Auto-detect from applicable structures
  const structures = await repo.findStructuresForStudent(instituteId, classId, studentId);
  if (structures.length === 0) throw new AppError('No fee structures found for this student. Create a fee structure first.', 404);

  // Skip structures already assigned to this student
  const assignedIds = existing ? new Set(existing.feeStructures.map((id) => id.toString())) : new Set();
  const newStructures = structures.filter((s) => !assignedIds.has(s._id.toString()));

  if (newStructures.length === 0) {
    throw new AppError('All applicable fee structures have already been assigned to this student', 409);
  }

  const newFees = newStructures.flatMap((s) => s.particulars.map((p) => ({ label: p.label, amount: p.amount, paid: 0 })));
  const addedAmount = newFees.reduce((sum, f) => sum + f.amount, 0);
  const newStructureIds = newStructures.map((s) => s._id);

  if (existing) {
    return repo.updateStudentFeeById(existing._id, {
      $push: { fees: { $each: newFees }, feeStructures: { $each: newStructureIds } },
      $inc: { totalAmount: addedAmount, balance: addedAmount },
    });
  }

  return repo.createStudentFee({
    student: studentId, class: classId, institute: instituteId,
    fees: newFees, feeStructures: newStructureIds, totalAmount: addedAmount, balance: addedAmount,
  });
};

export const getStudentsWithFees = (instituteId) => repo.findStudentsWithFees(instituteId);

export const getFeesForStudent = (studentId, instituteId) =>
  repo.findFeesForStudent(studentId, instituteId);
