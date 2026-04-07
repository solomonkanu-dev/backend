import mongoose from 'mongoose';
import * as repo from '../repositories/auditLog.repository.js';
import { AppError } from '../errors/AppError.js';

export const getAuditLogs = async (user, query) => {
  const { role } = user;
  const {
    page = 1, limit = 50, action, userRole, userId,
    instituteId, startDate, endDate, entity,
  } = query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const lim = Math.min(parseInt(limit) || 50, 200);
  const skip = (pageNum - 1) * lim;

  const filter = {};

  if (role === 'admin') {
    filter.institute = user.institute?._id || user.institute;
  } else if (role === 'super_admin' && instituteId) {
    if (!mongoose.Types.ObjectId.isValid(instituteId)) throw new AppError('Invalid institute ID', 400);
    filter.institute = new mongoose.Types.ObjectId(instituteId);
  }

  if (action) filter.action = { $regex: action, $options: 'i' };
  if (userRole) filter.role = userRole;
  if (entity) filter.entity = { $regex: entity, $options: 'i' };

  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError('Invalid user ID', 400);
    filter.user = new mongoose.Types.ObjectId(userId);
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const [logs, total] = await Promise.all([
    repo.findPaginated(filter, skip, lim),
    repo.countDocuments(filter),
  ]);

  return { logs, pagination: { page: pageNum, limit: lim, total, pages: Math.ceil(total / lim) } };
};

export const getAuditSummary = async (user) => {
  const matchFilter = {};
  if (user.role === 'admin') {
    matchFilter.institute = user.institute?._id || user.institute;
  }

  const [byAction, byRole, recentActivity] = await Promise.all([
    repo.aggregateByAction(matchFilter),
    repo.aggregateByRole(matchFilter),
    repo.findRecent(matchFilter, 10),
  ]);

  return { byAction, byRole, recentActivity };
};

export const getUserAuditLogs = async (user, userId, query) => {
  const pageNum = Math.max(1, parseInt(query.page) || 1);
  const lim = Math.min(parseInt(query.limit) || 50, 200);

  if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError('Invalid user ID', 400);

  const filter = { user: new mongoose.Types.ObjectId(userId) };
  if (user.role === 'admin') {
    filter.institute = user.institute?._id || user.institute;
  }

  const [logs, total] = await Promise.all([
    repo.findByUser(filter, (pageNum - 1) * lim, lim),
    repo.countDocuments(filter),
  ]);

  return { logs, pagination: { page: pageNum, limit: lim, total, pages: Math.ceil(total / lim) } };
};
