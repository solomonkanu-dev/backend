import * as adminService from '../services/admin.service.js';

export const requestAdminSignup = async (req, res, next) => {
  try {
    await adminService.requestAdminSignup(req.body);
    res.status(201).json({
      message: 'Admin signup request submitted. Awaiting approval.',
    });
  } catch (err) {
    next(err);
  }
};

export const createStudent = async (req, res, next) => {
  try {
    const result = await adminService.createStudent(req.body, req);
    res.status(201).json({
      statusCode: 201,
      message: 'Student created successfully',
      student: result.student,
      tempPassword: result.tempPassword,
    });
  } catch (err) {
    next(err);
  }
};

export const createLecturer = async (req, res, next) => {
  try {
    const user = await adminService.createLecturer(req.body, req);
    res.status(201).json({ statusCode: 201, message: 'Employee created successfully', user });
  } catch (err) {
    next(err);
  }
};

export const updateLecturerProfile = async (req, res, next) => {
  try {
    const user = await adminService.updateLecturerProfile(req.params.id, req.body, req);
    res.json({ message: 'Lecturer profile updated successfully', user });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    await adminService.resetPassword(req.params.userId, req.body.password, req);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
};

export const createInstitute = async (req, res, next) => {
  try {
    const institute = await adminService.createInstitute(req.body, req);
    res.status(201).json({ message: 'Institute created successfully', institute });
  } catch (err) {
    next(err);
  }
};

export const getAllStudents = async (req, res, next) => {
  try {
    const result = await adminService.getAllStudents(req.query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getAllLecturers = async (req, res, next) => {
  try {
    const result = await adminService.getAllLecturers(req.query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getLecturerById = async (req, res, next) => {
  try {
    const data = await adminService.getLecturerById(req.params.lecturerId, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getStudentById = async (req, res, next) => {
  try {
    const data = await adminService.getStudentById(req.params.studentId, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getStudentAssignments = async (req, res, next) => {
  try {
    const data = await adminService.getStudentAssignments(req.params.studentId, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getClassById = async (req, res, next) => {
  try {
    const result = await adminService.getClassById(req.params.classId, req.user);
    res.status(200).json({ statusCode: 200, ...result });
  } catch (err) {
    next(err);
  }
};

export const getClassWithStudents = async (req, res, next) => {
  try {
    const data = await adminService.getClassWithStudents(req.params.classId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getAllClasses = async (req, res, next) => {
  try {
    const result = await adminService.getAllClasses(req.query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getStudentsByClass = async (req, res, next) => {
  try {
    const data = await adminService.getStudentsByClass();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getLecturerClasses = async (req, res, next) => {
  try {
    const data = await adminService.getLecturerClasses(req.params.lecturerId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getStudentClasses = async (req, res, next) => {
  try {
    const result = await adminService.getStudentClasses(req.params.studentId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getAllAssignments = async (req, res, next) => {
  try {
    const data = await adminService.getAllAssignments();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getResultsByClass = async (req, res, next) => {
  try {
    const data = await adminService.getResultsByClass(req.params.classId, req.user, req.query.termId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getResultsBySubject = async (req, res, next) => {
  try {
    const data = await adminService.getResultsBySubject(req.params.subjectId, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getMyInstitute = async (req, res, next) => {
  try {
    const data = await adminService.getMyInstitute(req.user.id || req.user._id);
    res.status(200).json({ statusCode: 200, success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateInstitute = async (req, res, next) => {
  try {
    const data = await adminService.updateInstitute(req.user.id || req.user._id, req.body);
    res.status(200).json({ message: 'Institute updated successfully', data });
  } catch (err) {
    next(err);
  }
};

export const createFeeParticular = async (req, res, next) => {
  try {
    const result = await adminService.createFeeParticular(req.body, req.user);
    res.status(201).json({
      message: 'Fee particulars created successfully',
      count: result.count,
      fees: result.fees,
    });
  } catch (err) {
    next(err);
  }
};

export const markAttendance = async (req, res, next) => {
  try {
    const attendance = await adminService.markAttendance(req.body, req.user);
    res.json({ message: 'Attendance saved', attendance });
  } catch (err) {
    next(err);
  }
};

export const attendanceSummary = async (req, res, next) => {
  try {
    const result = await adminService.attendanceSummary(req.params.studentId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const suspendUser = async (req, res, next) => {
  try {
    await adminService.suspendUser(req.params.userId, req);
    res.json({ success: true, message: 'Account suspended successfully' });
  } catch (err) {
    next(err);
  }
};

export const unsuspendUser = async (req, res, next) => {
  try {
    await adminService.unsuspendUser(req.params.userId, req);
    res.json({ success: true, message: 'Account unsuspended successfully' });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    await adminService.deleteUser(req.params.userId, req);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const updateStudentLifecycle = async (req, res, next) => {
  try {
    const student = await adminService.updateStudentLifecycle(
      req.params.studentId,
      req.body,
      req
    );
    res.json({ message: 'Student status updated', student });
  } catch (err) {
    next(err);
  }
};

export const getClassRankings = async (req, res, next) => {
  try {
    const result = await adminService.getClassRankings(req.params.classId, req.user, req.query.termId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getReportCard = async (req, res, next) => {
  try {
    const data = await adminService.getReportCard(req.params.studentId, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    const data = await adminService.updateStudent(req.params.studentId, req.body, req);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getPromotionEligibility = async (req, res, next) => {
  try {
    const data = await adminService.getPromotionEligibility(
      req.params.classId,
      req.query,
      req.user
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const bulkPromoteStudents = async (req, res, next) => {
  try {
    const result = await adminService.bulkPromoteStudents(req.body, req);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const updateLecturer = async (req, res, next) => {
  try {
    const data = await adminService.updateLecturer(req.params.lecturerId, req.body, req);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createParent = async (req, res, next) => {
  try {
    const data = await adminService.createParent(req.body, req.user);
    res.status(201).json({ message: 'Parent account created', data });
  } catch (err) {
    next(err);
  }
};

export const getParents = async (req, res, next) => {
  try {
    const data = await adminService.getParents(req.user);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const linkStudentToParent = async (req, res, next) => {
  try {
    const data = await adminService.linkStudentToParent(req.body, req.user);
    res.json({ message: 'Student linked to parent', data });
  } catch (err) {
    next(err);
  }
};

export const unlinkStudentFromParent = async (req, res, next) => {
  try {
    const data = await adminService.unlinkStudentFromParent(req.body, req.user);
    res.json({ message: 'Student unlinked', data });
  } catch (err) {
    next(err);
  }
};

export const revokeParentAccess = async (req, res, next) => {
  try {
    await adminService.revokeParentAccess(req.params.parentId, req.user);
    res.json({ message: 'Parent access revoked' });
  } catch (err) {
    next(err);
  }
};

export const restoreParentAccess = async (req, res, next) => {
  try {
    await adminService.restoreParentAccess(req.params.parentId, req.user);
    res.json({ message: 'Parent access restored' });
  } catch (err) {
    next(err);
  }
};
export const updateMyProfile = async (req, res, next) => {
  try {
    const user = await adminService.updateMyProfile(req.user._id, req.body);
    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    next(err);
  }
};
