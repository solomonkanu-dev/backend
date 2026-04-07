import * as employeeAttendanceService from '../services/employeeAttendance.service.js';

export const markEmployeeAttendance = async (req, res, next) => {
  try {
    const records = await employeeAttendanceService.markEmployeeAttendance(req.body, req.user);
    res.status(201).json({
      statusCode: 201,
      message: 'Employee attendance recorded successfully',
      count: records.length,
      data: records,
    });
  } catch (err) {
    next(err);
  }
};

export const getEmployeeAttendance = async (req, res, next) => {
  try {
    const result = await employeeAttendanceService.getEmployeeAttendance(req.query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getEmployeeAttendanceSummary = async (req, res, next) => {
  try {
    const result = await employeeAttendanceService.getEmployeeAttendanceSummary(req.params.lecturerId, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
