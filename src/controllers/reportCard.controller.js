import * as adminService from '../services/admin.service.js';
import Class from '../models/Class.js';
import User from '../models/user.js';
import { AppError } from '../errors/AppError.js';

/** Admins may access any student; lecturers only their own class (form teacher). */
const assertCanAccessStudentReport = async (user, studentId) => {
  if (user.role === 'admin') return;
  if (user.role === 'lecturer') {
    const student = await User.findById(studentId).select('class').lean();
    if (student?.class) {
      const cls = await Class.findById(student.class).select('lecturer').lean();
      if (cls && String(cls.lecturer) === String(user._id)) return;
    }
  }
  throw new AppError('You can only access report cards for your own class', 403);
};

export const getReportCard = async (req, res, next) => {
  try {
    await assertCanAccessStudentReport(req.user, req.params.studentId);
    const data = await adminService.getReportCard(req.params.studentId, req.user, req.query.termId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const saveReportCardMeta = async (req, res, next) => {
  try {
    await assertCanAccessStudentReport(req.user, req.params.studentId);
    const data = await adminService.saveReportCardMeta(req.params.studentId, req.body, req);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
