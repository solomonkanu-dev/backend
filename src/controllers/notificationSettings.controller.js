import * as notificationSettingsService from '../services/notificationSettings.service.js';

export const getSettings = async (req, res, next) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;
    const data = await notificationSettingsService.getSettings(instituteId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;
    const data = await notificationSettingsService.updateSettings(instituteId, req.body);
    res.json({ message: 'Settings updated', data });
  } catch (err) {
    next(err);
  }
};

export const sendTestEmail = async (req, res, next) => {
  try {
    const { testEmail } = req.body;
    const instituteId = req.user.institute?._id || req.user.institute;
    await notificationSettingsService.sendTestEmail(instituteId, testEmail, req.user._id);
    res.json({ message: `Test email sent to ${testEmail}` });
  } catch (err) {
    next(err);
  }
};

export const sendTestSms = async (req, res, next) => {
  try {
    const { testPhone } = req.body;
    await notificationSettingsService.sendTestSms(testPhone);
    res.json({ message: `Test SMS sent to ${testPhone}` });
  } catch (err) {
    next(err);
  }
};

export const getEmailLogs = async (req, res, next) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;
    const result = await notificationSettingsService.getEmailLogs(instituteId, req.query.page);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
