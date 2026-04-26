import mongoose from 'mongoose';
import FinancialRecord from '../models/FinancialRecord.js';
import FinancialBudget from '../models/FinancialBudget.js';
import FinancialAccount from '../models/FinancialAccount.js';

// ─── Records ─────────────────────────────────────────────────────────────────

export const createRecord = (data) => FinancialRecord.create(data);

export const findRecords = (filter) =>
  FinancialRecord.find(filter)
    .populate('termId', 'name academicYear')
    .populate('accountId', 'name')
    .populate('recordedBy', 'fullName')
    .sort({ date: -1 })
    .lean();

export const findRecordById = (id) => FinancialRecord.findById(id).lean();

export const updateRecord = (id, update) =>
  FinancialRecord.findByIdAndUpdate(id, update, { new: true }).lean();

export const deleteRecord = (id) => FinancialRecord.findByIdAndDelete(id);

export const aggregateSummary = (institute, termId) => {
  const match = { institute: new mongoose.Types.ObjectId(institute) };
  if (termId) match.termId = new mongoose.Types.ObjectId(termId);

  return FinancialRecord.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
      },
    },
  ]);
};

export const aggregateByCategory = (institute, termId) => {
  const match = { institute: new mongoose.Types.ObjectId(institute) };
  if (termId) match.termId = new mongoose.Types.ObjectId(termId);

  return FinancialRecord.aggregate([
    { $match: match },
    {
      $group: {
        _id: { type: '$type', category: '$category' },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { total: -1 } },
  ]);
};

export const aggregateByTerm = (institute) =>
  FinancialRecord.aggregate([
    {
      $match: {
        institute: new mongoose.Types.ObjectId(institute),
        termId: { $ne: null },
      },
    },
    {
      $group: {
        _id: { termId: '$termId', type: '$type' },
        total: { $sum: '$amount' },
      },
    },
    {
      $lookup: {
        from: 'academicterms',
        localField: '_id.termId',
        foreignField: '_id',
        as: 'term',
      },
    },
    { $unwind: { path: '$term', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$_id.termId',
        termName: { $first: { $concat: ['$term.name', ' ', '$term.academicYear'] } },
        income: {
          $sum: { $cond: [{ $eq: ['$_id.type', 'income'] }, '$total', 0] },
        },
        expense: {
          $sum: { $cond: [{ $eq: ['$_id.type', 'expense'] }, '$total', 0] },
        },
      },
    },
    { $sort: { '_id': 1 } },
  ]);

export const aggregateAccountBalance = (accountId) =>
  FinancialRecord.aggregate([
    { $match: { accountId: new mongoose.Types.ObjectId(accountId) } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
      },
    },
  ]);

// Aggregate actual spending per category for a term (for budget vs actual)
export const aggregateActualByCategory = (institute, termId) => {
  const match = { institute: new mongoose.Types.ObjectId(institute) };
  if (termId) match.termId = new mongoose.Types.ObjectId(termId);

  return FinancialRecord.aggregate([
    { $match: match },
    {
      $group: {
        _id: { type: '$type', category: '$category' },
        actual: { $sum: '$amount' },
      },
    },
  ]);
};

// ─── Budgets ──────────────────────────────────────────────────────────────────

export const upsertBudget = (filter, data) =>
  FinancialBudget.findOneAndUpdate(filter, data, { upsert: true, new: true }).lean();

export const findBudgets = (filter) =>
  FinancialBudget.find(filter)
    .populate('termId', 'name academicYear')
    .sort({ type: 1, category: 1 })
    .lean();

export const findBudgetById = (id) => FinancialBudget.findById(id).lean();

export const deleteBudget = (id) => FinancialBudget.findByIdAndDelete(id);

// ─── Accounts ─────────────────────────────────────────────────────────────────

export const createAccount = (data) => FinancialAccount.create(data);

export const findAccounts = (filter) =>
  FinancialAccount.find(filter).sort({ createdAt: -1 }).lean();

export const findAccountById = (id) => FinancialAccount.findById(id).lean();

export const updateAccount = (id, update) =>
  FinancialAccount.findByIdAndUpdate(id, update, { new: true }).lean();

export const deleteAccount = (id) => FinancialAccount.findByIdAndDelete(id);
