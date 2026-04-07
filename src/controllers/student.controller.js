import * as studentService from '../services/student.service.js';

export const getStudentDashboard = (req, res) => {
  res.json({ message: 'User dashboard not yet implemented' });
};

export const getStudents = async (req, res, next) => {
  try {
    const data = await studentService.getStudents();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getStudentById = async (req, res, next) => {
  try {
    const data = await studentService.getStudentById(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getMyFees = async (req, res, next) => {
  try {
    const data = await studentService.getMyFees(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getMyResults = async (req, res, next) => {
  try {
    const data = req.query.classId
      ? await studentService.getMyResultsByClass(req.query.classId, req.user)
      : await studentService.getMyResults(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getMyPromotionHistory = async (req, res, next) => {
  try {
    const result = await studentService.getMyPromotionHistory(req.user._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getMyReportCard = async (req, res, next) => {
  try {
    const data = await studentService.getMyReportCard(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getMyPayments = async (req, res, next) => {
  try {
    const data = await studentService.getMyPayments(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getMyPaymentReceipt = async (req, res, next) => {
  try {
    const data = await studentService.getMyPaymentReceipt(req.params.paymentId, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getMyRanking = async (req, res, next) => {
  try {
    const data = await studentService.getMyRanking(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
