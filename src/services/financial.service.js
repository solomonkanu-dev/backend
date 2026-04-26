import AcademicTerm from '../models/AcademicTerm.js';
import { AppError } from '../errors/AppError.js';
import * as repo from '../repositories/financial.repository.js';

const inst = (user) => user.institute?._id ?? user.institute;

// ─── Records ─────────────────────────────────────────────────────────────────

export const createRecord = async (payload, user) => {
  if (!payload.amount || payload.amount <= 0) {
    throw new AppError('Amount must be greater than zero', 400);
  }
  return repo.createRecord({
    type: payload.type,
    category: payload.category,
    amount: payload.amount,
    date: payload.date,
    description: payload.description ?? '',
    paymentMethod: payload.paymentMethod ?? 'cash',
    reference: payload.reference ?? '',
    termId: payload.termId || null,
    accountId: payload.accountId || null,
    institute: inst(user),
    recordedBy: user._id,
  });
};

export const getRecords = async (filters, user) => {
  const filter = { institute: inst(user) };
  if (filters.type) filter.type = filters.type;
  if (filters.termId) filter.termId = filters.termId;
  if (filters.category) filter.category = filters.category;
  if (filters.accountId) filter.accountId = filters.accountId;
  if (filters.startDate || filters.endDate) {
    filter.date = {};
    if (filters.startDate) filter.date.$gte = new Date(filters.startDate);
    if (filters.endDate) filter.date.$lte = new Date(filters.endDate);
  }
  return repo.findRecords(filter);
};

export const updateRecord = async (id, payload, user) => {
  const record = await repo.findRecordById(id);
  if (!record) throw new AppError('Record not found', 404);
  if (String(record.institute) !== String(inst(user))) {
    throw new AppError('Access denied', 403);
  }
  const allowed = ['type', 'category', 'amount', 'date', 'description', 'paymentMethod', 'reference', 'termId', 'accountId'];
  const update = {};
  for (const key of allowed) {
    if (key in payload) update[key] = payload[key] || (key === 'termId' || key === 'accountId' ? null : payload[key]);
  }
  return repo.updateRecord(id, update);
};

export const deleteRecord = async (id, user) => {
  const record = await repo.findRecordById(id);
  if (!record) throw new AppError('Record not found', 404);
  if (String(record.institute) !== String(inst(user))) {
    throw new AppError('Access denied', 403);
  }
  return repo.deleteRecord(id);
};

// ─── Summary / Reports ────────────────────────────────────────────────────────

export const getSummary = async (user, termId) => {
  const institute = inst(user);

  const [summaryRows, categoryRows, termRows] = await Promise.all([
    repo.aggregateSummary(institute, termId),
    repo.aggregateByCategory(institute, termId),
    repo.aggregateByTerm(institute),
  ]);

  const totalIncome = summaryRows.find((r) => r._id === 'income')?.total ?? 0;
  const totalExpense = summaryRows.find((r) => r._id === 'expense')?.total ?? 0;

  const byCategory = categoryRows.map((r) => ({
    type: r._id.type,
    category: r._id.category,
    total: r.total,
  }));

  const termComparison = termRows.map((r) => ({
    termId: r._id,
    term: r.termName || 'Unknown Term',
    income: r.income,
    expense: r.expense,
  }));

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    byCategory,
    termComparison,
  };
};

// ─── Budgets ──────────────────────────────────────────────────────────────────

export const upsertBudget = async (payload, user) => {
  if (!payload.termId) throw new AppError('Term is required for budgets', 400);

  const term = await AcademicTerm.findById(payload.termId).lean();
  if (!term) throw new AppError('Term not found', 404);

  const filter = {
    institute: inst(user),
    termId: payload.termId,
    category: payload.category,
    type: payload.type,
  };

  return repo.upsertBudget(filter, {
    ...filter,
    budgetedAmount: payload.budgetedAmount,
    academicYear: term.academicYear,
    createdBy: user._id,
  });
};

export const getBudgets = async (user, termId) => {
  const filter = { institute: inst(user) };
  if (termId) filter.termId = termId;

  const [budgets, actuals] = await Promise.all([
    repo.findBudgets(filter),
    repo.aggregateActualByCategory(inst(user), termId),
  ]);

  const actualMap = {};
  for (const a of actuals) {
    actualMap[`${a._id.type}::${a._id.category}`] = a.actual;
  }

  return budgets.map((b) => ({
    ...b,
    actual: actualMap[`${b.type}::${b.category}`] ?? 0,
  }));
};

export const deleteBudget = async (id, user) => {
  const budget = await repo.findBudgetById(id);
  if (!budget) throw new AppError('Budget not found', 404);
  if (String(budget.institute) !== String(inst(user))) {
    throw new AppError('Access denied', 403);
  }
  return repo.deleteBudget(id);
};

// ─── Accounts ─────────────────────────────────────────────────────────────────

export const createAccount = async (payload, user) => {
  return repo.createAccount({
    name: payload.name,
    type: payload.type ?? 'bank',
    bankName: payload.bankName ?? '',
    accountNumber: payload.accountNumber ?? '',
    openingBalance: payload.openingBalance ?? 0,
    institute: inst(user),
    createdBy: user._id,
  });
};

export const getAccounts = async (user) => {
  const accounts = await repo.findAccounts({ institute: inst(user) });

  // Compute current balance for each account
  const withBalances = await Promise.all(
    accounts.map(async (account) => {
      const rows = await repo.aggregateAccountBalance(account._id);
      const income = rows.find((r) => r._id === 'income')?.total ?? 0;
      const expense = rows.find((r) => r._id === 'expense')?.total ?? 0;
      return { ...account, currentBalance: account.openingBalance + income - expense };
    })
  );

  return withBalances;
};

export const updateAccount = async (id, payload, user) => {
  const account = await repo.findAccountById(id);
  if (!account) throw new AppError('Account not found', 404);
  if (String(account.institute) !== String(inst(user))) {
    throw new AppError('Access denied', 403);
  }
  const allowed = ['name', 'type', 'bankName', 'accountNumber', 'openingBalance', 'isActive'];
  const update = {};
  for (const key of allowed) {
    if (key in payload) update[key] = payload[key];
  }
  return repo.updateAccount(id, update);
};

export const deleteAccount = async (id, user) => {
  const account = await repo.findAccountById(id);
  if (!account) throw new AppError('Account not found', 404);
  if (String(account.institute) !== String(inst(user))) {
    throw new AppError('Access denied', 403);
  }
  return repo.deleteAccount(id);
};

// ─── Export helper ────────────────────────────────────────────────────────────

export const getFinancialExportData = async (user) => {
  const records = await repo.findRecords({ institute: inst(user) });
  return records.map((r) => ({
    date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
    type: r.type,
    category: r.category,
    description: r.description,
    amount: r.amount,
    paymentMethod: r.paymentMethod,
    reference: r.reference,
    term: r.termId ? `${r.termId.name} ${r.termId.academicYear}` : '',
    recordedBy: r.recordedBy?.fullName ?? '',
  }));
};
