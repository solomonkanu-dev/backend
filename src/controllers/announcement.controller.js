import * as announcementService from '../services/announcement.service.js';

export const createAnnouncement = async (req, res, next) => {
  try {
    const data = await announcementService.createAnnouncement(req.body, req);
    res.status(201).json({ success: true, message: 'Announcement created successfully', data });
  } catch (err) {
    next(err);
  }
};

export const getAnnouncements = async (req, res, next) => {
  try {
    const result = await announcementService.getAnnouncements(req.query, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    await announcementService.markAsRead(req.params.id, req.user);
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
};

export const updateAnnouncement = async (req, res, next) => {
  try {
    const data = await announcementService.updateAnnouncement(req.params.id, req.body, req);
    res.json({ success: true, message: 'Announcement updated', data });
  } catch (err) {
    next(err);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    await announcementService.deleteAnnouncement(req.params.id, req);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
};

export const getAnnouncementReadStatus = async (req, res, next) => {
  try {
    const data = await announcementService.getAnnouncementReadStatus(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
