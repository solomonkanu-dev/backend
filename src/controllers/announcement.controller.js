import Announcement from '../models/Announcement.js';
import { logAudit } from '../utils/audit.js';

const isDev = process.env.NODE_ENV === 'development';

export const createAnnouncement = async (req, res) => {
  try {
    const { title, body, type, targetRoles, institute, expiresAt } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'title and body are required' });
    }

    if (type === 'institute_specific' && !institute) {
      return res.status(400).json({ success: false, message: 'institute is required for institute_specific announcements' });
    }

    const announcement = await Announcement.create({
      title,
      body,
      type: type || 'system_wide',
      targetRoles: targetRoles || ['admin', 'lecturer', 'student'],
      institute: type === 'institute_specific' ? institute : null,
      createdBy: req.user._id,
      expiresAt: expiresAt || null,
    });

    logAudit(req, { action: 'CREATE_ANNOUNCEMENT', entity: 'Announcement', entityId: announcement._id, description: `Created announcement: ${title}`, statusCode: 201 });

    res.status(201).json({ success: true, message: 'Announcement created successfully', data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const getAnnouncements = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip  = (page - 1) * limit;

    const now = new Date();

    const filter = {
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      targetRoles: req.user.role,
    };

    if (req.user.role !== 'super_admin') {
      const instituteId = req.user.institute?._id || req.user.institute;
      filter.$and = [
        {
          $or: [
            { type: 'system_wide' },
            { type: 'institute_specific', institute: instituteId },
          ],
        },
      ];
    }

    const [announcements, total] = await Promise.all([
      Announcement.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Announcement.countDocuments(filter),
    ]);

    const userId = req.user._id.toString();
    const data = announcements.map((a) => ({
      ...a,
      isRead: a.readBy.some((r) => r.user?.toString() === userId),
    }));

    res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const alreadyRead = announcement.readBy.some(
      (r) => r.user?.toString() === req.user._id.toString()
    );

    if (!alreadyRead) {
      announcement.readBy.push({ user: req.user._id, readAt: new Date() });
      await announcement.save();
    }

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, isActive, expiresAt } = req.body;

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      {
        ...(title     !== undefined && { title }),
        ...(body      !== undefined && { body }),
        ...(isActive  !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt }),
      },
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    logAudit(req, { action: 'UPDATE_ANNOUNCEMENT', entity: 'Announcement', entityId: announcement._id, description: `Updated announcement: ${announcement.title}`, statusCode: 200 });

    res.json({ success: true, message: 'Announcement updated', data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    logAudit(req, { action: 'DELETE_ANNOUNCEMENT', entity: 'Announcement', entityId: id, description: `Deleted announcement: ${announcement.title}`, statusCode: 200 });

    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const getAnnouncementReadStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id)
      .populate('readBy.user', 'fullName email role');

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.json({
      success: true,
      data: {
        total: announcement.readBy.length,
        readBy: announcement.readBy,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};
