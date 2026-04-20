import mongoose from 'mongoose';
import User from '../models/user.js';
import * as repo from '../repositories/classFee.repository.js';
import * as studentFeeRepo from '../repositories/studentFee.repository.js';
import { AppError } from '../errors/AppError.js';

export const assignFeesToClass = async ({ classId, fees }, user) => {
  if (!user.institute) throw new AppError('Admin must belong to an institute', 403);
  if (!classId || !mongoose.Types.ObjectId.isValid(classId)) throw new AppError('Valid classId is required', 400);
  if (!Array.isArray(fees) || fees.length === 0) throw new AppError('Select at least one fee structure', 400);

  const instituteId = user.institute?._id || user.institute;

  const structures = await repo.findByIds(fees, instituteId);
  if (structures.length === 0) throw new AppError('No valid fee structures found', 404);

  // Find all students in this class
  const students = await User.find({ role: 'student', class: classId, institute: instituteId }).select('_id').lean();
  if (students.length === 0) return { assigned: 0, skipped: 0 };

  // Load existing StudentFee records for these students (lean, so we get plain objects with _id + feeStructures)
  const existingFees = await studentFeeRepo.findStudentFeesByFilter({
    student: { $in: students.map((s) => s._id) },
    institute: instituteId,
  });
  const existingByStudent = new Map(existingFees.map((f) => [f.student.toString(), f]));

  let assigned = 0;
  let skipped = 0;
  const failedStudents = [];

  // Start a MongoDB session for transaction support
  const session = await mongoose.startSession();

  try {
    // Wrap the entire student loop in a transaction
    await session.withTransaction(async () => {
      for (const student of students) {
        try {
          const existing = existingByStudent.get(student._id.toString());

          if (!existing) {
            // No fee record yet — create with all selected structures
            const feeParticulars = structures.flatMap((s) =>
              s.particulars.map((p) => ({ label: p.label, amount: p.amount, paid: 0 }))
            );
            const totalAmount = feeParticulars.reduce((sum, f) => sum + f.amount, 0);

            await studentFeeRepo.createStudentFee(
              {
                student: student._id,
                class: classId,
                institute: instituteId,
                fees: feeParticulars,
                feeStructures: structures.map((s) => s._id),
                totalAmount,
                balance: totalAmount,
              },
              session
            );
            assigned++;
            continue;
          }

          // Student already has a fee record — only add structures not yet assigned
          const alreadyAssigned = new Set((existing.feeStructures ?? []).map((id) => id.toString()));
          const newStructures = structures.filter((s) => !alreadyAssigned.has(s._id.toString()));

          if (newStructures.length === 0) {
            skipped++;
            continue;
          }

          const newFees = newStructures.flatMap((s) =>
            s.particulars.map((p) => ({ label: p.label, amount: p.amount, paid: 0 }))
          );
          const addedAmount = newFees.reduce((sum, f) => sum + f.amount, 0);

          await studentFeeRepo.updateStudentFeeById(
            existing._id,
            {
              $push: { fees: { $each: newFees }, feeStructures: { $each: newStructures.map((s) => s._id) } },
              $inc: { totalAmount: addedAmount, balance: addedAmount },
            },
            session
          );
          assigned++;
        } catch (error) {
          // Collect failed student details for potential retries
          failedStudents.push({
            studentId: student._id,
            error: error.message,
          });
          // Re-throw to trigger transaction rollback
          throw error;
        }
      }
    });
  } finally {
    await session.endSession();
  }

  // If there were failures, throw with details
  if (failedStudents.length > 0) {
    throw new AppError(
      `Failed to assign fees to ${failedStudents.length} student(s). Transaction rolled back.`,
      400,
      { failedStudents }
    );
  }

  return { assigned, skipped };
};
