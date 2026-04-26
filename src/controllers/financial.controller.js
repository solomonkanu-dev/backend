import * as financialService from '../services/financial.service.js';

// ─── Records ─────────────────────────────────────────────────────────────────

export const createRecord = async (req, res, next) => {
  try {
    const record = await financialService.createRecord(req.body, req.user);
    res.status(201).json({ data: record });
  } catch (err) {
    next(err);
  }
};

export const getRecords = async (req, res, next) => {
  try {
    const records = await financialService.getRecords(req.query, req.user);
    res.json({ data: records });
  } catch (err) {
    next(err);
  }
};

export const updateRecord = async (req, res, next) => {
  try {
    const record = await financialService.updateRecord(req.params.id, req.body, req.user);
    res.json({ data: record });
  } catch (err) {
    next(err);
  }
};

export const deleteRecord = async (req, res, next) => {
  try {
    await financialService.deleteRecord(req.params.id, req.user);
    res.json({ message: 'Record deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── Summary ──────────────────────────────────────────────────────────────────

export const getSummary = async (req, res, next) => {
  try {
    const summary = await financialService.getSummary(req.user, req.query.termId);
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
};

// ─── Budgets ──────────────────────────────────────────────────────────────────

export const upsertBudget = async (req, res, next) => {
  try {
    const budget = await financialService.upsertBudget(req.body, req.user);
    res.status(201).json({ data: budget });
  } catch (err) {
    next(err);
  }
};

export const getBudgets = async (req, res, next) => {
  try {
    const budgets = await financialService.getBudgets(req.user, req.query.termId);
    res.json({ data: budgets });
  } catch (err) {
    next(err);
  }
};

export const deleteBudget = async (req, res, next) => {
  try {
    await financialService.deleteBudget(req.params.id, req.user);
    res.json({ message: 'Budget deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── Accounts ─────────────────────────────────────────────────────────────────

export const createAccount = async (req, res, next) => {
  try {
    const account = await financialService.createAccount(req.body, req.user);
    res.status(201).json({ data: account });
  } catch (err) {
    next(err);
  }
};

export const getAccounts = async (req, res, next) => {
  try {
    const accounts = await financialService.getAccounts(req.user);
    res.json({ data: accounts });
  } catch (err) {
    next(err);
  }
};

export const updateAccount = async (req, res, next) => {
  try {
    const account = await financialService.updateAccount(req.params.id, req.body, req.user);
    res.json({ data: account });
  } catch (err) {
    next(err);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    await financialService.deleteAccount(req.params.id, req.user);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
};
