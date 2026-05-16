import { AppError } from '../errors/AppError.js';
import * as repo from '../repositories/reportCardTemplate.repository.js';
import mongoose from 'mongoose';

const EDITABLE_FIELDS = [
  'name',
  'layout',
  'primaryColor',
  'headerTextColor',
  'stripeColor',
  'cardBg',
  'reportTitle',
  'footerNote',
  'signatureLabels',
  'showSchoolHeader',
  'showPhoto',
  'showAttendance',
  'showPosition',
  'showTermBreakdown',
  'fontFamily',
  'letterheadImage',
  'watermarkImage',
];

const pickFields = (body) => {
  const out = {};
  for (const key of EDITABLE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
};

const getInstituteId = (user) => user.institute?._id || user.institute;

export const createTemplate = async (body, user) => {
  const instituteId = getInstituteId(user);
  if (!body.name || !String(body.name).trim()) {
    throw new AppError('Template name is required', 400);
  }

  const fields = pickFields(body);

  if (body.isDefault) {
    await repo.unsetAllDefaults(instituteId);
  }

  return repo.create({
    ...fields,
    institute: instituteId,
    isDefault: body.isDefault || false,
    createdBy: user._id,
  });
};

export const getTemplates = async (user) => {
  return repo.findByInstitute(getInstituteId(user));
};

export const getDefaultTemplate = async (user) => {
  const template = await repo.findDefaultByInstitute(getInstituteId(user));
  if (!template) throw new AppError('No default report card template set', 404);
  return template;
};

export const getTemplateById = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid template ID', 400);
  }
  const template = await repo.findById(id, getInstituteId(user));
  if (!template) throw new AppError('Report card template not found', 404);
  return template;
};

export const updateTemplate = async (id, body, user) => {
  const instituteId = getInstituteId(user);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid template ID', 400);
  }

  const template = await repo.findById(id, instituteId);
  if (!template) throw new AppError('Report card template not found', 404);

  const fields = pickFields(body);
  Object.assign(template, fields);

  if (body.isDefault === true) {
    await repo.unsetOtherDefaults(instituteId, id);
    template.isDefault = true;
  } else if (body.isDefault === false) {
    template.isDefault = false;
  }

  return repo.save(template);
};

export const setDefaultTemplate = async (id, user) => {
  const instituteId = getInstituteId(user);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid template ID', 400);
  }

  const template = await repo.findById(id, instituteId);
  if (!template) throw new AppError('Report card template not found', 404);

  await repo.unsetAllDefaults(instituteId);
  template.isDefault = true;
  await repo.save(template);

  return template;
};

export const deleteTemplate = async (id, user) => {
  const instituteId = getInstituteId(user);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid template ID', 400);
  }

  const template = await repo.findById(id, instituteId);
  if (!template) throw new AppError('Report card template not found', 404);

  await repo.deleteOne(template);
};
