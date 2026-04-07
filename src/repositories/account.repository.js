import FeeInvoiceAccount from '../models/FeeInvoiceAccount.js';

export const findByBankNo = (bankNo) => FeeInvoiceAccount.findOne({ bankNo });

export const findByInstitute = (institute) =>
  FeeInvoiceAccount.find({ institute }).sort({ createdAt: -1 }).lean();

export const findActiveByInstitute = (institute) =>
  FeeInvoiceAccount.find({ institute, isActive: true }).sort({ createdAt: -1 }).lean();

export const findById = (id, institute) =>
  FeeInvoiceAccount.findOne({ _id: id, institute });

export const createAccount = (data) => FeeInvoiceAccount.create(data);

export const deleteById = (id) => FeeInvoiceAccount.deleteOne({ _id: id });
