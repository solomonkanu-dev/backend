import User from '../models/user.js';
import Institute from '../models/Institute.js';

export const updateUserPhoto = (userId, profilePhoto) =>
  User.findByIdAndUpdate(userId, { profilePhoto }, { new: true, select: '-password' });

export const findUserById = (id) => User.findById(id).select('profilePhoto');

export const updateInstituteLogo = (instituteId, logo) =>
  Institute.findByIdAndUpdate(instituteId, { logo }, { new: true });
