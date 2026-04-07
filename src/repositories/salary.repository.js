import Salary from '../models/Salary.js';
import mongoose from 'mongoose';

export const findOne = (query) => Salary.findOne(query);

export const findPaginated = (match, skip, limit) =>
  Salary.find(match)
    .populate('lecturer', 'fullName email lecturerProfile')
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

export const countDocuments = (match) => Salary.countDocuments(match);

export const findByLecturer = (match) =>
  Salary.find(match).sort({ date: -1 }).lean();

export const findById = (id, institute) =>
  Salary.findOne({ _id: id, institute }).populate('lecturer', 'fullName email lecturerProfile');

export const createSalary = (data) => Salary.create(data);

export const deleteById = (id) => Salary.deleteOne({ _id: id });

export const aggregateMonthly = (instituteId, salaryMonth) =>
  Salary.aggregate([
    { $match: { institute: new mongoose.Types.ObjectId(instituteId), salaryMonth } },
    {
      $group: {
        _id: null,
        totalSalary: { $sum: '$salary' },
        totalBonus: { $sum: '$bonus' },
        totalDeduction: { $sum: '$deduction' },
        totalAmount: { $sum: '$totalAmount' },
        totalRecords: { $sum: 1 },
        paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
        pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
      },
    },
  ]);

export const aggregateSystemWide = () =>
  Salary.aggregate([
    {
      $group: {
        _id: null,
        totalPaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
        totalPending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$totalAmount', 0] } },
        totalDisbursed: { $sum: '$totalAmount' },
      },
    },
  ]);

export const aggregateByInstitute = (instituteId) =>
  Salary.aggregate([
    { $match: { institute: new mongoose.Types.ObjectId(instituteId) } },
    {
      $group: {
        _id: null,
        totalDisbursed: { $sum: '$totalAmount' },
        totalPaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
        totalPending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$totalAmount', 0] } },
      },
    },
    { $project: { _id: 0 } },
  ]);

export const aggregateSalaryExpenditure = () =>
  Salary.aggregate([
    {
      $group: {
        _id: null,
        totalDisbursed: { $sum: '$totalAmount' },
        totalPaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
        totalPending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$totalAmount', 0] } },
        totalRecords: { $sum: 1 },
        paidCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
        pendingCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] } },
      },
    },
    { $project: { _id: 0 } },
  ]);

export const aggregateSalaryByStatus = () =>
  Salary.aggregate([
    { $group: { _id: '$paymentStatus', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
    { $project: { _id: 0, status: '$_id', count: 1, totalAmount: 1 } },
  ]);

export const aggregateSalaryByInstitute = () =>
  Salary.aggregate([
    {
      $group: {
        _id: '$institute',
        totalDisbursed: { $sum: '$totalAmount' },
        totalPaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
        totalPending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$totalAmount', 0] } },
        staffCount: { $addToSet: '$lecturer' },
      },
    },
    { $lookup: { from: 'institutes', localField: '_id', foreignField: '_id', as: 'institute' } },
    { $unwind: '$institute' },
    {
      $project: {
        _id: 0,
        instituteName: '$institute.name',
        totalDisbursed: 1,
        totalPaid: 1,
        totalPending: 1,
        staffCount: { $size: '$staffCount' },
      },
    },
    { $sort: { totalDisbursed: -1 } },
  ]);
