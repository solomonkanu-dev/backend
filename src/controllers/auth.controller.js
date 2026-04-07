import * as authService from '../services/auth.service.js';

export const login = async (req, res, next) => {
  try {
    const { token, user } = await authService.login(req.body, req);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
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

export const logout = (req, res) => {
  authService.logout(req);

  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });

  res.json({ statusCode: 200, message: 'Logged out successfully' });
};
