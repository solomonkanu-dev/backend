import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import * as repo from '../repositories/admin.repository.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/audit.js';
import { notify, notifySuperAdmins } from '../utils/notify.js';

// ─── Admin Signup ─────────────────────────────────────────────────────────────

export const requestAdminSignup = async ({ fullName, email, password }) => {
  const exists = await repo.findUserByEmail(email);
  if (exists) throw new AppError('Email already in use', 409);

  const newUser = await repo.createUser({
    fullName, email, password,
    role: 'admin',
    approved: false,
    institute: null,
    onboarding: { status: 'pending', submittedAt: new Date() },
  });

  notifySuperAdmins({
    type: 'new_admin_signup',
    title: 'New Admin Signup Request',
    message: `${fullName} (${email}) has requested admin access`,
    relatedEntity: { entityType: 'User', entityId: newUser._id },
  });
};

// ─── Student Management ───────────────────────────────────────────────────────

export const createStudent = async ({ fullName, email, classId, studentProfile }, req) => {
  const user = req.user;
  if (user.role !== 'admin') throw new AppError('Admin access only', 403);
  if (!user.institute) throw new AppError('Institute required', 400);

  const classDoc = await repo.findClassByIdAndInstitute(classId, user.institute);
  if (!classDoc) throw new AppError('Class not found', 404);

  const exists = await repo.findUserByEmail(email);
  if (exists) throw new AppError('Student already exists', 409);

  const tempPassword = randomBytes(12).toString('base64url');

  const student = await repo.createUser({
    fullName, email, password: tempPassword,
    role: 'student',
    institute: user.institute,
    class: classId,
    approved: true,
    studentProfile,
    qrToken: uuidv4(),
    qrActive: true,
  });

  await repo.updateClassById(classId, { $addToSet: { students: student._id } });

  logAudit(req, { action: 'CREATE_STUDENT', entity: 'User', entityId: student._id, description: `Created student ${fullName} (${email})`, statusCode: 201 });

  const instituteId = user.institute?._id || user.institute;
  notify({
    recipientId: user._id,
    instituteId,
    type: 'new_student_enrolled',
    title: 'New Student Enrolled',
    message: `${fullName} has been enrolled`,
    relatedEntity: { entityType: 'User', entityId: student._id },
  });

  return { student, tempPassword };
};

