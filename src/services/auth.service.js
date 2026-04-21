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

  if (!user.password) throw new AppError('Invalid credentials', 401);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError('Invalid credentials', 401);

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

export const logout = (req) => {
  logAudit(req, {
    action: 'LOGOUT',
    entity: 'User',
    entityId: req.user?._id,
    description: 'User logged out',
    statusCode: 200,
  });
};
