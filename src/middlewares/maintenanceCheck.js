import SystemConfig from '../models/SystemConfig.js';
import { cacheGet, cacheSet, cacheDel } from '../utils/cache.js';

const CACHE_KEY = 'maintenance:global';
const CACHE_TTL = 30; // seconds

const loadConfig = async () => {
  const cached = await cacheGet(CACHE_KEY);
  if (cached) return cached;

  const config = await SystemConfig.findOne({ key: 'global' });
  if (config) await cacheSet(CACHE_KEY, config, CACHE_TTL);
  return config;
};

export const invalidateMaintenanceCache = async () => {
  await cacheDel(CACHE_KEY);
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
