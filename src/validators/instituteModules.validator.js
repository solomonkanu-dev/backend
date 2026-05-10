export const VALID_MODULE_KEYS = [
  'teachers', 'classes', 'students', 'parents',
  'subjects', 'timetable', 'academicCalendar', 'assignments',
  'attendance', 'results', 'exams', 'promote',
  'fees', 'terms', 'salary', 'financialRecords',
  'messages', 'announcements', 'gallery',
  'aiAnalytics', 'auditLogs', 'archive',
];

export const validateModuleKeys = (req, res, next) => {
  const incoming = Object.keys(req.body?.modules ?? {});
  const invalid = incoming.filter((k) => !VALID_MODULE_KEYS.includes(k));
  if (invalid.length) {
    return res.status(400).json({ message: `Unknown module keys: ${invalid.join(', ')}` });
  }
  next();
};

export const validateModuleAccessArray = (req, res, next) => {
  const arr = req.body?.moduleAccess;
  if (!Array.isArray(arr)) {
    return res.status(400).json({ message: 'moduleAccess must be an array' });
  }
  const stripped = arr.map((k) => (k.startsWith('!') ? k.slice(1) : k));
  const invalid = stripped.filter((k) => !VALID_MODULE_KEYS.includes(k));
  if (invalid.length) {
    return res.status(400).json({ message: `Unknown module keys: ${invalid.join(', ')}` });
  }
  next();
};
