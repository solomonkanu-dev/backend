import * as repo from '../repositories/notificationSettings.repository.js';
import Institute from '../models/Institute.js';
import { AppError } from '../errors/AppError.js';
import { sendTestEmailDirect } from '../utils/email.js';

export const getSettings = async (instituteId) => {
  let settings = await repo.findByInstitute(instituteId);
  if (!settings) {
    const created = await repo.createSettings(instituteId);
    settings = created.toObject();
  }
  return settings;
};

export const updateSettings = async (instituteId, { smtp, enabled }) => {
  const update = {};
  if (smtp) {
    const fields = ['host', 'port', 'secure', 'user', 'pass', 'fromEmail', 'fromName'];
    fields.forEach((f) => { if (smtp[f] !== undefined) update[`smtp.${f}`] = smtp[f]; });
  }
  if (enabled) {
    const types = ['feePayment', 'resultsPublished', 'announcement', 'assignmentPosted', 'attendanceAlert'];
    types.forEach((t) => { if (enabled[t] !== undefined) update[`enabled.${t}`] = enabled[t]; });
  }
  return repo.findOneAndUpdate(instituteId, update);
};

export const sendTestEmail = async (instituteId, testEmail, userId) => {
  if (!testEmail) throw new AppError('testEmail is required', 400);

  const settings = await repo.findByInstitute(instituteId);
  if (!settings?.smtp?.host) {
    throw new AppError('SMTP is not configured yet. Save your SMTP settings first.', 400);
  }

  const institute = await Institute.findById(instituteId).select('name').lean();
  const instituteName = institute?.name ?? 'Institution';

  let status = 'sent';
  let errorMsg = null;

  try {
    await sendTestEmailDirect({ instituteName, toEmail: testEmail });
  } catch (err) {
    status = 'failed';
    errorMsg = err?.message ?? String(err);
  }

  await repo.createEmailLog({
    institute: instituteId,
    recipientUser: userId,
    recipientEmail: testEmail,
    type: 'test',
    subject: `Test Email — ${instituteName}`,
    status,
    error: errorMsg,
    sentAt: new Date(),
  });

  if (status === 'failed') throw new AppError(`Failed to send test email: ${errorMsg}`, 502);

  return testEmail;
};

export const getEmailLogs = async (instituteId, pageParam) => {
  const page = Math.max(1, parseInt(pageParam) || 1);
  const limit = 10;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    repo.findEmailLogs(instituteId, skip, limit),
    repo.countEmailLogs(instituteId),
  ]);

  return { logs, total, page, pages: Math.ceil(total / limit) };
};
