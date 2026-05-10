import * as repo from '../repositories/instituteModules.repository.js';
import User from '../models/user.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/audit.js';
import { VALID_MODULE_KEYS } from '../validators/instituteModules.validator.js';
import { cacheGet, cacheSet, cacheDel } from '../utils/cache.js';

export const getModules = async (instituteId) => {
  const cacheKey = `modules:${instituteId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  let doc = await repo.findByInstitute(instituteId);
  if (!doc) {
    const created = await repo.createDefaults(instituteId);
    doc = created.toObject();
  }
  await cacheSet(cacheKey, doc, 1800);
  return doc;
};

export const updateModules = async (instituteId, partialModules, req) => {
  const update = {};
  for (const [key, val] of Object.entries(partialModules)) {
    if (!VALID_MODULE_KEYS.includes(key)) continue;
    if (typeof val !== 'boolean') throw new AppError(`Value for "${key}" must be a boolean`, 400);
    update[`modules.${key}`] = val;
  }
  const doc = await repo.findOneAndUpdate(instituteId, update);
  await cacheDel(`modules:${instituteId}`);

  logAudit(req, {
    action: 'UPDATE_MODULE_TOGGLES',
    entity: 'InstituteModules',
    entityId: doc._id,
    description: 'Institute module toggles updated',
    after: partialModules,
    statusCode: 200,
  });

  return doc;
};

export const getLecturerModuleAccess = async (lecturerId) => {
  const user = await User.findById(lecturerId).select('moduleAccess role').lean();
  if (!user) throw new AppError('Lecturer not found', 404);
  if (user.role !== 'lecturer') throw new AppError('User is not a lecturer', 400);
  return { lecturerId, moduleAccess: user.moduleAccess ?? [] };
};

export const setLecturerModuleAccess = async (lecturerId, moduleAccess, req) => {
  const user = await User.findById(lecturerId).select('role').lean();
  if (!user) throw new AppError('Lecturer not found', 404);
  if (user.role !== 'lecturer') throw new AppError('User is not a lecturer', 400);

  await User.findByIdAndUpdate(lecturerId, { $set: { moduleAccess } });

  logAudit(req, {
    action: 'SET_LECTURER_MODULE_ACCESS',
    entity: 'User',
    entityId: lecturerId,
    description: 'Lecturer module access updated',
    after: { moduleAccess },
    statusCode: 200,
  });

  return { lecturerId, moduleAccess };
};
