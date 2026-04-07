import * as repo from '../repositories/systemConfig.repository.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/audit.js';
import { notifySuperAdmins } from '../utils/notify.js';
import { invalidateMaintenanceCache } from '../middlewares/maintenanceCheck.js';

export const getMaintenanceStatus = async () => {
  const config = await repo.findGlobal();
  if (!config) {
    return {
      global: { enabled: false, message: 'System is under maintenance. Please try again later.' },
      institutes: [],
    };
  }
  return config.maintenanceMode;
};

export const toggleGlobalMaintenance = async ({ enabled, message }, req) => {
  if (typeof enabled !== 'boolean') throw new AppError('"enabled" boolean is required', 400);

  const update = {
    'maintenanceMode.global.enabled': enabled,
    ...(message !== undefined && { 'maintenanceMode.global.message': message }),
  };

  if (enabled) {
    update['maintenanceMode.global.enabledAt'] = new Date();
    update['maintenanceMode.global.enabledBy'] = req.user._id;
  }

  const config = await repo.upsertGlobal(update);
  invalidateMaintenanceCache();

  logAudit(req, {
    action: 'TOGGLE_GLOBAL_MAINTENANCE',
    entity: 'SystemConfig',
    entityId: config._id,
    description: `Global maintenance ${enabled ? 'enabled' : 'disabled'}`,
    statusCode: 200,
  });

  if (enabled) {
    notifySuperAdmins({
      type: 'maintenance_toggled',
      title: 'Global Maintenance Enabled',
      message: message || 'System is under maintenance. Please try again later.',
    });
  }

  return config.maintenanceMode.global;
};

export const toggleInstituteMaintenance = async ({ instituteId, enabled, message }, req) => {
  if (!instituteId) throw new AppError('instituteId is required', 400);
  if (typeof enabled !== 'boolean') throw new AppError('"enabled" boolean is required', 400);

  await repo.ensureGlobalExists();
  await repo.pullInstituteEntry(instituteId);
  await repo.pushInstituteEntry({
    institute: instituteId,
    enabled,
    message: message || '',
    enabledAt: enabled ? new Date() : null,
    enabledBy: enabled ? req.user._id : null,
  });

  invalidateMaintenanceCache();

  const config = await repo.findGlobal();
  logAudit(req, {
    action: 'TOGGLE_INSTITUTE_MAINTENANCE',
    entity: 'Institute',
    entityId: instituteId,
    description: `Institute maintenance ${enabled ? 'enabled' : 'disabled'} for ${instituteId}`,
    statusCode: 200,
  });

  return config.maintenanceMode.institutes;
};

export const getMyInstituteMaintenanceStatus = async (user) => {
  const instituteId = user.institute?._id?.toString() || user.institute?.toString();
  if (!instituteId) throw new AppError('No institute associated with your account', 400);

  const config = await repo.findGlobal();
  if (!config) return { enabled: false };

  const entry = (config.maintenanceMode?.institutes || []).find(
    (i) => i.institute?.toString() === instituteId
  );

  return entry
    ? { enabled: entry.enabled, message: entry.message, enabledAt: entry.enabledAt }
    : { enabled: false };
};
