import { randomBytes } from 'crypto';
import User from '../models/user.js';
import * as repo from '../repositories/admin.repository.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/audit.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const bulkImportParents = async (parents, req) => {
  if (!Array.isArray(parents) || parents.length === 0)
    throw new AppError('parents array is required', 400);
  if (parents.length > 1000)
    throw new AppError('Maximum 1000 parents per import', 400);

  const user = req.user;
  if (user.role !== 'admin') throw new AppError('Admin access only', 403);
  const instituteId = user.institute?._id || user.institute;
  if (!instituteId) throw new AppError('Institute required', 400);

  // Batch-check which emails already exist in DB
  const incomingEmails = parents.map((p) => (p.email || '').toLowerCase().trim()).filter(Boolean);
  const existingUsers = await User.find({ email: { $in: incomingEmails } }).select('email').lean();
  const existingEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));

  // Gather all referenced student emails across all rows for a single DB lookup
  const allStudentEmails = [];
  for (const p of parents) {
    const emails = parseStudentEmails(p.linkedStudentEmails || '');
    allStudentEmails.push(...emails);
  }
  const uniqueStudentEmails = [...new Set(allStudentEmails)];
  const foundStudents = uniqueStudentEmails.length > 0
    ? await User.find({ email: { $in: uniqueStudentEmails }, institute: instituteId, role: 'student' })
        .select('_id email').lean()
    : [];
  const studentEmailToId = new Map(foundStudents.map((s) => [s.email.toLowerCase(), s._id.toString()]));

  const added = [];
  const failed = [];
  const duplicates = [];
  const seenEmails = new Set();

  for (let i = 0; i < parents.length; i++) {
    const row = i + 1;
    const p = parents[i];
    const fullName = (p.fullName || '').trim();
    const email = (p.email || '').toLowerCase().trim();

    if (!fullName || !email) {
      failed.push({ row, fullName: fullName || '(blank)', email: email || '(blank)', reason: 'Missing required fields (Full Name, Email)' });
      continue;
    }
    if (!EMAIL_RE.test(email)) {
      failed.push({ row, fullName, email, reason: 'Invalid email address' });
      continue;
    }

    if (existingEmailSet.has(email) || seenEmails.has(email)) {
      duplicates.push({ row, fullName, email });
      continue;
    }

    seenEmails.add(email);

    // Resolve linked student emails → IDs
    const requestedEmails = parseStudentEmails(p.linkedStudentEmails || '');
    const linkedStudents = requestedEmails
      .map((e) => studentEmailToId.get(e.toLowerCase()))
      .filter(Boolean);

    const tempPassword = randomBytes(12).toString('base64url');

    try {
      await repo.createUser({
        fullName,
        email,
        password: tempPassword,
        role: 'parent',
        institute: instituteId,
        approved: true,
        isActive: true,
        linkedStudents,
        ...(p.phoneNumber ? { phoneNumber: p.phoneNumber } : {}),
      });

      added.push({ row, fullName, email, tempPassword });
    } catch (err) {
      if (err.code === 11000) {
        duplicates.push({ row, fullName, email });
      } else {
        failed.push({ row, fullName, email, reason: err.message || 'Unknown error' });
      }
    }
  }

  logAudit(req, {
    action: 'BULK_IMPORT_PARENTS',
    entity: 'User',
    entityId: null,
    description: `Bulk import: ${added.length} parents added, ${failed.length} failed, ${duplicates.length} duplicates`,
    after: { total: parents.length, added: added.length, failed: failed.length, duplicates: duplicates.length },
    statusCode: 200,
  });

  return {
    summary: {
      total: parents.length,
      added: added.length,
      failed: failed.length,
      duplicates: duplicates.length,
    },
    added,
    failed,
    duplicates,
  };
};

function parseStudentEmails(raw) {
  return raw
    .split(/[,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => EMAIL_RE.test(e));
}
