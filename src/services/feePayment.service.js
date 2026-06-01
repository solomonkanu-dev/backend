import * as repo from '../repositories/feePayment.repository.js';
import Institute from '../models/Institute.js';
import User from '../models/user.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/audit.js';
import { sendEmailNotification } from '../utils/email.js';
import { sendSmsNotification } from '../utils/sms.js';
import { notify, notifyMany } from '../utils/notify.js';

async function generateReceiptNumber(instituteId) {
  const year = new Date().getFullYear();
  const count = await repo.countByInstitute(instituteId);
  const seq = String(count + 1).padStart(5, '0');
  return `RCP-${year}-${seq}`;
}

export const recordPayment = async (studentId, { amount, method = 'cash', reference = '', notes = '' }, req) => {
  const instituteId = req.user.institute?._id || req.user.institute;

  if (!amount || amount <= 0) throw new AppError('Amount must be greater than 0', 400);

  const studentFee = await repo.findStudentFee(studentId, instituteId);
  if (!studentFee) throw new AppError('No fee record found for this student', 404);
  if (studentFee.balance <= 0) throw new AppError('Student has no outstanding balance', 400);

  const payAmount = Math.min(amount, studentFee.balance);
  const receiptNumber = await generateReceiptNumber(instituteId);

  const payment = await repo.createPayment({
    receiptNumber,
    studentFee: studentFee._id,
    student: studentId,
    institute: instituteId,
    amount: payAmount,
    method,
    reference,
    notes,
    recordedBy: req.user._id,
  });

  let remaining = payAmount;
  for (const feeItem of studentFee.fees) {
    if (remaining <= 0) break;
    const unpaid = feeItem.amount - (feeItem.paid ?? 0);
    if (unpaid > 0) {
      const toApply = Math.min(remaining, unpaid);
      feeItem.paid = (feeItem.paid ?? 0) + toApply;
      remaining -= toApply;
    }
  }

  studentFee.balance = Math.max(0, studentFee.balance - payAmount);
  const totalPaid = studentFee.totalAmount - studentFee.balance;
  studentFee.status = studentFee.balance <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';
  await studentFee.save();

  const student = await User.findById(studentId).select('fullName email studentProfile').lean();

  logAudit(req, {
    action: 'CREATE_PAYMENT',
    entity: 'FeePayment',
    entityId: payment._id,
    description: `Recorded payment of ${payAmount} (${method}) for ${student?.fullName ?? studentId} — Receipt ${receiptNumber}`,
    statusCode: 201,
  });

  const institute = await Institute.findById(instituteId).select('name').lean();
  const notifData = {
    studentName: student?.fullName ?? 'Student',
    receiptNumber,
    amount: payAmount,
    method,
    balance: studentFee.balance,
    date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
  const notifMeta = { instituteId, type: 'feePayment', recipientId: studentId, instituteName: institute?.name ?? 'Institution', data: notifData };

  sendEmailNotification({ ...notifMeta, recipientEmail: student?.email }).catch(() => {});
  sendSmsNotification({ ...notifMeta, recipientPhone: student?.studentProfile?.mobileNumber }).catch(() => {});

  const balanceMsg = studentFee.balance > 0
    ? `Balance ${studentFee.balance.toLocaleString()} remaining.`
    : 'Your fees are fully paid. Thank you!';
  notify({
    recipientId: studentId,
    instituteId,
    type: 'fee_payment',
    title: 'Payment received',
    message: `${payAmount.toLocaleString()} received (Receipt ${receiptNumber}). ${balanceMsg}`,
    relatedEntity: { entityType: 'FeePayment', entityId: payment._id },
  });

  try {
    const parents = await User.find({ role: 'parent', linkedStudents: studentId }, '_id').lean();
    if (parents.length > 0) {
      notifyMany({
        recipientIds: parents.map((p) => p._id),
        instituteId,
        type: 'fee_payment',
        title: `Payment received for ${student?.fullName ?? 'your child'}`,
        message: `${payAmount.toLocaleString()} received (Receipt ${receiptNumber}). ${balanceMsg}`,
        relatedEntity: { entityType: 'FeePayment', entityId: payment._id },
      });
    }
  } catch {
    /* ignore parent fanout failure */
  }

  return { payment, receiptNumber };
};

export const getStudentPayments = (studentId, instituteId) =>
  repo.findPaymentsByStudent(studentId, instituteId);

export const getPaymentReceipt = async (paymentId, instituteId) => {
  const payment = await repo.findPaymentById(paymentId, instituteId);
  if (!payment) throw new AppError('Payment not found', 404);

  const [institute, studentFee] = await Promise.all([
    Institute.findById(instituteId).lean(),
    repo.findStudentFeeById(payment.studentFee),
  ]);

  return { payment, institute, studentFee };
};

export const getMyPayments = (userId) => repo.findMyPayments(userId);

export const getMyPaymentReceipt = async (paymentId, user) => {
  const payment = await repo.findMyPaymentReceipt(paymentId, user._id);
  if (!payment) throw new AppError('Receipt not found', 404);

  const instituteId = payment.institute;
  const [institute, studentFee, student] = await Promise.all([
    Institute.findById(instituteId).lean(),
    repo.findStudentFeeById(payment.studentFee),
    User.findById(user._id).populate('class', 'name').lean(),
  ]);

  return { payment: { ...payment, student }, institute, studentFee };
};
