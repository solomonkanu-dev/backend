import * as attendanceService from '../services/attendance.service.js';

export const getStudentsForAttendance = async (req, res, next) => {
  try {
    const data = await attendanceService.getStudentsForAttendance(req.query.classId, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const markAttendance = async (req, res, next) => {
  try {
    const attendanceDoc = await attendanceService.markAttendance(req.body, req.user);
    res.status(201).json({ message: 'Attendance recorded successfully', data: attendanceDoc });
  } catch (err) {
    next(err);
  }
};

export const getMyAttendance = async (req, res, next) => {
  try {
    const result = await attendanceService.getMyAttendance(req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const attendanceSummary = async (req, res, next) => {
  try {
    const result = await attendanceService.attendanceSummary(req.params.studentId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getSubjectAttendance = async (req, res, next) => {
  try {
    const result = await attendanceService.getSubjectAttendance(req.query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getMyAttendanceSummary = async (req, res, next) => {
  try {
    const summary = await attendanceService.getMyAttendanceSummary(req.user);
    res.json(summary);
  } catch (err) {
    next(err);
  }
};

export const checkExamEligibility = async (req, res, next) => {
  try {
    const result = await attendanceService.checkExamEligibility(req.params.classId, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const attendanceAnalytics = async (req, res, next) => {
  try {
    const data = await attendanceService.attendanceAnalytics(req.params.classId, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getClassWiseReport = async (req, res, next) => {
  try {
    const result = await attendanceService.getClassWiseReport(req.query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const markEmployeeAttendance = async (req, res, next) => {
  try {
    await attendanceService.markEmployeeAttendance(req.body, req.user);
    res.status(201).json({ statusCode: 201, message: 'Lecturer attendance marked successfully' });
  } catch (err) {
    next(err);
  }
};

export const getEmployeeAttendance = async (req, res, next) => {
  try {
    const result = await attendanceService.getEmployeeAttendance(req.query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getEmployeeAttendanceSummary = async (req, res, next) => {
  try {
    const result = await attendanceService.getEmployeeAttendanceSummary(req.params.employeeId, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
