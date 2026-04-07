import * as feePaymentService from '../services/feePayment.service.js';

export const recordPayment = async (req, res, next) => {
  try {
    const result = await feePaymentService.recordPayment(
      req.params.studentId,
      req.body,
      req
    );
    res.status(201).json({ message: 'Payment recorded successfully', ...result });
  } catch (err) {
    next(err);
  }
};

export const getStudentPayments = async (req, res, next) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;
    const payments = await feePaymentService.getStudentPayments(
      req.params.studentId,
      instituteId
    );
    res.json(payments);
  } catch (err) {
    next(err);
  }
};

export const getPaymentReceipt = async (req, res, next) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;
    const data = await feePaymentService.getPaymentReceipt(
      req.params.paymentId,
      instituteId
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getMyPayments = async (req, res, next) => {
  try {
    const payments = await feePaymentService.getMyPayments(req.user._id);
    res.json(payments);
  } catch (err) {
    next(err);
  }
};

export const getMyPaymentReceipt = async (req, res, next) => {
  try {
    const data = await feePaymentService.getMyPaymentReceipt(
      req.params.paymentId,
      req.user
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
};
