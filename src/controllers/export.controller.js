import * as exportService from '../services/export.service.js';
import { sendCsv } from '../utils/csvExport.js';

export const exportStudentList = async (req, res, next) => {
  try {
    const instituteId = exportService.getInstituteId(req.user, req.query.instituteId);
    const data = await exportService.getStudentListData(instituteId);
    sendCsv(res, 'students.csv', ['fullName', 'email', 'class', 'status', 'createdAt'], data);
  } catch (err) {
    next(err);
  }
};

export const exportLecturerList = async (req, res, next) => {
  try {
    const instituteId = exportService.getInstituteId(req.user, req.query.instituteId);
    const data = await exportService.getLecturerListData(instituteId);
    sendCsv(res, 'lecturers.csv', ['fullName', 'email', 'department', 'position', 'status', 'createdAt'], data);
  } catch (err) {
    next(err);
  }
};

export const exportFeeCollection = async (req, res, next) => {
  try {
    const instituteId = exportService.getInstituteId(req.user, req.query.instituteId);
    const data = await exportService.getFeeCollectionData(instituteId);
    sendCsv(res, 'fee-collection.csv', ['studentName', 'studentEmail', 'className', 'totalAmount', 'paid', 'balance', 'status'], data);
  } catch (err) {
    next(err);
  }
};

export const exportSalaryReport = async (req, res, next) => {
  try {
    const data = await exportService.getSalaryReportData(req.query.instituteId);
    sendCsv(res, 'salary-report.csv', ['lecturerName', 'instituteName', 'salary', 'bonus', 'deduction', 'totalAmount', 'paymentStatus', 'salaryMonth'], data);
  } catch (err) {
    next(err);
  }
};

export const exportAttendanceSummary = async (req, res, next) => {
  try {
    const instituteId = exportService.getInstituteId(req.user, req.query.instituteId);
    const data = await exportService.getAttendanceSummaryData(instituteId);
    sendCsv(res, 'attendance-summary.csv', ['studentName', 'studentEmail', 'className', 'totalDays', 'presentDays', 'percentage'], data);
  } catch (err) {
    next(err);
  }
};
