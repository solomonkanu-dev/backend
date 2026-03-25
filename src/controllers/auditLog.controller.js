import AuditLog from "../models/AuditLog.js";
import mongoose from "mongoose";

const isDev = process.env.NODE_ENV === "development";

/**
 * GET /api/v1/audit-logs
 * - Super admin: sees all logs, can filter by institute
 * - Admin: sees only their institute's logs
 *
 * Query params:
 *   page, limit, action, role, userId, instituteId (super admin only),
 *   startDate, endDate, entity
 */
export const getAuditLogs = async (req, res) => {
  try {
    const { role } = req.user;
    const {
      page = 1,
      limit = 50,
      action,
      userRole,
      userId,
      instituteId,
      startDate,
      endDate,
      entity,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const lim = Math.min(parseInt(limit) || 50, 200);
    const skip = (pageNum - 1) * lim;

    const filter = {};

    // Scope: admin is locked to their own institute
    if (role === "admin") {
      const adminInstituteId = req.user.institute?._id || req.user.institute;
      filter.institute = adminInstituteId;
    } else if (role === "super_admin" && instituteId) {
      if (!mongoose.Types.ObjectId.isValid(instituteId)) {
        return res.status(400).json({ success: false, message: "Invalid institute ID" });
      }
      filter.institute = new mongoose.Types.ObjectId(instituteId);
    }

    if (action) filter.action = { $regex: action, $options: "i" };
    if (userRole) filter.role = userRole;
    if (entity) filter.entity = { $regex: entity, $options: "i" };

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: "Invalid user ID" });
      }
      filter.user = new mongoose.Types.ObjectId(userId);
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("user", "fullName email role")
        .populate("institute", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: lim,
        total,
        pages: Math.ceil(total / lim),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

/**
 * GET /api/v1/audit-logs/summary
 * Breakdown of actions by type and by user role for quick monitoring
 */
export const getAuditSummary = async (req, res) => {
  try {
    const { role } = req.user;

    const matchFilter = {};
    if (role === "admin") {
      matchFilter.institute = req.user.institute?._id || req.user.institute;
    }

    const [byAction, byRole, recentActivity] = await Promise.all([
      AuditLog.aggregate([
        { $match: matchFilter },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, action: "$_id", count: 1 } },
        { $limit: 20 },
      ]),
      AuditLog.aggregate([
        { $match: matchFilter },
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $project: { _id: 0, role: "$_id", count: 1 } },
      ]),
      AuditLog.find(matchFilter)
        .populate("user", "fullName email")
        .populate("institute", "name")
        .sort({ createdAt: -1 })
        .limit(10)
        .select("action entity description userFullName role createdAt institute"),
    ]);

    res.json({ success: true, data: { byAction, byRole, recentActivity } });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

/**
 * GET /api/v1/audit-logs/user/:userId
 * All actions performed by a specific user
 * - Admin: only if the user belongs to their institute
 * - Super admin: unrestricted
 */
export const getUserAuditLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.user;
    const pageNum = Math.max(1, parseInt(req.query.page) || 1);
    const lim = Math.min(parseInt(req.query.limit) || 50, 200);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const filter = { user: new mongoose.Types.ObjectId(userId) };

    if (role === "admin") {
      filter.institute = req.user.institute?._id || req.user.institute;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * lim)
        .limit(lim)
        .select("action entity description method path statusCode createdAt"),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page: pageNum, limit: lim, total, pages: Math.ceil(total / lim) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};
