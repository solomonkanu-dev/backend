import User from '../models/user.js';

export const findByEmailWithInstitute = (email) =>
  User.findOne({ email }).populate('institute', 'name schoolType onboardingCompleted');

export const findByIdWithInstitute = (id) =>
  User.findById(id).select('-password').populate('institute', 'name schoolType onboardingCompleted');
