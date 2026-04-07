import Announcement from '../models/Announcement.js';

export const create = (data) => Announcement.create(data);

export const findPaginated = (filter, skip, limit) =>
  Announcement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

export const countDocuments = (filter) => Announcement.countDocuments(filter);

export const findById = (id) => Announcement.findById(id);

export const findByIdAndUpdate = (id, update) =>
  Announcement.findByIdAndUpdate(id, update, { new: true });

export const findByIdAndDelete = (id) => Announcement.findByIdAndDelete(id);

export const findByIdWithReadBy = (id) =>
  Announcement.findById(id).populate('readBy.user', 'fullName email role');

export const save = (doc) => doc.save();
