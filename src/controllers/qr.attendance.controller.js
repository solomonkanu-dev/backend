import * as qrAttendanceService from '../services/qrAttendance.service.js';

export const scanQR = async (req, res, next) => {
  try {
    const result = await qrAttendanceService.scanQR(req.body, req.user);
    const status = result.created ? 201 : 200;
    const { created, ...response } = result;
    res.status(status).json(response);
  } catch (err) {
    next(err);
  }
};

export const finalizeQRAttendance = async (req, res, next) => {
  try {
    const result = await qrAttendanceService.finalizeQRAttendance(req.body, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getQRSession = async (req, res, next) => {
  try {
    const result = await qrAttendanceService.getQRSession(req.params.classId, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getStudentQR = async (req, res, next) => {
  try {
    const data = await qrAttendanceService.getStudentQR(req.params.studentId, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getMyQR = async (req, res, next) => {
  try {
    const data = await qrAttendanceService.getStudentQR(req.user._id, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const toggleStudentQR = async (req, res, next) => {
  try {
    const student = await qrAttendanceService.toggleStudentQR(
      req.params.studentId,
      req.body,
      req.user
    );
    res.json({
      message: `QR code ${req.body.qrActive ? 'activated' : 'deactivated'} for ${student.fullName}`,
      student,
    });
  } catch (err) {
    next(err);
  }
};

export { backfillQRTokens } from '../services/qrAttendance.service.js';
