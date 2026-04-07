import { AppError } from '../errors/AppError.js';
import * as gradingRepo from '../repositories/grading.repository.js';
import mongoose from 'mongoose';

// ─── Utility exported for result.service.js ──────────────────────────────────

/**
 * Resolve a grade letter from a score using the institute's default grading scale.
 * Falls back to built-in scale if no scale is configured.
 */
export const resolveGrade = async (instituteId, score) => {
  const scale = await gradingRepo.findDefaultByInstitute(instituteId);

  if (scale) {
    const entry = scale.grades.find((g) => score >= g.minScore && score <= g.maxScore);
    return entry ? entry.grade : 'F';
  }

  // Built-in fallback
  if (score >= 70) return 'A';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createGradingScale = async (body, user) => {
  const { name, grades, isDefault } = body;
  const instituteId = user.institute?._id || user.institute;

  if (!name || !Array.isArray(grades) || grades.length === 0) {
    throw new AppError('Name and at least one grade entry are required', 400);
  }

  for (const entry of grades) {
    if (entry.minScore > entry.maxScore) {
      throw new AppError(
        `Invalid range for grade "${entry.grade}": minScore cannot exceed maxScore`,
        400
      );
    }
  }

  if (isDefault) {
    await gradingRepo.unsetAllDefaults(instituteId);
  }

  return gradingRepo.create({
    institute: instituteId,
    name,
    grades,
    isDefault: isDefault || false,
    createdBy: user._id,
  });
};

export const getGradingScales = async (user) => {
  const instituteId = user.institute?._id || user.institute;
  return gradingRepo.findByInstitute(instituteId);
};

export const getDefaultGradingScale = async (user) => {
  const instituteId = user.institute?._id || user.institute;
  const scale = await gradingRepo.findDefaultByInstitute(instituteId);
  if (!scale) throw new AppError('No default grading scale set', 404);
  return scale;
};

export const getGradingScaleById = async (id, user) => {
  const instituteId = user.institute?._id || user.institute;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid grading scale ID', 400);
  }

  const scale = await gradingRepo.findById(id, instituteId);
  if (!scale) throw new AppError('Grading scale not found', 404);
  return scale;
};

export const updateGradingScale = async (id, body, user) => {
  const { name, grades, isDefault } = body;
  const instituteId = user.institute?._id || user.institute;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid grading scale ID', 400);
  }

  const scale = await gradingRepo.findById(id, instituteId);
  if (!scale) throw new AppError('Grading scale not found', 404);

  if (grades) {
    for (const entry of grades) {
      if (entry.minScore > entry.maxScore) {
        throw new AppError(
          `Invalid range for grade "${entry.grade}": minScore cannot exceed maxScore`,
          400
        );
      }
    }
    scale.grades = grades;
  }

  if (name) scale.name = name;

  if (isDefault === true) {
    await gradingRepo.unsetOtherDefaults(instituteId, id);
    scale.isDefault = true;
  } else if (isDefault === false) {
    scale.isDefault = false;
  }

  return gradingRepo.save(scale);
};

export const setDefaultGradingScale = async (id, user) => {
  const instituteId = user.institute?._id || user.institute;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid grading scale ID', 400);
  }

  const scale = await gradingRepo.findById(id, instituteId);
  if (!scale) throw new AppError('Grading scale not found', 404);

  await gradingRepo.unsetAllDefaults(instituteId);
  scale.isDefault = true;
  await gradingRepo.save(scale);

  return scale;
};

export const deleteGradingScale = async (id, user) => {
  const instituteId = user.institute?._id || user.institute;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid grading scale ID', 400);
  }

  const scale = await gradingRepo.findById(id, instituteId);
  if (!scale) throw new AppError('Grading scale not found', 404);

  if (scale.isDefault) {
    throw new AppError(
      'Cannot delete the default grading scale. Set another as default first.',
      400
    );
  }

  await gradingRepo.deleteOne(scale);
};
