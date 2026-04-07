import { AppError } from '../errors/AppError.js';
import * as announcementRepo from '../repositories/announcement.repository.js';
import { logAudit } from '../utils/audit.js';
import { sendEmailNotification } from '../utils/email.js';

// ─── Private: fire-and-forget email to targeted users ────────────────────────

async function notifyAnnouncementByEmail(announcement, requestingUser) {
  try {
    const { default: User } = await import('../models/user.js');
    const { default: Institute } = await import('../models/Institute.js');

    const instituteId =
      announcement.type === 'institute_specific'
        ? announcement.institute
        : requestingUser.institute?._id || requestingUser.institute;

    if (!instituteId) return;

    const institute = await Institute.findById(instituteId).select('name').lean();
    const instituteName = institute?.name ?? 'Institution';

    const userFilter = {
      institute: instituteId,
      role: { $in: announcement.targetRoles ?? ['admin', 'lecturer', 'student'] },
      isActive: true,
    };

    const recipients = await User.find(userFilter)
      .select('_id email fullName emailOptOut')
      .limit(100)
      .lean();

    await Promise.allSettled(
      recipients.map((u) =>
        sendEmailNotification({
          instituteId,
          type: 'announcement',
          recipientId: u._id,
          recipientEmail: u.email,
          instituteName,
          data: { title: announcement.title, body: announcement.body },
        })
      )
    );
  } catch {
    // fire-and-forget — never throws
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const createAnnouncement = async (body, req) => {
  const { user } = req;
  const { title, body: announcementBody, type, targetRoles, institute, expiresAt } = body;

  if (!title || !announcementBody) {
    throw new AppError('title and body are required', 400);
  }

  if (type === 'institute_specific' && !institute) {
    throw new AppError('institute is required for institute_specific announcements', 400);
  }

  const announcement = await announcementRepo.create({
    title,
    body: announcementBody,
    type: type || 'system_wide',
    targetRoles: targetRoles || ['admin', 'lecturer', 'student'],
    institute: type === 'institute_specific' ? institute : null,
    createdBy: user._id,
    expiresAt: expiresAt || null,
  });

  logAudit(req, {
    action: 'CREATE_ANNOUNCEMENT',
    entity: 'Announcement',
    entityId: announcement._id,
    description: `Created announcement: ${title}`,
    statusCode: 201,
  });

  // Fire-and-forget
  notifyAnnouncementByEmail(announcement, user).catch(() => {});

  return announcement;
};

export const getAnnouncements = async (query, user) => {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const now = new Date();

  const filter = {
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    targetRoles: user.role,
  };

  if (user.role !== 'super_admin') {
    const instituteId = user.institute?._id || user.institute;
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
    announcementRepo.findPaginated(filter, skip, limit),
    announcementRepo.countDocuments(filter),
  ]);

  const userId = user._id.toString();
  const data = announcements.map((a) => ({
    ...a,
    isRead: a.readBy.some((r) => r.user?.toString() === userId),
  }));

  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const markAsRead = async (id, user) => {
  const announcement = await announcementRepo.findById(id);
  if (!announcement) throw new AppError('Announcement not found', 404);

  const alreadyRead = announcement.readBy.some(
    (r) => r.user?.toString() === user._id.toString()
  );

  if (!alreadyRead) {
    announcement.readBy.push({ user: user._id, readAt: new Date() });
    await announcementRepo.save(announcement);
  }
};

export const updateAnnouncement = async (id, body, req) => {
  const { title, body: announcementBody, isActive, expiresAt } = body;

  const announcement = await announcementRepo.findByIdAndUpdate(id, {
    ...(title !== undefined && { title }),
    ...(announcementBody !== undefined && { body: announcementBody }),
    ...(isActive !== undefined && { isActive }),
    ...(expiresAt !== undefined && { expiresAt }),
  });

  if (!announcement) throw new AppError('Announcement not found', 404);

  logAudit(req, {
    action: 'UPDATE_ANNOUNCEMENT',
    entity: 'Announcement',
    entityId: announcement._id,
    description: `Updated announcement: ${announcement.title}`,
    statusCode: 200,
  });

  return announcement;
};

export const deleteAnnouncement = async (id, req) => {
  const announcement = await announcementRepo.findByIdAndDelete(id);
  if (!announcement) throw new AppError('Announcement not found', 404);

  logAudit(req, {
    action: 'DELETE_ANNOUNCEMENT',
    entity: 'Announcement',
    entityId: id,
    description: `Deleted announcement: ${announcement.title}`,
    statusCode: 200,
  });
};

export const getAnnouncementReadStatus = async (id) => {
  const announcement = await announcementRepo.findByIdWithReadBy(id);
  if (!announcement) throw new AppError('Announcement not found', 404);

  return { total: announcement.readBy.length, readBy: announcement.readBy };
};
