import Notification from '../models/Notification.js';
import { getIO } from '../socket.js';

const push = (recipientId, notification) => {
  const io = getIO();
  if (io) {
    io.to(`user:${recipientId}`).emit('new_notification', notification);
  }
};

export const notify = async ({ recipientId, instituteId, type, title, message, relatedEntity }) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      institute: instituteId || null,
      type,
      title,
      message,
      relatedEntity: relatedEntity || {},
    });

    push(recipientId, notification);
  } catch (_) {
    // fire-and-forget, never throws
  }
};

export const notifySuperAdmins = async ({ type, title, message, relatedEntity }) => {
  try {
    const { default: User } = await import('../models/user.js');
    const superAdmins = await User.find({ role: 'super_admin' }, '_id');

    await Promise.all(
      superAdmins.map(async (sa) => {
        const notification = await Notification.create({
          recipient: sa._id,
          institute: null,
          type,
          title,
          message,
          relatedEntity: relatedEntity || {},
        });

        push(sa._id, notification);
      })
    );
  } catch (_) {}
};
