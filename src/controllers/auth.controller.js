import * as authService from '../services/auth.service.js';

export const login = async (req, res, next) => {
  try {
    const { token, user } = await authService.login(req.body, req);

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,         // JS cannot read this cookie — blocks XSS token theft
      secure: isProduction,   // HTTPS only in production
      sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-origin in prod
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    res.json({ statusCode: 200, token, user });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(req.user.id, req.body, req);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

export const logout = (req, res) => {
  authService.logout(req);

  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    expires: new Date(0),
  });

  res.json({ statusCode: 200, message: 'Logged out successfully' });
};
