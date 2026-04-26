import { AppError } from '../errors/AppError.js';
import * as announcementRepo from '../repositories/announcement.repository.js';
import { logAudit } from '../utils/audit.js';
import { sendEmailNotification } from '../utils/email.js';
import { sendSmsNotification } from '../utils/sms.js';

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
      .select('_id email fullName emailOptOut studentProfile lecturerProfile')
      .limit(100)
      .lean();

    const notifData = { title: announcement.title, body: announcement.body };

    await Promise.allSettled(
      recipients.flatMap((u) => {
        const phone = u.studentProfile?.mobileNumber ?? u.lecturerProfile?.phoneNumber;
        const meta = { instituteId, type: 'announcement', recipientId: u._id, instituteName, data: notifData };
        return [
          sendEmailNotification({ ...meta, recipientEmail: u.email }),
          sendSmsNotification({ ...meta, recipientPhone: phone }),
        ];
      })
    );
  } catch {
    // fire-and-forget — never throws
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const createAnnouncement = async (body, req) => {
  const { user } = req;
  const { title, body: announcementBody, targetRoles, expiresAt } = body;
  let { type, institute } = body;

  if (!title || !announcementBody) {
    throw new AppError('title and body are required', 400);
  }

  // Admins can only create institute-specific announcements for their own institute
  if (user.role === 'admin') {
    type = 'institute_specific';
    institute = user.institute?._id || user.institute;
    if (!institute) throw new AppError('Admin account has no associated institute', 400);
  } else {
    if (type === 'institute_specific' && !institute) {
      throw new AppError('institute is required for institute_specific announcements', 400);
    }
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
  const { user } = req;
  const { title, body: announcementBody, isActive, expiresAt } = body;

  const existing = await announcementRepo.findById(id);
  if (!existing) throw new AppError('Announcement not found', 404);

  // Admins can only edit announcements they created for their own institute
  if (user.role === 'admin') {
    const adminInstituteId = String(user.institute?._id || user.institute);
    const announcementInstituteId = String(existing.institute ?? '');
    if (String(existing.createdBy) !== String(user._id) || announcementInstituteId !== adminInstituteId) {
      throw new AppError('You can only edit announcements you created for your institute', 403);
    }
  }
  const beforeAnnouncement = { title: existing.title, body: existing.body, isActive: existing.isActive, expiresAt: existing.expiresAt ?? null };

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
    description: `Updated announcement: ${beforeAnnouncement.title}`,
    before: beforeAnnouncement,
    after: { title: announcement.title, body: announcement.body, isActive: announcement.isActive, expiresAt: announcement.expiresAt ?? null },
    statusCode: 200,
  });

  return announcement;
};

export const deleteAnnouncement = async (id, req) => {
  const { user } = req;

  // Admins can only delete announcements they created for their own institute
  if (user.role === 'admin') {
    const existing = await announcementRepo.findById(id);
    if (!existing) throw new AppError('Announcement not found', 404);
    const adminInstituteId = String(user.institute?._id || user.institute);
    const announcementInstituteId = String(existing.institute ?? '');
    if (String(existing.createdBy) !== String(user._id) || announcementInstituteId !== adminInstituteId) {
      throw new AppError('You can only delete announcements you created for your institute', 403);
    }
  }

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

export const getAnnouncementReadStatus = async (id, user) => {
  const announcement = await announcementRepo.findByIdWithReadBy(id);
  if (!announcement) throw new AppError('Announcement not found', 404);

  // Admins can only view read status for announcements they created
  if (user.role === 'admin' && String(announcement.createdBy) !== String(user._id)) {
    throw new AppError('You can only view read status for announcements you created', 403);
  }

  return { total: announcement.readBy.length, readBy: announcement.readBy };
};
