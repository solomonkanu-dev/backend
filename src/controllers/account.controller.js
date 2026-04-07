import * as accountService from '../services/account.service.js';

export const createAccount = async (req, res, next) => {
  try {
    const account = await accountService.createAccount({ role: req.user.role, institute: req.user.institute, ...req.body });
    res.status(201).json({ message: 'Bank account created successfully', data: account });
  } catch (err) {
    next(err);
  }
};

export const getAllAccounts = async (req, res, next) => {
  try {
    const accounts = await accountService.getAllAccounts(req.user.institute);
    res.json({ statusCode: 200, count: accounts.length, data: accounts });
  } catch (err) {
    next(err);
  }
};

export const getActiveAccounts = async (req, res, next) => {
  try {
    const accounts = await accountService.getActiveAccounts(req.user.institute);
    res.json({ statusCode: 200, count: accounts.length, data: accounts });
  } catch (err) {
    next(err);
  }
};

export const getAccountById = async (req, res, next) => {
  try {
    const account = await accountService.getAccountById(req.params.id, req.user.institute);
    res.json({ statusCode: 200, data: account });
  } catch (err) {
    next(err);
  }
};

export const updateAccount = async (req, res, next) => {
  try {
    const account = await accountService.updateAccount({ role: req.user.role, institute: req.user.institute, id: req.params.id, ...req.body });
    res.json({ message: 'Account updated successfully', data: account });
  } catch (err) {
    next(err);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    await accountService.deleteAccount({ role: req.user.role, id: req.params.id, institute: req.user.institute });
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const toggleAccountStatus = async (req, res, next) => {
  try {
    const account = await accountService.toggleAccountStatus({ role: req.user.role, id: req.params.id, institute: req.user.institute });
    res.json({ message: `Account ${account.isActive ? 'activated' : 'deactivated'} successfully`, data: account });
  } catch (err) {
    next(err);
  }
};
