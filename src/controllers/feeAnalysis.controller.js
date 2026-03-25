import StudentFee from "../models/StudentFee.js";
import mongoose from "mongoose";

/**
 * GET /api/v1/admin/fee-analysis/summary
 * Overall fee collection summary for the institute
 */
export const getFeeSummary = async (req, res) => {
  try {
    const instituteId = req.user.institute;

    const result = await StudentFee.aggregate([
      { $match: { institute: new mongoose.Types.ObjectId(instituteId) } },
      {
        $group: {
          _id: null,
          totalExpected: { $sum: "$totalAmount" },
          totalCollected: { $sum: { $subtract: ["$totalAmount", "$balance"] } },
          totalOutstanding: { $sum: "$balance" },
          totalStudents: { $sum: 1 },
          paidCount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
          partialCount: { $sum: { $cond: [{ $eq: ["$status", "partial"] }, 1, 0] } },
          unpaidCount: { $sum: { $cond: [{ $eq: ["$status", "unpaid"] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalExpected: 1,
          totalCollected: 1,
          totalOutstanding: 1,
          totalStudents: 1,
          paidCount: 1,
          partialCount: 1,
          unpaidCount: 1,
          collectionRate: {
            $cond: [
              { $gt: ["$totalExpected", 0] },
              {
                $round: [
                  { $multiply: [{ $divide: ["$totalCollected", "$totalExpected"] }, 100] },
                  2,
                ],
              },
              0,
            ],
          },
        },
      },
    ]);

    const summary = result[0] || {
      totalExpected: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      totalStudents: 0,
      paidCount: 0,
      partialCount: 0,
      unpaidCount: 0,
      collectionRate: 0,
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

/**
 * GET /api/v1/admin/fee-analysis/by-class
 * Fee breakdown per class
 */
export const getFeeByClass = async (req, res) => {
  try {
    const instituteId = req.user.institute;

    const result = await StudentFee.aggregate([
      { $match: { institute: new mongoose.Types.ObjectId(instituteId) } },
      {
        $group: {
          _id: "$class",
          totalExpected: { $sum: "$totalAmount" },
          totalCollected: { $sum: { $subtract: ["$totalAmount", "$balance"] } },
          totalOutstanding: { $sum: "$balance" },
          totalStudents: { $sum: 1 },
          paidCount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
          partialCount: { $sum: { $cond: [{ $eq: ["$status", "partial"] }, 1, 0] } },
          unpaidCount: { $sum: { $cond: [{ $eq: ["$status", "unpaid"] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: "classes",
          localField: "_id",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: { path: "$classInfo", preserveNullAndEmpty: true } },
      {
        $project: {
          classId: "$_id",
          className: "$classInfo.name",
          totalExpected: 1,
          totalCollected: 1,
          totalOutstanding: 1,
          totalStudents: 1,
          paidCount: 1,
          partialCount: 1,
          unpaidCount: 1,
          collectionRate: {
            $cond: [
              { $gt: ["$totalExpected", 0] },
              {
                $round: [
                  { $multiply: [{ $divide: ["$totalCollected", "$totalExpected"] }, 100] },
                  2,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { totalOutstanding: -1 } },
    ]);

    res.json({ success: true, data: result });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

/**
 * GET /api/v1/admin/fee-analysis/by-status
 * Fee totals grouped by payment status
 */
export const getFeeByStatus = async (req, res) => {
  try {
    const instituteId = req.user.institute;

    const result = await StudentFee.aggregate([
      { $match: { institute: new mongoose.Types.ObjectId(instituteId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
          totalCollected: { $sum: { $subtract: ["$totalAmount", "$balance"] } },
          totalOutstanding: { $sum: "$balance" },
        },
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          count: 1,
          totalAmount: 1,
          totalCollected: 1,
          totalOutstanding: 1,
        },
      },
      { $sort: { status: 1 } },
    ]);

    res.json({ success: true, data: result });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

/**
 * GET /api/v1/admin/fee-analysis/defaulters?limit=10
 * Students with the highest outstanding balances
 */
export const getDefaulters = async (req, res) => {
  try {
    const instituteId = req.user.institute;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);

    const defaulters = await StudentFee.find({
      institute: instituteId,
      status: { $in: ["unpaid", "partial"] },
      balance: { $gt: 0 },
    })
      .populate("student", "fullName email studentProfile.registrationNumber")
      .populate("class", "name")
      .sort({ balance: -1 })
      .limit(limit)
      .select("student class totalAmount balance status");

    res.json({ success: true, data: defaulters });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

/**
 * GET /api/v1/admin/fee-analysis/collection-trend
 * Monthly fee collection trend (last 12 months)
 */
export const getCollectionTrend = async (req, res) => {
  try {
    const instituteId = req.user.institute;

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const result = await StudentFee.aggregate([
      {
        $match: {
          institute: new mongoose.Types.ObjectId(instituteId),
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalBilled: { $sum: "$totalAmount" },
          totalCollected: { $sum: { $subtract: ["$totalAmount", "$balance"] } },
          totalOutstanding: { $sum: "$balance" },
          studentCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          totalBilled: 1,
          totalCollected: 1,
          totalOutstanding: 1,
          studentCount: 1,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);

    res.json({ success: true, data: result });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};
