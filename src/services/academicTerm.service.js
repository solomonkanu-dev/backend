import * as repo from '../repositories/academicTerm.repository.js';
import { AppError } from '../errors/AppError.js';

export const createTerm = async ({ institute, name, type, academicYear, startDate, endDate, isCurrent }) => {
  if (!institute) throw new AppError('Institute required', 400);

  if (isCurrent) {
    await repo.clearCurrentTerms(institute);
  }

  try {
    const term = await repo.createTerm({ name, type, academicYear, startDate, endDate, isCurrent: isCurrent ?? false, institute });
    return term;
  } catch (err) {
    if (err.code === 11000) throw new AppError('A term with this name already exists for this academic year', 409);
    throw err;
  }
};

export const getTerms = async (institute) => {
  if (!institute) throw new AppError('Institute required', 400);
  return repo.findByInstitute(institute);
};

export const updateTerm = async (termId, institute, { name, type, academicYear, startDate, endDate, isCurrent }) => {
  const term = await repo.findOneByInstitute(termId, institute);
  if (!term) throw new AppError('Term not found', 404);

  if (isCurrent) {
    await repo.clearCurrentTermsExcept(institute, termId);
  }

  if (name !== undefined) term.name = name;
  if (type !== undefined) term.type = type;
  if (academicYear !== undefined) term.academicYear = academicYear;
  if (startDate !== undefined) term.startDate = startDate;
  if (endDate !== undefined) term.endDate = endDate;
  if (isCurrent !== undefined) term.isCurrent = isCurrent;

  try {
    await term.save();
    return term;
  } catch (err) {
    if (err.code === 11000) throw new AppError('A term with this name already exists for this academic year', 409);
    throw err;
  }
};

export const deleteTerm = async (termId, institute) => {
  const term = await repo.deleteByIdAndInstitute(termId, institute);
  if (!term) throw new AppError('Term not found', 404);
};

export const setCurrentTerm = async (termId, institute) => {
  const term = await repo.findOneByInstitute(termId, institute);
  if (!term) throw new AppError('Term not found', 404);

  await repo.clearCurrentTerms(institute);
  term.isCurrent = true;
  await term.save();
  return term;
};
