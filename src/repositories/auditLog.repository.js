import AuditLog from '../models/AuditLog.js';

export const findPaginated = (filter, skip, limit) =>
  AuditLog.find(filter)
    .populate('user', 'fullName email role')
    .populate('institute', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

export const countDocuments = (filter) => AuditLog.countDocuments(filter);

export const aggregateByAction = (matchFilter) =>
  AuditLog.aggregate([
    { $match: matchFilter },
    { $group: { _id: '$action', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, action: '$_id', count: 1 } },
    { $limit: 20 },
  ]);

export const aggregateByRole = (matchFilter) =>
  AuditLog.aggregate([
    { $match: matchFilter },
    { $group: { _id: '$role', count: { $sum: 1 } } },
    { $project: { _id: 0, role: '$_id', count: 1 } },
  ]);

export const findRecent = (matchFilter, limit = 10) =>
  AuditLog.find(matchFilter)
    .populate('user', 'fullName email')
    .populate('institute', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('action entity description userFullName role createdAt institute');

export const findByUser = (filter, skip, limit) =>
  AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('action entity description method path statusCode createdAt');
