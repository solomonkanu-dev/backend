import NotificationSettings from '../models/NotificationSettings.js';
import EmailLog from '../models/EmailLog.js';
import SmsLog from '../models/SmsLog.js';

export const findByInstitute = (instituteId) =>
  NotificationSettings.findOne({ institute: instituteId }).lean();

export const createSettings = (instituteId) =>
  NotificationSettings.create({ institute: instituteId });

export const findOneAndUpdate = (instituteId, update) =>
  NotificationSettings.findOneAndUpdate(
    { institute: instituteId },
    { $set: update },
    { new: true, upsert: true, runValidators: true }
  );

export const findAll = () => NotificationSettings.find({}).lean();

export const createEmailLog = (data) => EmailLog.create(data).catch(() => {});

export const findEmailLogs = (instituteId, skip, limit) =>
  EmailLog.find({ institute: instituteId })
    .sort({ sentAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('recipientUser', 'fullName')
    .lean();

export const countEmailLogs = (instituteId) =>
  EmailLog.countDocuments({ institute: instituteId });

export const createSmsLog = (data) => SmsLog.create(data).catch(() => {});

export const findSmsLogs = (instituteId, skip, limit) =>
  SmsLog.find({ institute: instituteId })
    .sort({ sentAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('recipientUser', 'fullName')
    .lean();

export const countSmsLogs = (instituteId) =>
  SmsLog.countDocuments({ institute: instituteId });
