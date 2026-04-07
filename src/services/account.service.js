import * as repo from '../repositories/account.repository.js';
import { AppError } from '../errors/AppError.js';

export const createAccount = async ({ role, institute, bankName, bankAddress, bankNo, bankLogo, instructions }) => {
  if (role !== 'admin') throw new AppError('Only admins can create accounts', 403);
  if (!bankName || !bankAddress || !bankNo) throw new AppError('bankName, bankAddress, and bankNo are required', 400);

  const existing = await repo.findByBankNo(bankNo);
  if (existing) throw new AppError('Bank account with this number already exists', 409);

  return repo.createAccount({
    institute,
    bankName,
    bankAddress,
    bankNo,
    bankLogo: bankLogo || '',
    instructions: instructions || '',
  });
};

export const getAllAccounts = (institute) => repo.findByInstitute(institute);

export const getActiveAccounts = (institute) => repo.findActiveByInstitute(institute);

export const getAccountById = async (id, institute) => {
  const account = await repo.findById(id, institute);
  if (!account) throw new AppError('Account not found', 404);
  return account;
};

export const updateAccount = async ({ role, institute, id, bankName, bankAddress, bankNo, bankLogo, instructions, isActive }) => {
  if (role !== 'admin') throw new AppError('Only admins can update accounts', 403);

  const account = await repo.findById(id, institute);
  if (!account) throw new AppError('Account not found', 404);

  if (bankNo && bankNo !== account.bankNo) {
    const existing = await repo.findByBankNo(bankNo);
    if (existing) throw new AppError('Bank account with this number already exists', 409);
    account.bankNo = bankNo;
  }

  if (bankName) account.bankName = bankName;
  if (bankAddress) account.bankAddress = bankAddress;
  if (bankLogo !== undefined) account.bankLogo = bankLogo;
  if (instructions !== undefined) account.instructions = instructions;
  if (isActive !== undefined) account.isActive = isActive;

  await account.save();
  return account;
};

export const deleteAccount = async ({ role, id, institute }) => {
  if (role !== 'admin') throw new AppError('Only admins can delete accounts', 403);

  const account = await repo.findById(id, institute);
  if (!account) throw new AppError('Account not found', 404);

  await repo.deleteById(id);
};

export const toggleAccountStatus = async ({ role, id, institute }) => {
  if (role !== 'admin') throw new AppError('Only admins can toggle account status', 403);

  const account = await repo.findById(id, institute);
  if (!account) throw new AppError('Account not found', 404);

  account.isActive = !account.isActive;
  await account.save();
  return account;
};