export const getAllStudents = async (query, user) => {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const filter = { role: 'student', institute: user.institute };
  const [data, total] = await Promise.all([
    repo.findStudentsPaginated(filter, skip, limit),
    repo.countUsers(filter),
  ]);
  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getStudentById = async (studentId, user) => {
  const instituteId = user.institute?._id ?? user.institute;
  const student = await repo.findUserOne({ _id: studentId, institute: instituteId, role: 'student' });
  if (!student) throw new AppError('Student not found', 404);
  return repo.findStudentById(studentId, instituteId);
};

export const getStudentAssignments = async (studentId, user) => {
  const instituteId = user.institute?._id || user.institute;
  const student = await repo.findUserOne({ _id: studentId, institute: instituteId });
  if (!student) throw new AppError('Student not found', 404);

  const classId = student.class?._id || student.class;
  const assignments = await repo.findPublishedAssignmentsByClass(classId, instituteId);
  const submissions = await repo.findSubmissions({
    student: studentId,
    assignment: { $in: assignments.map((a) => a._id) },
  });

  const submissionMap = {};
  submissions.forEach((s) => { submissionMap[String(s.assignment)] = s; });

  return assignments.map((a) => ({ assignment: a, submission: submissionMap[String(a._id)] ?? null }));
};

export const updateStudent = async (studentId, { fullName, email, classId, studentProfile }, req) => {
  const instituteId = req.user.institute?._id || req.user.institute;
  const student = await repo.findUserOne({ _id: studentId, institute: instituteId, role: 'student' });
  if (!student) throw new AppError('Student not found', 404);

  const beforeStudent = { fullName: student.fullName, email: student.email, class: student.class?.toString() ?? null };

  if (fullName) student.fullName = fullName;
  if (email && email !== student.email) {
    const exists = await repo.findUserForEmailCheck(email, studentId);
    if (exists) throw new AppError('Email already in use', 409);
    student.email = email;
  }
  if (classId) {
    const classDoc = await repo.findClassByIdAndInstitute(classId, instituteId);
    if (!classDoc) throw new AppError('Class not found', 404);
    student.class = classId;
  }
  if (studentProfile) {
    student.studentProfile = { ...(student.studentProfile?.toObject?.() ?? student.studentProfile ?? {}), ...studentProfile };
  }

  await student.save();
  const updated = await repo.findUserByIdSelect(studentId);

  logAudit(req, {
    action: 'UPDATE_STUDENT', entity: 'User', entityId: studentId,
    description: `Updated student ${student.fullName}`,
    before: beforeStudent,
    after: { fullName: student.fullName, email: student.email, class: student.class?.toString() ?? null },
    statusCode: 200,
  });
  return updated;
};

export const updateStudentLifecycle = async (studentId, { lifecycleStatus, lifecycleNote }, req) => {
  const validStatuses = ['active', 'graduated', 'transferred', 'withdrawn'];
  if (!validStatuses.includes(lifecycleStatus)) throw new AppError('Invalid lifecycle status', 400);

  const student = await repo.findUserOne({ _id: studentId, institute: req.user.institute, role: 'student' });
  if (!student) throw new AppError('Student not found', 404);

  const beforeLifecycle = { lifecycleStatus: student.lifecycleStatus, isActive: student.isActive };

  student.lifecycleStatus = lifecycleStatus;
  student.lifecycleNote = lifecycleNote ?? '';
  student.lifecycleUpdatedAt = new Date();
  student.isActive = lifecycleStatus === 'active';
  await student.save();

  logAudit(req, {
    action: 'UPDATE_LIFECYCLE', entity: 'User', entityId: student._id,
    description: `Lifecycle status updated to ${lifecycleStatus}`,
    before: beforeLifecycle,
    after: { lifecycleStatus, isActive: lifecycleStatus === 'active' },
    statusCode: 200,
  });
  return student;
};

// ─── Lecturer Management ──────────────────────────────────────────────────────

export const createLecturer = async ({ fullName, email, lecturerProfile }, req) => {
  const user = req.user;
  if (user.role !== 'admin') throw new AppError('Admin access only', 403);
  if (!user.institute) throw new AppError('Institute required', 400);
  if (!lecturerProfile) throw new AppError('Lecturer profile data is required', 400);

  const lecturer = await repo.createUser({
    fullName, email,
    password: randomBytes(12).toString('base64url'),
    role: 'lecturer',
    institute: user.institute,
    approved: true,
    lecturerProfile,
  });

  logAudit(req, { action: 'CREATE_LECTURER', entity: 'User', entityId: lecturer._id, description: `Created lecturer ${fullName} (${email})`, statusCode: 201 });
  return lecturer;
};

export const getAllLecturers = async (query, user) => {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const filter = { role: 'lecturer', institute: user.institute };
  const [data, total] = await Promise.all([
    repo.findUsersPaginated(filter, skip, limit),
    repo.countUsers(filter),
  ]);
  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getLecturerById = async (lecturerId, user) => {
  const instituteId = user.institute?._id || user.institute;
  const lecturer = await repo.findLecturerById(lecturerId, instituteId);
  if (!lecturer) throw new AppError('Lecturer not found', 404);
  return lecturer;
};

export const updateLecturerProfile = async (lecturerId, body, req) => {
  const instituteId = req.user.institute?._id || req.user.institute;
  const user = await repo.findUserOne({ _id: lecturerId, institute: instituteId, role: 'lecturer' });
  if (!user) throw new AppError('Lecturer not found', 404);
  const { employeeId, department, position, dateOfJoining, dateOfBirth, gender, maritalStatus, bloodGroup, phoneNumber, address } = body;
  const oldProfile = user.lecturerProfile?.toObject?.() ?? user.lecturerProfile ?? {};
  const profileKeys = Object.keys(body).filter(k => body[k] !== undefined);
  const beforeProfile = Object.fromEntries(profileKeys.map(k => [k, oldProfile[k] ?? null]));

  user.lecturerProfile = {
    ...oldProfile,
    ...(employeeId !== undefined && { employeeId }),
    ...(department !== undefined && { department }),
    ...(position !== undefined && { position }),
    ...(dateOfJoining !== undefined && { dateOfJoining }),
    ...(dateOfBirth !== undefined && { dateOfBirth }),
    ...(gender !== undefined && { gender }),
    ...(maritalStatus !== undefined && { maritalStatus }),
    ...(bloodGroup !== undefined && { bloodGroup }),
    ...(phoneNumber !== undefined && { phoneNumber }),
    ...(address !== undefined && { address }),
  };
  await user.save();
  logAudit(req, {
    action: 'UPDATE_LECTURER_PROFILE', entity: 'User', entityId: lecturerId,
    description: `Updated profile for lecturer ${user.fullName}`,
    before: beforeProfile,
    after: Object.fromEntries(profileKeys.map(k => [k, body[k]])),
    statusCode: 200,
  });
  return user;
};

export const updateLecturer = async (lecturerId, { fullName, email, lecturerProfile }, req) => {
  const instituteId = req.user.institute?._id || req.user.institute;
  const lecturer = await repo.findUserOne({ _id: lecturerId, institute: instituteId, role: 'lecturer' });
  if (!lecturer) throw new AppError('Lecturer not found', 404);

  const beforeLecturer = { fullName: lecturer.fullName, email: lecturer.email };

  if (fullName) lecturer.fullName = fullName;
  if (email && email !== lecturer.email) {
    const exists = await repo.findUserForEmailCheck(email, lecturerId);
    if (exists) throw new AppError('Email already in use', 409);
    lecturer.email = email;
  }
  if (lecturerProfile) {
    lecturer.lecturerProfile = { ...(lecturer.lecturerProfile?.toObject?.() ?? lecturer.lecturerProfile ?? {}), ...lecturerProfile };
  }

  await lecturer.save();
  const updated = await repo.findLecturerByIdFull(lecturerId);

  logAudit(req, {
    action: 'UPDATE_LECTURER', entity: 'User', entityId: lecturerId,
    description: `Updated lecturer ${lecturer.fullName}`,
    before: beforeLecturer,
    after: { fullName: lecturer.fullName, email: lecturer.email },
    statusCode: 200,
  });
  return updated;
};

// ─── General User Actions ─────────────────────────────────────────────────────

export const resetPassword = async (userId, password, req) => {
  const targetUser = await repo.findUserOne({ _id: userId });
  if (!targetUser) throw new AppError('User not found', 404);

  const hashedPassword = await bcrypt.hash(password, 12);
  await repo.updateUserById(userId, { password: hashedPassword });

  logAudit(req, {
    action: 'RESET_PASSWORD', entity: 'User', entityId: userId,
    description: `Reset password for user ${targetUser.fullName}`,
    after: { passwordReset: true },
    statusCode: 200,
  });
};

export const suspendUser = async (userId, req) => {
  const user = await repo.findUserOne({ _id: userId, role: { $in: ['student', 'lecturer'] }, institute: req.user.institute });
  if (!user) throw new AppError('User not found', 404);
  if (!user.isActive) throw new AppError('Account is already suspended', 400);

  user.isActive = false;
  await user.save();

  logAudit(req, { action: 'SUSPEND_USER', entity: 'User', entityId: user._id, description: `Suspended ${user.role} ${user.fullName} (${user.email})`, before: { isActive: true }, after: { isActive: false }, statusCode: 200 });
};

export const unsuspendUser = async (userId, req) => {
  const user = await repo.findUserOne({ _id: userId, role: { $in: ['student', 'lecturer'] }, institute: req.user.institute });
  if (!user) throw new AppError('User not found', 404);
  if (user.isActive) throw new AppError('Account is already active', 400);

  user.isActive = true;
  await user.save();

  logAudit(req, { action: 'UNSUSPEND_USER', entity: 'User', entityId: user._id, description: `Unsuspended ${user.role} ${user.fullName} (${user.email})`, before: { isActive: false }, after: { isActive: true }, statusCode: 200 });
};

export const deleteUser = async (userId, req) => {
  const user = await repo.findUserOne({ _id: userId, role: { $in: ['student', 'lecturer'] }, institute: req.user.institute });
  if (!user) throw new AppError('User not found', 404);

  await user.deleteOne();

  logAudit(req, { action: 'DELETE_USER', entity: 'User', entityId: user._id, description: `Deleted ${user.role} ${user.fullName} (${user.email})`, statusCode: 200 });
};

// ─── Institute ────────────────────────────────────────────────────────────────

export const createInstitute = async (body, req) => {
  const existing = await repo.findInstituteByAdmin(req.user.id);
  if (existing) throw new AppError('Admin already created an Institute', 400);

  const institute = await repo.createInstitute({ ...body, admin: req.user.id });
  await repo.updateUserById(req.user.id, { institute: institute._id });

  notifySuperAdmins({
    type: 'institute_created',
    title: 'New Institute Created',
    message: `Institute "${body.name}" has been created`,
    relatedEntity: { entityType: 'Institute', entityId: institute._id },
  });

  return institute;
};

export const getMyInstitute = async (userId) => {
  const institute = await repo.findInstituteByAdmin(userId);
  if (!institute) throw new AppError('Institute not found', 404);
  return institute;
};

export const updateInstitute = async (adminId, body) => {
  const institute = await repo.updateInstituteByAdmin(adminId, body);
  if (!institute) throw new AppError('Institute not found', 404);
  return institute;
};

// ─── Classes ──────────────────────────────────────────────────────────────────

export const getClassById = async (classId, user) => {
  if (!['admin', 'lecturer'].includes(user.role)) throw new AppError('Access denied', 403);

  const instituteId = user.institute?._id || user.institute;
  const classDoc = await repo.findClassPopulated(classId, instituteId);
  if (!classDoc) throw new AppError('Class not found', 404);

  const totalStudents = classDoc.students.length;
  const totalMales = classDoc.students.filter((s) => s?.studentProfile.gender === 'male').length;
  const totalFemales = classDoc.students.filter((s) => s?.studentProfile.gender === 'female').length;

  return { class: classDoc, totalStudents, totalMales, totalFemales };
};

export const getClassWithStudents = (classId, user) => {
  const instituteId = user.institute?._id || user.institute;
  return repo.findClassWithStudents(classId, instituteId);
};

export const getAllClasses = async (query, user) => {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const filter = { institute: user.institute };

  const [classes, total] = await Promise.all([
    repo.findClassesPaginated(filter, skip, limit),
    repo.countClasses(filter),
  ]);

  const data = classes.map((cls) => {
    const classObj = cls.toObject();
    const totalMale = classObj.students.filter((s) => s.studentProfile?.gender?.toLowerCase() === 'male').length;
    const totalFemale = classObj.students.filter((s) => s.studentProfile?.gender?.toLowerCase() === 'female').length;
    return {
      ...classObj,
      totalMale,
      totalFemale,
      totalStudents: classObj.students.length,
      students: classObj.students.map((s) => ({ _id: s._id, fullName: s.fullName, email: s.email })),
    };
  });

  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getStudentsByClass = (user) => {
  const instituteId = user.institute?._id || user.institute;
  return repo.findUsersPaginated({ role: 'student', institute: instituteId }, 0, 1000);
};

export const getLecturerClasses = (lecturerId, user) => {
  const instituteId = user.institute?._id || user.institute;
  return repo.findSubjectsByLecturer(lecturerId, instituteId);
};

export const getStudentClasses = async (studentId, user) => {
  const instituteId = user.institute?._id || user.institute;
  const student = await repo.findStudentById(studentId, instituteId);
  if (!student) throw new AppError('Student not found', 404);
  const subjects = await repo.findSubjectsByLecturer(student.class._id, instituteId);
  return { class: student.class, subjects };
};

// ─── Results ──────────────────────────────────────────────────────────────────

export const getAllAssignments = (user) => {
  const instituteId = user.institute?._id || user.institute;
  return repo.findAllAssignments(instituteId);
};

export const getResultsByClass = (classId, user, termId) => {
  const instituteId = user.institute?._id || user.institute;
  return repo.findResultsByClass(classId, instituteId, termId);
};

export const getResultsBySubject = (subjectId, user) => {
  const instituteId = user.institute?._id || user.institute;
  return repo.findResultsBySubject(subjectId, instituteId);
};

export const getClassRankings = async (classId, user, termId) => {
  const instituteId = user.institute?._id || user.institute;
  const results = await repo.findResultsForRanking(classId, instituteId, termId);
  const totals = {};
  results.forEach((r) => {
    const sid = String(r.student?._id ?? r.student);
    if (!totals[sid]) totals[sid] = { student: r.student, total: 0, subjects: 0 };
    totals[sid].total += r.marksObtained ?? 0;
    totals[sid].subjects += 1;
  });
  const sorted = Object.values(totals).sort((a, b) => b.total - a.total);
  let rank = 1;
  const ranked = sorted.map((entry, i) => {
    if (i > 0 && sorted[i].total < sorted[i - 1].total) rank = i + 1;
    return { ...entry, rank };
  });
  return { rankings: ranked, total: ranked.length };
};

export const getReportCard = async (studentId, user, termId) => {
  const student = await repo.findUserOne({ _id: studentId, institute: user.institute, role: 'student' });
  if (!student) throw new AppError('Student not found', 404);

  await student.populate({ path: 'class', select: 'name lecturer', populate: { path: 'lecturer', select: 'fullName' } });
  const studentObj = student.toObject ? student.toObject() : student;

  const [institute, terms, results, attendanceRecords] = await Promise.all([
    repo.findInstituteById(user.institute),
    repo.findTermsByInstitute(user.institute),
    repo.findResultsByStudentAndInstitute(studentId, user.institute, termId),
    repo.findAttendanceForReportCard(user.institute),
  ]);

  const totalClasses = attendanceRecords.length;
  const presentCount = attendanceRecords.reduce((acc, record) => {
    const entry = record.records?.find((r) => String(r.student) === String(studentId));
    return acc + (entry?.status === 'present' ? 1 : 0);
  }, 0);
  const attendance = { present: presentCount, total: totalClasses, percentage: totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0 };

  // Position uses annual totals (all terms combined)
  const classmates = await repo.findResultsForClassTotals(studentObj.class?._id ?? studentObj.class, user.institute);
  const classTotals = {};
  classmates.forEach((r) => { const sid = String(r.student); classTotals[sid] = (classTotals[sid] ?? 0) + (r.marksObtained ?? 0); });

  const myTotal = results.reduce((s, r) => s + (r.marksObtained ?? 0), 0);
  const outOf = Object.keys(classTotals).length;
  const higherCount = Object.values(classTotals).filter((t) => t > myTotal).length;
  const position = { rank: outOf > 0 ? higherCount + 1 : null, outOf };

  return {
    student: studentObj,
    institute,
    terms: terms.map((t) => ({ _id: t._id, name: t.name, academicYear: t.academicYear })),
    results: results.map((r) => ({
      _id: r._id,
      subject: r.subject,
      term: r.term ? { _id: r.term._id, name: r.term.name, academicYear: r.term.academicYear } : null,
      marksObtained: r.marksObtained,
      totalScore: r.totalScore ?? 100,
      grade: r.grade,
    })),
    attendance,
    position,
    generatedAt: new Date(),
  };
};

// ─── Fees ─────────────────────────────────────────────────────────────────────

export const createFeeParticular = async ({ fees }, user) => {
  if (!user.institute) throw new AppError('Create institute before adding fees', 400);
  if (!Array.isArray(fees) || fees.length === 0) throw new AppError('Fees must be a non-empty array', 400);

  const titles = fees.map((f) => f.title);
  if (new Set(titles).size !== titles.length) throw new AppError('Duplicate fee titles in request', 400);

  const feeDocs = fees.map((fee) => ({
    title: fee.title,
    amount: fee.amount,
    institute: user.institute,
    createdBy: user.id,
  }));

  return repo.insertFees(feeDocs);
};

// ─── Attendance ───────────────────────────────────────────────────────────────

export const markAttendance = ({ classId, date, records }, user) => {
  return repo.upsertAttendance(
    { class: classId, date, institute: user.institute },
    { class: classId, date, institute: user.institute, records, markedBy: user.id }
  );
};

export const attendanceSummary = async (studentId, user) => {
  const instituteId = user.institute?._id || user.institute;
  const [total, present] = await Promise.all([
    repo.countAttendanceByStudent(studentId, instituteId),
    repo.countAttendancePresentByStudent(studentId, instituteId),
  ]);
  const percentage = total === 0 ? 0 : ((present / total) * 100).toFixed(2);
  return { total, present, percentage };
};

// ─── Promotion ────────────────────────────────────────────────────────────────

export const getPromotionEligibility = async (classId, query, user) => {
  const instituteId = user.institute?._id || user.institute;
  const gradeThreshold = Number(query.gradeThreshold ?? 50);
  const attendanceThreshold = Number(query.attendanceThreshold ?? 75);

  const classDoc = await repo.findClassByIdAndInstitute(classId, instituteId);
  if (!classDoc) throw new AppError('Class not found', 404);

  const students = await repo.findStudentsInClass({ class: classId, institute: instituteId, role: 'student' });
  if (students.length === 0) return [];

  const studentIds = students.map((s) => s._id);

  const [results, fees, attendanceRecords] = await Promise.all([
    repo.findResultsByClass(classId, instituteId),
    repo.findStudentFeesByClass(classId, studentIds, instituteId),
    repo.findAttendanceForPromotion(classId, instituteId),
  ]);

  const gradesByStudent = {};
  for (const r of results) {
    const sid = String(r.student);
    if (!gradesByStudent[sid]) gradesByStudent[sid] = { total: 0, marks: 0, count: 0 };
    gradesByStudent[sid].marks += r.marksObtained ?? 0;
    gradesByStudent[sid].total += r.totalScore ?? 100;
    gradesByStudent[sid].count += 1;
  }

  const feesByStudent = {};
  for (const f of fees) {
    const sid = String(f.student);
    feesByStudent[sid] = (feesByStudent[sid] ?? 0) + (f.balance ?? 0);
  }

  const attByStudent = {};
  for (const record of attendanceRecords) {
    for (const entry of record.records) {
      const sid = String(entry.student);
      if (!attByStudent[sid]) attByStudent[sid] = { present: 0, total: 0 };
      attByStudent[sid].total += 1;
      if (entry.status === 'present') attByStudent[sid].present += 1;
    }
  }

  return students.map((student) => {
    const sid = String(student._id);
    const gradeData = gradesByStudent[sid];
    const avgPct = gradeData && gradeData.total > 0 ? Math.round((gradeData.marks / gradeData.total) * 100) : null;
    const gradeFlagged = !gradeData || gradeData.count === 0 || avgPct < gradeThreshold;
    const feeBalance = feesByStudent[sid] ?? 0;
    const feeFlagged = feeBalance > 0;
    const attData = attByStudent[sid];
    const attRate = attData && attData.total > 0 ? Math.round((attData.present / attData.total) * 100) : null;
    const attFlagged = attData ? attRate < attendanceThreshold : false;

    return {
      _id: student._id,
      fullName: student.fullName,
      email: student.email,
      lifecycleStatus: student.lifecycleStatus,
      flags: {
        grades: { flagged: gradeFlagged, average: avgPct, threshold: gradeThreshold, subjectCount: gradeData?.count ?? 0 },
        fees: { flagged: feeFlagged, balance: feeBalance },
        attendance: { flagged: attFlagged, rate: attRate, threshold: attendanceThreshold },
      },
      clearForPromotion: !gradeFlagged && !feeFlagged && !attFlagged,
    };
  });
};

export const bulkPromoteStudents = async ({ sourceClassId, targetClassId, studentIds }, req) => {
  const instituteId = req.user.institute?._id || req.user.institute;

  if (!sourceClassId || !targetClassId || !Array.isArray(studentIds) || studentIds.length === 0) {
    throw new AppError('sourceClassId, targetClassId, and a non-empty studentIds array are required', 400);
  }

  if (String(sourceClassId) === String(targetClassId)) {
    throw new AppError('Source and target class must be different', 400);
  }

  const [sourceClass, targetClass] = await Promise.all([
    repo.findClassByIdAndInstitute(sourceClassId, instituteId),
    repo.findClassByIdAndInstitute(targetClassId, instituteId),
  ]);

  if (!sourceClass) throw new AppError('Source class not found', 404);
  if (!targetClass) throw new AppError('Target class not found', 404);

  const students = await repo.findStudentsInClass({ _id: { $in: studentIds }, institute: instituteId, role: 'student', class: sourceClassId });

  if (students.length !== studentIds.length) {
    throw new AppError(`Only ${students.length} of ${studentIds.length} students are valid members of the source class`, 400);
  }

  const promotedIds = students.map((s) => s._id);

  await repo.updateManyUsers(
    { _id: { $in: promotedIds } },
    {
      $set: { class: targetClassId },
      $push: { promotionHistory: { fromClass: sourceClassId, toClass: targetClassId, promotedAt: new Date() } },
    }
  );

  await repo.updateOneClass({ _id: sourceClassId }, { $pullAll: { students: promotedIds } });
  await repo.updateOneClass({ _id: targetClassId }, { $addToSet: { students: { $each: promotedIds } } });

  logAudit(req, {
    action: 'BULK_PROMOTE_STUDENTS',
    entity: 'Class',
    entityId: targetClassId,
    description: `Promoted ${promotedIds.length} students from "${sourceClass.name}" to "${targetClass.name}"`,
    statusCode: 200,
  });

  for (const student of students) {
    notify({
      recipientId: student._id,
      instituteId,
      type: 'promotion',
      title: 'Class Promotion',
      message: `Congratulations! You have been promoted to ${targetClass.name}.`,
      relatedEntity: { entityType: 'Class', entityId: targetClassId },
    });
  }

  return { success: true, promoted: promotedIds.length, sourceClass: sourceClass.name, targetClass: targetClass.name };
};

// ─── Parent Management ────────────────────────────────────────────────────────

export const createParent = async ({ fullName, email, password, linkedStudents = [] }, user) => {
  if (!fullName || !email || !password) throw new AppError('fullName, email, password required', 400);

  const instituteId = user.institute?._id || user.institute;
  const existing = await repo.findUserByEmail(email);
  if (existing) throw new AppError('Email already in use', 409);

  if (linkedStudents.length > 0) {
    const students = await repo.findStudentsInClass({ _id: { $in: linkedStudents }, institute: instituteId, role: 'student' });
    if (students.length !== linkedStudents.length) throw new AppError('One or more students not found in this institute', 400);
  }

  const parent = await repo.createUser({ fullName, email, password, role: 'parent', institute: instituteId, approved: true, isActive: true, linkedStudents });
  const { password: _, ...safe } = parent.toObject();
  return safe;
};

export const getParents = (user) => {
  const instituteId = user.institute?._id || user.institute;
  return repo.findParents(instituteId);
};

export const linkStudentToParent = async ({ parentId, studentId }, user) => {
  const instituteId = user.institute?._id || user.institute;
  const [parent, student] = await Promise.all([
    repo.findUserOne({ _id: parentId, institute: instituteId, role: 'parent' }),
    repo.findUserOne({ _id: studentId, institute: instituteId, role: 'student' }),
  ]);
  if (!parent) throw new AppError('Parent not found', 404);
  if (!student) throw new AppError('Student not found', 404);

  if (!parent.linkedStudents.map(String).includes(String(studentId))) {
    parent.linkedStudents.push(studentId);
    await parent.save();
  }
  return parent.linkedStudents;
};

export const unlinkStudentFromParent = async ({ parentId, studentId }, user) => {
  const instituteId = user.institute?._id || user.institute;
  const parent = await repo.findUserOne({ _id: parentId, institute: instituteId, role: 'parent' });
  if (!parent) throw new AppError('Parent not found', 404);

  parent.linkedStudents = parent.linkedStudents.filter((id) => String(id) !== String(studentId));
  await parent.save();
  return parent.linkedStudents;
};

export const revokeParentAccess = async (parentId, user) => {
  const instituteId = user.institute?._id || user.institute;
  const parent = await repo.findUserOne({ _id: parentId, institute: instituteId, role: 'parent' });
  if (!parent) throw new AppError('Parent not found', 404);
  parent.isActive = false;
  await parent.save();
};

export const restoreParentAccess = async (parentId, user) => {
  const instituteId = user.institute?._id || user.institute;
  const parent = await repo.findUserOne({ _id: parentId, institute: instituteId, role: 'parent' });
  if (!parent) throw new AppError('Parent not found', 404);
  parent.isActive = true;
  await parent.save();
};

export const updateMyProfile = async (userId, { fullName, email }) => {
  const user = await repo.findUserOne({ _id: userId });
  if (!user) throw new AppError('User not found', 404);
  if (email && email !== user.email) {
    const exists = await repo.findUserOne({ email, _id: { $ne: userId } });
    if (exists) throw new AppError('Email already in use', 409);
    user.email = email;
  }
  if (fullName) user.fullName = fullName;
  await user.save();
  return user;
};
