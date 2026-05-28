import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AppError } from '../errors/AppError.js';
import * as authRepo from '../repositories/auth.repository.js';
import { logAudit } from '../utils/audit.js';

const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role, institute: user.institute },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

export const login = async (body, req) => {
  const { email, password } = body;

  const user = await authRepo.findByEmailForLogin(email);
  if (!user) throw new AppError('Invalid credentials', 401);

  if (!user.approved) throw new AppError('Account pending approval', 403);
  if (!user.isActive) throw new AppError('Account has been suspended', 403);

  if (
    user.role !== 'super_admin' &&
    user.institute &&
    user.institute.status &&
    user.institute.status !== 'active'
  ) {
    throw new AppError('Institute access has been disabled', 403);
  }

  if (!user.password) {
    logAudit(req, {
      action: 'LOGIN_FAILED',
      entity: 'User',
      entityId: user._id,
      description: `Failed login — no password set for ${user.email}`,
      statusCode: 401,
      userOverride: user,
    });
    throw new AppError('Invalid credentials', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    logAudit(req, {
      action: 'LOGIN_FAILED',
      entity: 'User',
      entityId: user._id,
      description: `Failed login — incorrect password for ${user.email}`,
      statusCode: 401,
      userOverride: user,
    });
    throw new AppError('Invalid credentials', 401);
  }

  const token = signToken(user);

  logAudit(req, {
    action: 'LOGIN',
    entity: 'User',
    entityId: user._id,
    description: `${user.role} logged in`,
    statusCode: 200,
    userOverride: user,
  });

  const safeUser = user.toObject();
  delete safeUser.password;

  return { token, user: safeUser };
};

export const getMe = async (userId) => authRepo.findByIdWithInstitute(userId);

export const changePassword = async (userId, { currentPassword, newPassword }, req) => {
  if (!currentPassword || !newPassword) {
    throw new AppError('Current and new password are required', 400);
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new AppError('New password must be at least 8 characters', 400);
  }

  const user = await authRepo.findByIdForPasswordChange(userId);
  if (!user) throw new AppError('User not found', 404);
  if (!user.password) throw new AppError('Password reset is not available for this account', 400);

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    logAudit(req, {
      action: 'CHANGE_PASSWORD_FAILED',
      entity: 'User',
      entityId: user._id,
      description: 'Failed password change — incorrect current password',
      statusCode: 401,
    });
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  logAudit(req, {
    action: 'CHANGE_PASSWORD',
    entity: 'User',
    entityId: user._id,
    description: `${user.role} changed their password`,
    statusCode: 200,
  });
};

export const logout = (req) => {
  logAudit(req, {
    action: 'LOGOUT',
    entity: 'User',
    entityId: req.user?._id,
    description: 'User logged out',
    statusCode: 200,
  });
};
