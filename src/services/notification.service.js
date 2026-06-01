import * as repo from '../repositories/notification.repository.js';
import { AppError } from '../errors/AppError.js';
import { getIO } from '../socket.js';
import User from '../models/user.js';
import { isExpoPushToken } from '../utils/expoPush.js';

export const getMyNotifications = async (userId, query) => {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = { recipient: userId };
  if (query.unread === 'true') filter.isRead = false;

  const [data, total] = await Promise.all([
    repo.findPaginated(filter, skip, limit),
    repo.countDocuments(filter),
  ]);

  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getUnreadCount = (userId) =>
  repo.countDocuments({ recipient: userId, isRead: false });

export const markNotificationRead = async (id, userId) => {
  const notification = await repo.findById(id);
  if (!notification) throw new AppError('Notification not found', 404);
  if (notification.recipient.toString() !== userId.toString()) throw new AppError('Access denied', 403);

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  // Push to other open tabs / devices of the same user
  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit('notification_read', { _id: id });
  }
};

export const markAllRead = async (userId) => {
  await repo.updateManyRead(userId);

  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit('notifications_all_read');
  }
};

export const deleteNotification = async (id, userId) => {
  const notification = await repo.findById(id);
  if (!notification) throw new AppError('Notification not found', 404);
  if (notification.recipient.toString() !== userId.toString()) throw new AppError('Access denied', 403);

  await notification.deleteOne();

  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit('notification_deleted', { _id: id });
  }
};

export const registerPushToken = async (userId, token) => {
  if (!token || typeof token !== 'string') {
    throw new AppError('token is required', 400);
  }
  if (!isExpoPushToken(token)) {
    throw new AppError('Invalid Expo push token', 400);
  }
  // A device's Expo push token is stable per install. If someone else was
  // logged in before, their record still has this token and they would keep
  // receiving pushes that belong to the new user. Detach the token from every
  // other user first, then attach it to the current user.
  await User.updateMany(
    { _id: { $ne: userId }, expoPushTokens: token },
    { $pull: { expoPushTokens: token } }
  );
  await User.updateOne(
    { _id: userId },
    { $addToSet: { expoPushTokens: token } }
  );
  return { token };
};

export const unregisterPushToken = async (userId, token) => {
  if (!token || typeof token !== 'string') {
    throw new AppError('token is required', 400);
  }
  await User.updateOne(
    { _id: userId },
    { $pull: { expoPushTokens: token } }
  );
  return { token };
};

const maskToken = (t) => {
  if (typeof t !== 'string' || t.length < 12) return t;
  const head = t.slice(0, 18);
  const tail = t.slice(-6);
  return `${head}…${tail}`;
};

/**
 * Returns push-delivery diagnostic info for the calling user. Lets the mobile
 * app (or curl) confirm whether their device's token actually reached the
 * server before reporting that a notification "didn't arrive".
 */
export const getPushDiagnostic = async (user) => {
  const fresh = await User.findById(user._id).select('expoPushTokens role fullName email').lean();
  const tokens = fresh?.expoPushTokens ?? [];

  // Look up other users that share any of our tokens (should always be empty
  // after the dedupe fix; surfacing this helps spot stale duplicates).
  const collidingUsers = tokens.length > 0
    ? await User.find(
        { _id: { $ne: user._id }, expoPushTokens: { $in: tokens } },
        '_id fullName role'
      ).lean()
    : [];

  return {
    userId: String(user._id),
    role: fresh?.role,
    fullName: fresh?.fullName,
    email: fresh?.email,
    tokenCount: tokens.length,
    tokens: tokens.map(maskToken),
    collidingUsers: collidingUsers.map((u) => ({
      id: String(u._id),
      fullName: u.fullName,
      role: u.role,
    })),
  };
};

/**
 * Sends a test Expo push to the calling user's own tokens. Useful to verify
 * end-to-end delivery without triggering a real workflow event.
 */
export const sendTestPush = async (user) => {
  const fresh = await User.findById(user._id).select('expoPushTokens').lean();
  const tokens = fresh?.expoPushTokens ?? [];
  if (tokens.length === 0) {
    return { sent: 0, message: 'No push tokens registered for this account.' };
  }

  const { sendExpoPushes } = await import('../utils/expoPush.js');
  const tickets = await sendExpoPushes(tokens, {
    title: 'EduSalone test push',
    body: 'If you can read this, your device is receiving notifications correctly.',
    data: { type: 'test_push' },
  });

  const ok = tickets.filter((t) => t?.status === 'ok').length;
  const errors = tickets.filter((t) => t?.status === 'error');
  return {
    sent: tickets.length,
    ok,
    errors: errors.map((t) => t?.details?.error || t?.message || 'Unknown'),
  };
};
