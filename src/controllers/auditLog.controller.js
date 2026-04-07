import * as auditLogService from '../services/auditLog.service.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { logs, pagination } = await auditLogService.getAuditLogs(req.user, req.query);
    res.json({ success: true, data: logs, pagination });
  } catch (err) {
    next(err);
  }
};

export const getAuditSummary = async (req, res, next) => {
  try {
    const data = await auditLogService.getAuditSummary(req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getUserAuditLogs = async (req, res, next) => {
  try {
    const { logs, pagination } = await auditLogService.getUserAuditLogs(req.user, req.params.userId, req.query);
    res.json({ success: true, data: logs, pagination });
  } catch (err) {
    next(err);
  }
};
