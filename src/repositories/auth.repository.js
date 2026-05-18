import User from '../models/user.js';

// Includes password — only use for login credential verification
export const findByEmailForLogin = (email) =>
  User.findOne({ email }).populate('institute', 'name logo schoolType onboardingCompleted status');

// Excludes password — safe for returning user data to clients
export const findByEmailWithInstitute = (email) =>
  User.findOne({ email }).select('-password').populate('institute', 'name logo schoolType onboardingCompleted status');

export const findByIdWithInstitute = (id) =>
  User.findById(id).select('-password').populate('institute', 'name logo schoolType onboardingCompleted status');
