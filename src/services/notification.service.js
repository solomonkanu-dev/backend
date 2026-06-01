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
