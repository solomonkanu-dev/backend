import SystemConfig from '../models/SystemConfig.js';
import { logAudit } from '../utils/audit.js';
import { invalidateMaintenanceCache } from '../middlewares/maintenanceCheck.js';
import { notifySuperAdmins } from '../utils/notify.js';

const isDev = process.env.NODE_ENV === 'development';

export const getMaintenanceStatus = async (req, res) => {
  try {
    const config = await SystemConfig.findOne({ key: 'global' });

    if (!config) {
      return res.json({
        success: true,
        data: {
          global: { enabled: false, message: 'System is under maintenance. Please try again later.' },
          institutes: [],
        },
      });
    }

    res.json({
      success: true,
      data: config.maintenanceMode,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const toggleGlobalMaintenance = async (req, res) => {
  try {
    const { enabled, message } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: '"enabled" boolean is required' });
    }

    const update = {
      'maintenanceMode.global.enabled': enabled,
      ...(message !== undefined && { 'maintenanceMode.global.message': message }),
    };

    if (enabled) {
      update['maintenanceMode.global.enabledAt'] = new Date();
      update['maintenanceMode.global.enabledBy'] = req.user._id;
    }

    const config = await SystemConfig.findOneAndUpdate(
      { key: 'global' },
      { $set: update },
      { upsert: true, new: true }
    );

    invalidateMaintenanceCache();

    logAudit(req, { action: 'TOGGLE_GLOBAL_MAINTENANCE', entity: 'SystemConfig', entityId: config._id, description: `Global maintenance ${enabled ? 'enabled' : 'disabled'}`, statusCode: 200 });

    if (enabled) {
      notifySuperAdmins({
        type: 'maintenance_toggled',
        title: 'Global Maintenance Enabled',
        message: message || 'System is under maintenance. Please try again later.',
      });
    }

    res.json({ success: true, message: `Global maintenance ${enabled ? 'enabled' : 'disabled'}`, data: config.maintenanceMode.global });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const toggleInstituteMaintenance = async (req, res) => {
  try {
    const { instituteId, enabled, message } = req.body;

    if (!instituteId) {
      return res.status(400).json({ success: false, message: 'instituteId is required' });
    }
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: '"enabled" boolean is required' });
    }

    // Ensure config document exists
    await SystemConfig.findOneAndUpdate(
      { key: 'global' },
      { $setOnInsert: { key: 'global' } },
      { upsert: true, new: true }
    );

    // Remove existing entry for this institute then push new one
    await SystemConfig.updateOne(
      { key: 'global' },
      { $pull: { 'maintenanceMode.institutes': { institute: instituteId } } }
    );

    await SystemConfig.updateOne(
      { key: 'global' },
      {
        $push: {
          'maintenanceMode.institutes': {
            institute: instituteId,
            enabled,
            message: message || '',
            enabledAt: enabled ? new Date() : null,
            enabledBy: enabled ? req.user._id : null,
          },
        },
      }
    );

    invalidateMaintenanceCache();

    const config = await SystemConfig.findOne({ key: 'global' });

    logAudit(req, { action: 'TOGGLE_INSTITUTE_MAINTENANCE', entity: 'Institute', entityId: instituteId, description: `Institute maintenance ${enabled ? 'enabled' : 'disabled'} for ${instituteId}`, statusCode: 200 });

    res.json({ success: true, message: `Institute maintenance ${enabled ? 'enabled' : 'disabled'}`, data: config.maintenanceMode.institutes });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const getMyInstituteMaintenanceStatus = async (req, res) => {
  try {
    const instituteId = req.user.institute?._id?.toString() || req.user.institute?.toString();

    if (!instituteId) {
      return res.status(400).json({ success: false, message: 'No institute associated with your account' });
    }

    const config = await SystemConfig.findOne({ key: 'global' });

    if (!config) {
      return res.json({ success: true, data: { enabled: false } });
    }

    const entry = (config.maintenanceMode?.institutes || []).find(
      (i) => i.institute?.toString() === instituteId
    );

    res.json({
      success: true,
      data: entry ? { enabled: entry.enabled, message: entry.message, enabledAt: entry.enabledAt } : { enabled: false },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};
