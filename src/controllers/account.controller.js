import FeeInvoiceAccount from "../models/FeeInvoiceAccount.js";
import mongoose from "mongoose";

// Create new bank account
export const createAccount = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can create accounts" });
    }

    const { bankName, bankAddress, bankNo, bankLogo, instructions } = req.body;

    if (!bankName || !bankAddress || !bankNo) {
      return res.status(400).json({ message: "bankName, bankAddress, and bankNo are required" });
    }

    // Check if account already exists
    const existing = await FeeInvoiceAccount.findOne({ bankNo });
    if (existing) {
      return res.status(409).json({ message: "Bank account with this number already exists" });
    }

    const account = await FeeInvoiceAccount.create({
      institute: req.user.institute,
      bankName,
      bankAddress,
      bankNo,
      bankLogo: bankLogo || "",
      instructions: instructions || "",
    });

    res.status(201).json({
      message: "Bank account created successfully",
      data: account,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all accounts for institute
export const getAllAccounts = async (req, res) => {
  try {
    const accounts = await FeeInvoiceAccount.find({
      institute: req.user.institute,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      statusCode: 200,
      count: accounts.length,
      data: accounts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get active accounts only
export const getActiveAccounts = async (req, res) => {
  try {
    const accounts = await FeeInvoiceAccount.find({
      institute: req.user.institute,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      statusCode: 200,
      count: accounts.length,
      data: accounts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get account by ID
export const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await FeeInvoiceAccount.findOne({
      _id: id,
      institute: req.user.institute,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json({
      statusCode: 200,
      data: account,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update account
export const updateAccount = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can update accounts" });
    }

    const { id } = req.params;
    const { bankName, bankAddress, bankNo, bankLogo, instructions, accountHolderName, routingNumber, swiftCode, isActive } = req.body;

    const account = await FeeInvoiceAccount.findOne({
      _id: id,
      institute: req.user.institute,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Check if new bankNo is unique (if changed)
    if (bankNo && bankNo !== account.bankNo) {
      const existing = await FeeInvoiceAccount.findOne({ bankNo });
      if (existing) {
        return res.status(409).json({ message: "Bank account with this number already exists" });
      }
      account.bankNo = bankNo;
    }

    if (bankName) account.bankName = bankName;
    if (bankAddress) account.bankAddress = bankAddress;
    if (bankLogo !== undefined) account.bankLogo = bankLogo;
    if (instructions !== undefined) account.instructions = instructions;
    if (isActive !== undefined) account.isActive = isActive;

    await account.save();

    res.json({
      message: "Account updated successfully",
      data: account,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete account
export const deleteAccount = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can delete accounts" });
    }

    const { id } = req.params;

    const account = await FeeInvoiceAccount.findOne({
      _id: id,
      institute: req.user.institute,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    await FeeInvoiceAccount.deleteOne({ _id: id });

    res.json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle account active status
export const toggleAccountStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can toggle account status" });
    }

    const { id } = req.params;

    const account = await FeeInvoiceAccount.findOne({
      _id: id,
      institute: req.user.institute,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    account.isActive = !account.isActive;
    await account.save();

    res.json({
      message: `Account ${account.isActive ? "activated" : "deactivated"} successfully`,
      data: account,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
