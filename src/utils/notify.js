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

/**
 * Persist a Notification document. If validation fails (e.g. unknown `type`
 * not in the enum), log and return null so callers can still emit the push.
 * Never throws.
 */
const persistOne = async (doc) => {
  try {
    return await Notification.create(doc);
  } catch (err) {
    console.warn(
      `[notify] persist failed type=${doc.type} recipient=${doc.recipient}: ${err?.message ?? err}`
    );
    return null;
  }
};

export const notify = async ({ recipientId, instituteId, type, title, message, relatedEntity }) => {
  const notification = await persistOne({
    recipient: recipientId,
    institute: instituteId || null,
    type,
    title,
    message,
    relatedEntity: relatedEntity || {},
  });

  // Always emit the socket event and push, even if persistence failed (the
  // user may still be online watching the bell, and the OS banner shouldn't
  // be blocked by a schema mismatch).
  if (notification) push(recipientId, notification);

  sendExpoPushToUser(recipientId, {
    title: title || 'EduSalone',
    body: message || '',
    data: {
      type,
      ...(notification ? { notificationId: String(notification._id) } : {}),
      ...(relatedEntity || {}),
    },
  }).catch(() => {});
};

export const notifySuperAdmins = async ({ type, title, message, relatedEntity }) => {
  try {
    const superAdmins = await User.find({ role: 'super_admin' }, '_id expoPushTokens');

    const allTokens = [];
    await Promise.all(
      superAdmins.map(async (sa) => {
        const notification = await persistOne({
          recipient: sa._id,
          institute: null,
          type,
          title,
          message,
          relatedEntity: relatedEntity || {},
        });
        if (notification) push(sa._id, notification);
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
  } catch (err) {
    console.warn('[notifySuperAdmins] failed:', err?.message ?? err);
  }
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

    let notifications = [];
    try {
      notifications = await Notification.insertMany(docs, { ordered: false });
    } catch (err) {
      // With `ordered: false`, valid docs still land; the error may surface the
      // failed-doc count via `err.insertedDocs` (mongoose) or
      // `err.result.insertedIds` (driver). Capture whatever's there.
      notifications = err?.insertedDocs ?? [];
      console.warn(
        `[notifyMany] insert had failures type=${type} ` +
          `attempted=${docs.length} inserted=${notifications.length} ` +
          `err=${err?.message ?? err}`
      );
    }

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
        `persisted=${notifications.length} ` +
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
  } catch (err) {
    console.warn('[notifyMany] failed:', err?.message ?? err);
  }
};
