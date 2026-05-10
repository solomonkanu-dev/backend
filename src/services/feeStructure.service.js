import mongoose from 'mongoose';
import * as repo from '../repositories/feeStructure.repository.js';
import Class from '../models/Class.js';
import User from '../models/user.js';
import StudentFee from '../models/StudentFee.js';
import { AppError } from '../errors/AppError.js';
import { cacheGet, cacheSet, cacheDelPattern } from '../utils/cache.js';

const computeTotal = (particulars = []) =>
  particulars.reduce((s, p) => s + (Number(p.amount) || 0), 0);

export const createFeeStructure = async ({ category, classId, studentId, particulars, instituteId }, user) => {
  if (!['all', 'class', 'student'].includes(category)) throw new AppError('Invalid category', 400);
  if (category === 'class' && !classId) throw new AppError('classId is required for class category', 400);
  if (category === 'student' && !studentId) throw new AppError('studentId is required for student category', 400);
  if (!Array.isArray(particulars) || particulars.length === 0) throw new AppError('particulars are required', 400);
  if (classId && !mongoose.Types.ObjectId.isValid(classId)) throw new AppError('Invalid classId', 400);
  if (studentId && !mongoose.Types.ObjectId.isValid(studentId)) throw new AppError('Invalid studentId', 400);

  if (classId) {
    const cls = await Class.findById(classId);
    if (!cls) throw new AppError('Class not found', 404);
  }
  if (studentId) {
    const student = await User.findById(studentId);
    if (!student) throw new AppError('Student not found', 404);
  }

  const cleaned = particulars.map((p) => ({ label: String(p.label || '').trim(), amount: Number(p.amount || 0) }));
  const totalAmount = computeTotal(cleaned);

  const result = await repo.createFeeStructure({
    category,
    classId: classId || undefined,
    studentId: studentId || undefined,
    particulars: cleaned,
    totalAmount,
    createdBy: user?._id,
    instituteId: instituteId || user?.institute?._id || user?.institute,
  });
  await cacheDelPattern(`fees:struct:${instituteId || user?.institute?._id || user?.institute}:*`);
  return result;
};

export const getFeeStructures = async (query, user) => {
  const { category, classId, studentId, page = 1, limit = 20 } = query;
  let { instituteId } = query;
  const q = {};
  if (category) q.category = category;
  if (classId) q.classId = classId;
  if (studentId) q.studentId = studentId;
  if (instituteId) q.instituteId = instituteId;
  else if (user?.institute) {
    instituteId = user.institute?._id || user.institute;
    q.instituteId = instituteId;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const cacheKey = `fees:struct:${instituteId ?? 'all'}:${category ?? 'all'}:${classId ?? 'none'}:${studentId ?? 'none'}:p${pageNum}:l${lim}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const [items, total] = await Promise.all([
    repo.findPaginated(q, (pageNum - 1) * lim, lim),
    repo.countDocuments(q),
  ]);

  // Compute isAssigned: a structure is assigned only if at least one StudentFee
  // explicitly references it in the feeStructures array — no proxy heuristics.
  const structureIds = items.map(i => i._id);
  const assignedIds = structureIds.length > 0
    ? await StudentFee.distinct('feeStructures', { feeStructures: { $in: structureIds }, institute: instituteId })
    : [];
  const assignedSet = new Set(assignedIds.map(id => id.toString()));

  const data = items.map(item => ({
    ...item.toObject(),
    isAssigned: assignedSet.has(item._id.toString()),
  }));

  await cacheSet(cacheKey, { data, meta: { page: pageNum, limit: lim, total } }, 300);
  return { data, meta: { page: pageNum, limit: lim, total } };
};

export const getFeeStructureById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid id', 400);
  const item = await repo.findById(id);
  if (!item) throw new AppError('Not found', 404);
  return item;
};

export const updateFeeStructure = async (id, body) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid id', 400);

  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Not found', 404);

  const { category, classId, studentId, particulars, instituteId } = body;

  if (category && !['all', 'class', 'student'].includes(category)) throw new AppError('Invalid category', 400);
  if (category === 'class' && !classId && !existing.classId) throw new AppError('classId is required for class category', 400);
  if (category === 'student' && !studentId && !existing.studentId) throw new AppError('studentId is required for student category', 400);
  if (classId && !mongoose.Types.ObjectId.isValid(classId)) throw new AppError('Invalid classId', 400);
  if (studentId && !mongoose.Types.ObjectId.isValid(studentId)) throw new AppError('Invalid studentId', 400);

  if (category) existing.category = category;
  if (classId) existing.classId = classId;
  if (studentId) existing.studentId = studentId;
  if (instituteId) existing.instituteId = instituteId;

  if (particulars) {
    if (!Array.isArray(particulars) || particulars.length === 0) throw new AppError('particulars are required', 400);
    const cleaned = particulars.map((p) => ({ label: String(p.label || '').trim(), amount: Number(p.amount || 0) }));
    existing.particulars = cleaned;
    existing.totalAmount = computeTotal(cleaned);
  } else {
    existing.totalAmount = existing.totalAmount || computeTotal(existing.particulars || []);
  }

  await existing.save();
  await cacheDelPattern(`fees:struct:${existing.instituteId}:*`);
  return existing;
};

export const deleteFeeStructure = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid id', 400);
  const deleted = await repo.deleteById(id);
  if (!deleted) throw new AppError('Not found', 404);
  await cacheDelPattern(`fees:struct:${deleted.instituteId}:*`);
  return deleted;
};
