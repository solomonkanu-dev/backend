import Notification from '../models/Notification.js';
import { getIO } from '../socket.js';
import { sendExpoPushToUser, sendExpoPushes } from './expoPush.js';
import User from '../models/user.js';

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

    // Native OS push (fire-and-forget; resilient to offline devices)
    sendExpoPushToUser(recipientId, {
      title: title || 'EduSalone',
      body: message || '',
      data: { type, notificationId: String(notification._id), ...(relatedEntity || {}) },
    }).catch(() => {});
  } catch (_) {
    // fire-and-forget, never throws
  }
};

export const notifySuperAdmins = async ({ type, title, message, relatedEntity }) => {
  try {
    const { default: User } = await import('../models/user.js');
    const superAdmins = await User.find({ role: 'super_admin' }, '_id expoPushTokens');

    const allTokens = [];
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
        if (Array.isArray(sa.expoPushTokens)) allTokens.push(...sa.expoPushTokens);
      })
    );

    if (allTokens.length > 0) {
      sendExpoPushes(allTokens, {
        title: title || 'EduSalone',
        body: message || '',
        data: { type, ...(relatedEntity || {}) },
      }).catch(() => {});
    }
  } catch (_) {}
};

/**
 * Fanout helper: create one Notification per recipient, emit `new_notification`
 * per user room, and send a single batched Expo push to all collected tokens.
 * Best-effort; never throws.
 */
export const notifyMany = async ({
  recipientIds,
  instituteId,
  type,
  title,
  message,
  relatedEntity,
  pushChannelId,
}) => {
  try {
    const uniqueIds = [...new Set((recipientIds || []).map(String))].filter(Boolean);
    if (uniqueIds.length === 0) return;

    const docs = uniqueIds.map((rid) => ({
      recipient: rid,
      institute: instituteId || null,
      type,
      title,
      message,
      relatedEntity: relatedEntity || {},
    }));

    const notifications = await Notification.insertMany(docs, { ordered: false });

    const io = getIO();
    if (io) {
      notifications.forEach((n) => {
        io.to(`user:${n.recipient}`).emit('new_notification', n);
      });
    }

    const users = await User.find(
      { _id: { $in: uniqueIds } },
      'expoPushTokens role'
    ).lean();
    const tokens = users.flatMap((u) => u.expoPushTokens || []);
    const usersByRoleWithTokens = users.reduce((acc, u) => {
      const has = (u.expoPushTokens || []).length;
      if (!has) return acc;
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});
    const usersByRoleWithoutTokens = users.reduce((acc, u) => {
      const has = (u.expoPushTokens || []).length;
      if (has) return acc;
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});
    console.log(
      `[notifyMany] type=${type} recipients=${uniqueIds.length} ` +
        `withTokens=${JSON.stringify(usersByRoleWithTokens)} ` +
        `withoutTokens=${JSON.stringify(usersByRoleWithoutTokens)}`
    );
    if (tokens.length === 0) return;

    sendExpoPushes(tokens, {
      title: title || 'EduSalone',
      body: message || '',
      channelId: pushChannelId,
      data: { type, ...(relatedEntity || {}) },
    }).catch(() => {});
  } catch (_) {
    // fire-and-forget
  }
};
