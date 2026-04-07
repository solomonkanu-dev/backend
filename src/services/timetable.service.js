import * as repo from '../repositories/timetable.repository.js';
import { AppError } from '../errors/AppError.js';

export const getTimetableByClass = (classId, institute) =>
  repo.findByClass(classId, institute);

export const getAllTimetables = (institute) =>
  repo.findByInstitute(institute);

export const createOrUpdateTimetable = async ({ classId, entries }, institute) => {
  if (!classId) throw new AppError('classId is required', 400);
  return repo.upsertByClass(classId, institute, entries);
};

export const updateTimetable = async (id, { entries }, institute) => {
  const timetable = await repo.updateById(id, institute, entries);
  if (!timetable) throw new AppError('Timetable not found', 404);
  return timetable;
};

export const deleteTimetable = async (id, institute) => {
  const timetable = await repo.deleteById(id, institute);
  if (!timetable) throw new AppError('Timetable not found', 404);
};
