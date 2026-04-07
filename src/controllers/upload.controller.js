import * as uploadService from '../services/upload.service.js';

export const uploadProfilePhoto = async (req, res, next) => {
  try {
    const result = await uploadService.uploadProfilePhoto(req.file, req.user._id);
    res.json({
      message: 'Profile photo uploaded successfully',
      profilePhoto: result.profilePhoto,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
};

export const getProfilePhoto = async (req, res, next) => {
  try {
    const profilePhoto = await uploadService.getProfilePhoto(req.user._id);
    res.json({ profilePhoto });
  } catch (err) {
    next(err);
  }
};

export const uploadInstituteLogo = async (req, res, next) => {
  try {
    const result = await uploadService.uploadInstituteLogo(req.file, req.user);
    res.json({
      message: 'Institute logo uploaded successfully',
      logo: result.logo,
      institute: result.institute,
    });
  } catch (err) {
    next(err);
  }
};

export const uploadAssignmentFile = async (req, res, next) => {
  try {
    const result = await uploadService.uploadAssignmentFile(req.file, req.user);
    res.json({
      message: 'File uploaded successfully',
      fileUrl: result.fileUrl,
      publicId: result.publicId,
      resourceType: result.resourceType,
    });
  } catch (err) {
    next(err);
  }
};
