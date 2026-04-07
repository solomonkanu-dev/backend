import * as repo from '../repositories/notification.repository.js';
import { AppError } from '../errors/AppError.js';

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
};

export const markAllRead = (userId) => repo.updateManyRead(userId);

export const deleteNotification = async (id, userId) => {
  const notification = await repo.findById(id);
  if (!notification) throw new AppError('Notification not found', 404);
  if (notification.recipient.toString() !== userId.toString()) throw new AppError('Access denied', 403);

  await notification.deleteOne();
};
