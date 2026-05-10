import * as repo from '../repositories/timetable.repository.js';
import { AppError } from '../errors/AppError.js';
import { cacheGet, cacheSet, cacheDel } from '../utils/cache.js';

export const getTimetableByClass = (classId, institute) =>
  repo.findByClass(classId, institute);

export const getAllTimetables = async (institute) => {
  const instituteId = institute?._id ?? institute;
  const cacheKey = `timetable:${instituteId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const data = await repo.findByInstitute(institute);
  await cacheSet(cacheKey, data, 300);
  return data;
};

export const createOrUpdateTimetable = async ({ classId, entries }, institute) => {
  if (!classId) throw new AppError('classId is required', 400);
  const result = await repo.upsertByClass(classId, institute, entries);
  await cacheDel(`timetable:${institute?._id ?? institute}`);
  return result;
};

export const updateTimetable = async (id, { entries }, institute) => {
  const timetable = await repo.updateById(id, institute, entries);
  if (!timetable) throw new AppError('Timetable not found', 404);
  await cacheDel(`timetable:${institute?._id ?? institute}`);
  return timetable;
};

export const deleteTimetable = async (id, institute) => {
  const timetable = await repo.deleteById(id, institute);
  if (!timetable) throw new AppError('Timetable not found', 404);
  await cacheDel(`timetable:${institute?._id ?? institute}`);
};
