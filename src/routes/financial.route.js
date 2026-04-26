import { Router } from 'express';
import auth from '../middlewares/auth.js';
import { adminOnly } from '../middlewares/adminOnly.js';
import {
  createRecord, getRecords, updateRecord, deleteRecord,
  getSummary,
  upsertBudget, getBudgets, deleteBudget,
  createAccount, getAccounts, updateAccount, deleteAccount,
} from '../controllers/financial.controller.js';

const router = Router();

// Records
router.get('/records', auth, adminOnly, getRecords);
router.post('/records', auth, adminOnly, createRecord);
router.patch('/records/:id', auth, adminOnly, updateRecord);
router.delete('/records/:id', auth, adminOnly, deleteRecord);

// Summary
router.get('/summary', auth, adminOnly, getSummary);

// Budgets
router.get('/budgets', auth, adminOnly, getBudgets);
router.post('/budgets', auth, adminOnly, upsertBudget);
router.delete('/budgets/:id', auth, adminOnly, deleteBudget);

// Accounts
router.get('/accounts', auth, adminOnly, getAccounts);
router.post('/accounts', auth, adminOnly, createAccount);
router.patch('/accounts/:id', auth, adminOnly, updateAccount);
router.delete('/accounts/:id', auth, adminOnly, deleteAccount);

export default router;
