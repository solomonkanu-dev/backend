import User from '../models/user.js';
import Salary from '../models/Salary.js';
import StudentFee from '../models/StudentFee.js';
import Attendance from '../models/Attendance.js';
import mongoose from 'mongoose';
import { sendCsv } from '../utils/csvExport.js';

const isDev = process.env.NODE_ENV === 'development';

const getInstituteId = (req) => {
  if (req.user.role === 'super_admin' && req.query.instituteId) {
    return req.query.instituteId;
  }
  return req.user.institute?._id || req.user.institute;
};

export const exportStudentList = async (req, res) => {
  try {
    const instituteId = getInstituteId(req);
    if (!instituteId) {
      return res.status(400).json({ success: false, message: 'Institute required' });
    }

    const students = await User.find({ role: 'student', institute: instituteId })
      .populate('class', 'name')
      .lean();

    const data = students.map((s) => ({
      fullName:  s.fullName,
      email:     s.email,
      class:     s.class?.name || '',
      status:    s.isActive ? 'active' : 'suspended',
      createdAt: s.createdAt?.toISOString() || '',
    }));

    const fields = ['fullName', 'email', 'class', 'status', 'createdAt'];
    sendCsv(res, 'students.csv', fields, data);
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const exportLecturerList = async (req, res) => {
  try {
    const instituteId = getInstituteId(req);
    if (!instituteId) {
      return res.status(400).json({ success: false, message: 'Institute required' });
    }

    const lecturers = await User.find({ role: 'lecturer', institute: instituteId }).lean();

    const data = lecturers.map((l) => ({
      fullName:   l.fullName,
      email:      l.email,
      department: l.lecturerProfile?.department || '',
      position:   l.lecturerProfile?.position   || '',
      status:     l.isActive ? 'active' : 'suspended',
      createdAt:  l.createdAt?.toISOString() || '',
    }));

    const fields = ['fullName', 'email', 'department', 'position', 'status', 'createdAt'];
    sendCsv(res, 'lecturers.csv', fields, data);
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const exportFeeCollection = async (req, res) => {
  try {
    const instituteId = getInstituteId(req);
    if (!instituteId) {
      return res.status(400).json({ success: false, message: 'Institute required' });
    }

    const fees = await StudentFee.find({ institute: instituteId })
      .populate('student', 'fullName email')
      .populate('class', 'name')
      .lean();

    const data = fees.map((f) => ({
      studentName:  f.student?.fullName || '',
      studentEmail: f.student?.email   || '',
      className:    f.class?.name      || '',
      totalAmount:  f.totalAmount,
      paid:         (f.totalAmount || 0) - (f.balance || 0),
      balance:      f.balance,
      status:       f.status,
    }));

    const fields = ['studentName', 'studentEmail', 'className', 'totalAmount', 'paid', 'balance', 'status'];
    sendCsv(res, 'fee-collection.csv', fields, data);
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const exportSalaryReport = async (req, res) => {
  try {
    const filter = {};
    if (req.query.instituteId) {
      filter.institute = req.query.instituteId;
    }

    const salaries = await Salary.find(filter)
      .populate('lecturer', 'fullName')
      .populate('institute', 'name')
      .lean();

    const data = salaries.map((s) => ({
      lecturerName:  s.lecturer?.fullName   || '',
      instituteName: s.institute?.name      || '',
      salary:        s.salary,
      bonus:         s.bonus,
      deduction:     s.deduction,
      totalAmount:   s.totalAmount,
      paymentStatus: s.status,
      salaryMonth:   s.salaryMonth,
    }));

    const fields = ['lecturerName', 'instituteName', 'salary', 'bonus', 'deduction', 'totalAmount', 'paymentStatus', 'salaryMonth'];
    sendCsv(res, 'salary-report.csv', fields, data);
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const exportAttendanceSummary = async (req, res) => {
  try {
    const instituteId = getInstituteId(req);
    if (!instituteId) {
      return res.status(400).json({ success: false, message: 'Institute required' });
    }

    const objectId = new mongoose.Types.ObjectId(instituteId);

    const summary = await Attendance.aggregate([
      { $match: { institute: objectId, type: 'student' } },
      { $unwind: '$records' },
      {
        $group: {
          _id: '$records.student',
          totalDays:   { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
          classId:     { $first: '$class' },
        },
      },
      {
        $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'student' },
      },
      { $unwind: '$student' },
      {
        $lookup: { from: 'classes', localField: 'classId', foreignField: '_id', as: 'class' },
      },
      {
        $project: {
          _id: 0,
          studentName:  '$student.fullName',
          studentEmail: '$student.email',
          className:    { $ifNull: [{ $arrayElemAt: ['$class.name', 0] }, ''] },
          totalDays:    1,
          presentDays:  1,
          percentage: {
            $cond: [
              { $gt: ['$totalDays', 0] },
              { $round: [{ $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100] }, 2] },
              0,
            ],
          },
        },
      },
    ]);

    const fields = ['studentName', 'studentEmail', 'className', 'totalDays', 'presentDays', 'percentage'];
    sendCsv(res, 'attendance-summary.csv', fields, summary);
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};
