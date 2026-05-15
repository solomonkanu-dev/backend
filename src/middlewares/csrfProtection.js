const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

// State-changing cookie-authenticated requests must carry an Origin header that
// matches the ALLOWED_ORIGINS allowlist. JSON requests are already protected by
// the CORS preflight, but multipart/form-data and urlencoded are "simple"
// requests that skip preflight — without this guard an attacker site could
// trigger uploads or other mutations under the victim's session cookie.
export const csrfProtection = (req, res, next) => {
  const safe = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  if (safe) return next();

  // Bearer-token requests are CSRF-safe (the browser never attaches the token
  // automatically), so they bypass this check.
  const usingBearer = req.headers.authorization?.startsWith?.('Bearer ');
  const hasCookieAuth = !!req.cookies?.token;
  if (usingBearer || !hasCookieAuth) return next();

  const origin = (req.headers.origin || '').replace(/\/$/, '');
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ message: 'Cross-site request blocked' });
  }
  next();
};
