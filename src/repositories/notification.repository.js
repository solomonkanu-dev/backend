import Notification from '../models/Notification.js';

export const findPaginated = (filter, skip, limit) =>
  Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);

export const countDocuments = (filter) => Notification.countDocuments(filter);

export const findById = (id) => Notification.findById(id);

export const updateManyRead = (recipientId) =>
  Notification.updateMany({ recipient: recipientId, isRead: false }, { isRead: true, readAt: new Date() });
