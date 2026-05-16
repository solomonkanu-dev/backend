import * as repo from '../repositories/upload.repository.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { AppError } from '../errors/AppError.js';

export const uploadProfilePhoto = async (file, userId) => {
  if (!file) throw new AppError('No file uploaded', 400);

  const result = await uploadToCloudinary(file.buffer, {
    folder: 'profile_photos',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });

  const user = await repo.updateUserPhoto(userId, result.secure_url);
  if (!user) throw new AppError('User not found', 404);

  return { profilePhoto: result.secure_url, user };
};

export const getProfilePhoto = async (userId) => {
  const user = await repo.findUserById(userId);
  if (!user) throw new AppError('User not found', 404);
  return user.profilePhoto || null;
};

export const uploadInstituteLogo = async (file, user) => {
  if (user.role !== 'admin') throw new AppError('Only admins can upload institute logos', 403);
  if (!file) throw new AppError('No file uploaded', 400);

  const instituteId = user.institute?._id || user.institute;
  if (!instituteId) throw new AppError('No institute associated with your account', 400);

  const result = await uploadToCloudinary(file.buffer, {
    folder: 'institute_logos',
    transformation: [
      { width: 400, height: 400, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });

  const institute = await repo.updateInstituteLogo(instituteId, result.secure_url);
  if (!institute) throw new AppError('Institute not found', 404);

  return { logo: result.secure_url, institute };
};

export const uploadReportCardAsset = async (file, user) => {
  if (user.role !== 'admin') throw new AppError('Only admins can upload report card assets', 403);
  if (!file) throw new AppError('No file uploaded', 400);

  const instituteId = user.institute?._id || user.institute;
  if (!instituteId) throw new AppError('No institute associated with your account', 400);

  const result = await uploadToCloudinary(file.buffer, {
    folder: 'reportcard_templates',
    transformation: [
      { width: 1600, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });

  return { url: result.secure_url };
};

export const uploadAssignmentFile = async (file, user) => {
  if (!['student', 'lecturer', 'admin'].includes(user.role)) {
    throw new AppError('Not allowed to upload assignment files', 403);
  }
  if (!file) throw new AppError('No file uploaded', 400);

  const isPdf = file.mimetype === 'application/pdf';
  const isDoc =
    file.mimetype === 'application/msword' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const result = await uploadToCloudinary(file.buffer, {
    folder: user.role === 'student' ? 'assignment_submissions' : 'assignment_files',
    resource_type: isPdf || isDoc ? 'raw' : 'image',
    ...(!(isPdf || isDoc) && { transformation: [{ quality: 'auto', fetch_format: 'auto' }] }),
  });

  return {
    fileUrl: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
  };
};
