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
  if (!mongoose.Types.ObjectId.isValid(studentId)) throw new AppError('Invalid student ID', 400);

  const student = await User.findById(studentId);
  if (!student) throw new AppError('Student not found', 404);
  if (!student.class) throw new AppError('Student has no class assigned. Please assign the student to a class first.', 400);

  const instituteId = student.institute?._id || student.institute;
  const classId = student.class?._id || student.class;

  const existing = await repo.findOneStudentFee(studentId, instituteId);

  if (Array.isArray(selectedParticulars) && selectedParticulars.length > 0) {
    // Manual particulars — validate and sanitize entries before persisting
    const validatedFees = selectedParticulars
      .map((p) => {
        // Validate label: must be a non-empty string
        const label = typeof p.label === 'string' ? p.label.trim() : '';
        if (!label) return null; // Skip entries with empty/missing labels

        // Validate amount: parse and ensure it's a finite number
        const amount = parseFloat(p.amount);
        if (!isFinite(amount) || amount < 0) return null; // Skip invalid amounts; treat as 0 per business rule

        return { label, amount, paid: 0 };
      })
      .filter((f) => f !== null); // Remove invalid entries

    if (validatedFees.length === 0) {
      throw new AppError('No valid fee particulars provided', 400);
    }

    const addedAmount = validatedFees.reduce((sum, f) => sum + f.amount, 0);

    if (existing) {
      return repo.updateStudentFeeById(existing._id, {
        $push: { fees: { $each: validatedFees } },
        $inc: { totalAmount: addedAmount, balance: addedAmount },
      });
    }

    return repo.createStudentFee({
      student: studentId, class: classId, institute: instituteId,
      fees: validatedFees, feeStructures: [], totalAmount: addedAmount, balance: addedAmount,
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
      // $push: { fees: { $each: newFees }, feeStructures: { $each: newStructureIds } },
      $push: { fees: { $each: newFees } },
      $addToSet: { feeStructures: { $each: newStructureIds } },
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
