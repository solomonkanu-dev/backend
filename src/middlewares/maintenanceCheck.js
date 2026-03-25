import SystemConfig from '../models/SystemConfig.js';

let cachedConfig = null;
let lastFetched = 0;

const loadConfig = async () => {
  if (!cachedConfig || Date.now() - lastFetched > 30000) {
    cachedConfig = await SystemConfig.findOne({ key: 'global' });
    lastFetched = Date.now();
  }
  return cachedConfig;
};

export const invalidateMaintenanceCache = () => {
  lastFetched = 0;
};

export const maintenanceCheck = async (req, res, next) => {
  try {
    const config = await loadConfig();

    if (!config) return next();

    const globalMaintenance = config.maintenanceMode?.global;

    if (globalMaintenance?.enabled) {
      return res.status(503).json({
        success: false,
        maintenance: true,
        message: globalMaintenance.message || 'System is under maintenance. Please try again later.',
      });
    }

    next();
  } catch (_) {
    // Never block requests due to maintenance check errors
    next();
  }
};

export const instituteMaintenanceCheck = async (req, res, next) => {
  try {
    const config = await loadConfig();

    if (!config) return next();

    const instituteId = req.user?.institute?._id?.toString() || req.user?.institute?.toString();

    if (!instituteId) return next();

    const institutes = config.maintenanceMode?.institutes || [];
    const entry = institutes.find(
      (i) => i.institute?.toString() === instituteId
    );

    if (entry?.enabled) {
      return res.status(503).json({
        success: false,
        maintenance: true,
        message: entry.message || 'Your institute is under maintenance. Please try again later.',
      });
    }

    next();
  } catch (_) {
    next();
  }
};
