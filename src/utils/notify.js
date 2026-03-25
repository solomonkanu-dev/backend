import Notification from '../models/Notification.js';

export const notify = async ({ recipientId, instituteId, type, title, message, relatedEntity }) => {
  try {
    await Notification.create({
      recipient: recipientId,
      institute: instituteId || null,
      type,
      title,
      message,
      relatedEntity: relatedEntity || {},
    });
  } catch (_) {
    // fire-and-forget, never throws
  }
};

export const notifySuperAdmins = async ({ type, title, message, relatedEntity }) => {
  try {
    const { default: User } = await import('../models/user.js');
    const superAdmins = await User.find({ role: 'super_admin' }, '_id');
    await Promise.all(
      superAdmins.map((sa) =>
        Notification.create({
          recipient: sa._id,
          institute: null,
          type,
          title,
          message,
          relatedEntity: relatedEntity || {},
        })
      )
    );
  } catch (_) {}
};
