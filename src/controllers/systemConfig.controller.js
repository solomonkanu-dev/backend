import * as systemConfigService from '../services/systemConfig.service.js';
import * as notificationSettingsService from '../services/notificationSettings.service.js';

export const getMaintenanceStatus = async (req, res, next) => {
  try {
    const data = await systemConfigService.getMaintenanceStatus();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const toggleGlobalMaintenance = async (req, res, next) => {
  try {
    const data = await systemConfigService.toggleGlobalMaintenance(req.body, req);
    res.json({
      success: true,
      message: `Global maintenance ${req.body.enabled ? 'enabled' : 'disabled'}`,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const toggleInstituteMaintenance = async (req, res, next) => {
  try {
    const data = await systemConfigService.toggleInstituteMaintenance(req.body, req);
    res.json({
      success: true,
      message: `Institute maintenance ${req.body.enabled ? 'enabled' : 'disabled'}`,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyInstituteMaintenanceStatus = async (req, res, next) => {
  try {
    const data = await systemConfigService.getMyInstituteMaintenanceStatus(req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getInstituteNotificationChannels = async (req, res, next) => {
  try {
    const data = await notificationSettingsService.getAllInstituteChannelStates();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const setInstituteNotificationChannels = async (req, res, next) => {
  try {
    const { instituteId, smsEnabled, emailEnabled } = req.body;
    const data = await notificationSettingsService.setInstituteChannels(instituteId, { smsEnabled, emailEnabled });
    res.json({ success: true, message: 'Notification channels updated', data });
  } catch (err) {
    next(err);
  }
};
