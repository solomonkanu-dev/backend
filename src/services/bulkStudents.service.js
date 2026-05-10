import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/user.js';
import Class from '../models/Class.js';
import Plan from '../models/Plan.js';
import Institute from '../models/Institute.js';
import * as repo from '../repositories/admin.repository.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/audit.js';
import { cacheGet } from '../utils/cache.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getPlanRemaining = async (instituteId) => {
  const cacheKey = `institute:plan:${instituteId}`;
  let limits = await cacheGet(cacheKey);
  if (!limits) {
    const institute = await Institute.findById(instituteId).populate('plan');
    let plan = institute?.plan;
    if (!plan) plan = await Plan.findOne({ name: 'free' });
    limits = plan?.limits ?? null;
  }
  if (!limits) return Infinity;
  const current = await User.countDocuments({ institute: instituteId, role: 'student' });
  return Math.max(0, (limits.maxStudents ?? Infinity) - current);
};

export const bulkImportStudents = async (students, req) => {
  if (!Array.isArray(students) || students.length === 0)
    throw new AppError('students array is required', 400);
  if (students.length > 1000)
    throw new AppError('Maximum 1000 students per import', 400);

  const user = req.user;
  if (user.role !== 'admin') throw new AppError('Admin access only', 403);
  const instituteId = user.institute?._id || user.institute;
  if (!instituteId) throw new AppError('Institute required', 400);

  const remaining = await getPlanRemaining(instituteId);

  // Pre-load all institute classes for fast ID lookup by name
  const allClasses = await Class.find({ institute: instituteId }).select('_id name').lean();
  const classNameMap = new Map(allClasses.map((c) => [c.name.toLowerCase().trim(), c._id.toString()]));
  const classIdSet = new Set(allClasses.map((c) => c._id.toString()));

  // Batch-check which emails already exist in DB
  const incomingEmails = students.map((s) => (s.email || '').toLowerCase().trim()).filter(Boolean);
  const existingUsers = await User.find({ email: { $in: incomingEmails } }).select('email').lean();
  const existingEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));

  const added = [];
  const failed = [];
  const duplicates = [];
  const seenEmails = new Set();
  let slotsUsed = 0;

  for (let i = 0; i < students.length; i++) {
    const row = i + 1;
    const s = students[i];
    const fullName = (s.fullName || '').trim();
    const email = (s.email || '').toLowerCase().trim();

    // Required field validation
    if (!fullName || !email) {
      failed.push({ row, fullName: fullName || '(blank)', email: email || '(blank)', reason: 'Missing required fields (Full Name, Email)' });
      continue;
    }
    if (!EMAIL_RE.test(email)) {
      failed.push({ row, fullName, email, reason: 'Invalid email address' });
      continue;
    }

    // Resolve classId — accept either a Mongo ID directly or a class name
    let classId = null;
    const rawClass = (s.classId || s.className || '').toString().trim();
    if (classIdSet.has(rawClass)) {
      classId = rawClass;
    } else if (rawClass) {
      classId = classNameMap.get(rawClass.toLowerCase()) ?? null;
    }
    if (!classId) {
      failed.push({ row, fullName, email, reason: `Class not found: "${rawClass || '(none)'}"` });
      continue;
    }

    // Duplicate detection
    if (existingEmailSet.has(email) || seenEmails.has(email)) {
      duplicates.push({ row, fullName, email });
      continue;
    }

    // Plan limit
    if (slotsUsed >= remaining) {
      failed.push({ row, fullName, email, reason: 'Plan limit reached' });
      continue;
    }

    seenEmails.add(email);

    // Build studentProfile
    const studentProfile = {};
    if (s.registrationNumber) studentProfile.registrationNumber = s.registrationNumber;
    if (s.dateOfAdmission) studentProfile.dateOfAdmission = s.dateOfAdmission;
    if (s.dateOfBirth) studentProfile.dateOfBirth = s.dateOfBirth;
    if (s.gender) studentProfile.gender = s.gender;
    if (s.mobileNumber) studentProfile.mobileNumber = s.mobileNumber;
    if (s.address) studentProfile.address = s.address;
    if (s.bloodGroup) studentProfile.bloodGroup = s.bloodGroup;
    if (s.religion) studentProfile.religion = s.religion;
    if (s.orphanStatus) studentProfile.orphanStatus = s.orphanStatus;
    if (s.previousSchool) studentProfile.previousSchool = s.previousSchool;
    if (s.familyType) studentProfile.familyType = s.familyType;
    if (s.medicalInfo) studentProfile.medicalInfo = s.medicalInfo;
    if (s.guardianName || s.guardianPhone || s.guardianEmail || s.guardianAddress || s.guardianRelationship || s.guardianOccupation) {
      studentProfile.guardian = {
        ...(s.guardianName ? { guardianName: s.guardianName } : {}),
        ...(s.guardianPhone ? { guardianPhone: s.guardianPhone } : {}),
        ...(s.guardianEmail ? { guardianEmail: s.guardianEmail } : {}),
        ...(s.guardianAddress ? { guardianAddress: s.guardianAddress } : {}),
        ...(s.guardianRelationship ? { guardianRelationship: s.guardianRelationship } : {}),
        ...(s.guardianOccupation ? { guardianOccupation: s.guardianOccupation } : {}),
      };
    }

    const tempPassword = randomBytes(12).toString('base64url');

    try {
      const student = await repo.createUser({
        fullName,
        email,
        password: tempPassword,
        role: 'student',
        institute: instituteId,
        class: classId,
        approved: true,
        studentProfile,
        qrToken: uuidv4(),
        qrActive: true,
      });

      await repo.updateClassById(classId, { $addToSet: { students: student._id } });
      added.push({ row, fullName, email, tempPassword });
      slotsUsed++;
    } catch (err) {
      const isDup = err.code === 11000;
      if (isDup) {
        duplicates.push({ row, fullName, email });
      } else {
        failed.push({ row, fullName, email, reason: err.message || 'Unknown error' });
      }
    }
  }

  logAudit(req, {
    action: 'BULK_IMPORT_STUDENTS',
    entity: 'User',
    entityId: null,
    description: `Bulk import: ${added.length} added, ${failed.length} failed, ${duplicates.length} duplicates`,
    after: { total: students.length, added: added.length, failed: failed.length, duplicates: duplicates.length },
    statusCode: 200,
  });

  return {
    summary: {
      total: students.length,
      added: added.length,
      failed: failed.length,
      duplicates: duplicates.length,
    },
    added,
    failed,
    duplicates,
  };
};
