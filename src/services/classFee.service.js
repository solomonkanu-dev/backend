import mongoose from 'mongoose';
import * as repo from '../repositories/classFee.repository.js';
import { AppError } from '../errors/AppError.js';

export const assignFeesToClass = async ({ classId, fees }, user) => {
  if (!user.institute) throw new AppError('Admin must belong to an institute', 403);

  if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
    throw new AppError('Valid classId is required', 400);
  }

  if (!Array.isArray(fees) || fees.length === 0) {
    throw new AppError('Select at least one fee structure', 400);
  }

  const instituteId = user.institute?._id || user.institute;
  const structures = await repo.findByIds(fees, instituteId);

  if (structures.length === 0) throw new AppError('No valid fee structures found', 404);

  return { count: structures.length };
};
