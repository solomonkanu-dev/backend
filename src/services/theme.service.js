import mongoose from 'mongoose';
import * as repo from '../repositories/theme.repository.js';
import { AppError } from '../errors/AppError.js';

const resolveInstituteId = (userInstitute) => {
  const id = userInstitute?._id ?? userInstitute;
  return mongoose.Types.ObjectId.isValid(id) ? id : null;
};

export const createTheme = async (body, user) => {
  const { name, description, primary, secondary, accent, success, danger, warning, info, dark, light, fontFamily, fontSize, logo, favicon, backgroundImage } = body;
  const instituteId = resolveInstituteId(user?.institute) || body.institute;

  if (!name) throw new AppError('Theme name is required', 400);
  if (!instituteId) throw new AppError('Institute ID is required', 400);

  return repo.createTheme({
    name: name.trim(), description, institute: instituteId,
    primary, secondary, accent, success, danger, warning, info, dark, light,
    fontFamily, fontSize, logo, favicon, backgroundImage,
    createdBy: user?._id,
  });
};

export const getThemes = async (query, user) => {
  const { instituteId, isActive, page = 1, limit = 20 } = query;
  const q = {};

  if (instituteId) q.institute = instituteId;
  else {
    const instId = resolveInstituteId(user?.institute);
    if (instId) q.institute = instId;
  }
  if (isActive !== undefined) q.isActive = isActive === 'true';

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

  const [themes, total] = await Promise.all([
    repo.findPaginated(q, (pageNum - 1) * lim, lim),
    repo.countDocuments(q),
  ]);

  return { data: themes, meta: { page: pageNum, limit: lim, total } };
};

export const getThemeById = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid theme ID', 400);

  const theme = await repo.findById(id);
  if (!theme) throw new AppError('Theme not found', 404);

  const userInstId = resolveInstituteId(user?.institute);
  if (userInstId && theme.institute.toString() !== userInstId.toString()) {
    throw new AppError('Access denied', 403);
  }

  return theme;
};

export const getActiveTheme = async (user, queryInstitute) => {
  const instituteId = resolveInstituteId(user?.institute) || queryInstitute;
  if (!instituteId) throw new AppError('Institute ID is required', 400);

  const theme = await repo.findActive(instituteId);
  if (!theme) throw new AppError('No active theme found', 404);
  return theme;
};

export const updateTheme = async (id, body, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid theme ID', 400);

  const theme = await repo.findById(id);
  if (!theme) throw new AppError('Theme not found', 404);

  const userInstituteId = resolveInstituteId(user?.institute);
  if (!userInstituteId || theme.institute.toString() !== userInstituteId.toString()) throw new AppError('Access denied', 403);

  const { name, description, primary, secondary, accent, success, danger, warning, info, dark, light, fontFamily, fontSize, logo, favicon, backgroundImage, isActive } = body;

  if (name) theme.name = name.trim();
  if (description !== undefined) theme.description = description;
  if (primary) theme.primary = primary;
  if (secondary) theme.secondary = secondary;
  if (accent) theme.accent = accent;
  if (success) theme.success = success;
  if (danger) theme.danger = danger;
  if (warning) theme.warning = warning;
  if (info) theme.info = info;
  if (dark) theme.dark = dark;
  if (light) theme.light = light;
  if (fontFamily) theme.fontFamily = fontFamily;
  if (fontSize) theme.fontSize = fontSize;
  if (logo) theme.logo = logo;
  if (favicon) theme.favicon = favicon;
  if (backgroundImage) theme.backgroundImage = backgroundImage;

  if (isActive === true) {
    await repo.deactivateOthers(theme.institute, id);
    theme.isActive = true;
  } else if (isActive === false) {
    theme.isActive = false;
  }

  await theme.save();
  return theme;
};

export const deleteTheme = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid theme ID', 400);

  const theme = await repo.findById(id);
  if (!theme) throw new AppError('Theme not found', 404);

  const userInstituteId = resolveInstituteId(user?.institute);
  if (!userInstituteId || theme.institute.toString() !== userInstituteId.toString()) throw new AppError('Access denied', 403);

  await theme.deleteOne();
  return theme;
};
