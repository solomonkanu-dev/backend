import * as superAdminService from '../services/superAdmin.service.js';

export const superAdminLogin = async (req, res, next) => {
  try {
    const result = await superAdminService.superAdminLogin(req.body);
    res.json({ message: 'Super admin login successful', ...result });
  } catch (err) {
    next(err);
  }
};

export const approveAdmin = async (req, res, next) => {
  try {
    await superAdminService.approveAdmin(req.params.adminId, req);
    res.json({ message: 'User approved successfully' });
  } catch (err) {
    next(err);
  }
};

export const getPendingAdmins = async (req, res, next) => {
  try {
    const data = await superAdminService.getPendingAdmins();
    res.status(200).json({ message: 'Pending admin requests', total: data.length, data });
  } catch (err) {
    next(err);
  }
};

export const getSystemStats = async (req, res, next) => {
  try {
    const data = await superAdminService.getSystemStats();
    res.status(200).json({ message: 'System statistics', data });
  } catch (err) {
    next(err);
  }
};

export const getAllInstitutes = async (req, res, next) => {
  try {
    const data = await superAdminService.getAllInstitutes();
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

export const getAllAdmins = async (req, res, next) => {
  try {
    const data = await superAdminService.getAllAdmins();
    res.status(200).json({ success: true, total: data.length, data });
  } catch (err) {
    next(err);
  }
};

export const suspendAdmin = async (req, res, next) => {
  try {
    await superAdminService.suspendAdmin(req.params.adminId, req);
    res.json({ success: true, message: 'Admin account suspended successfully' });
  } catch (err) {
    next(err);
  }
};

export const unsuspendAdmin = async (req, res, next) => {
  try {
    await superAdminService.unsuspendAdmin(req.params.adminId, req);
    res.json({ success: true, message: 'Admin account unsuspended successfully' });
  } catch (err) {
    next(err);
  }
};

export const getSystemOverview = async (req, res, next) => {
  try {
    const data = await superAdminService.getSystemOverview();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getInstituteHealthReport = async (req, res, next) => {
  try {
    const data = await superAdminService.getInstituteHealthReport();
    res.json({ success: true, total: data.length, data });
  } catch (err) {
    next(err);
  }
};

export const getGrowthTrends = async (req, res, next) => {
  try {
    const data = await superAdminService.getGrowthTrends(req.query.months);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getFeeRevenueReport = async (req, res, next) => {
  try {
    const data = await superAdminService.getFeeRevenueReport();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSalaryExpenditureReport = async (req, res, next) => {
  try {
    const data = await superAdminService.getSalaryExpenditureReport();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getInstituteDeepReport = async (req, res, next) => {
  try {
    const data = await superAdminService.getInstituteDeepReport(req.params.instituteId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const setAdminUnderReview = async (req, res, next) => {
  try {
    const data = await superAdminService.setAdminUnderReview(
      req.params.adminId,
      req.body.note || '',
      req
    );
    res.json({ success: true, message: 'Admin set to under review', data });
  } catch (err) {
    next(err);
  }
};

export const approveAdminOnboarding = async (req, res, next) => {
  try {
    const data = await superAdminService.approveAdminOnboarding(
      req.params.adminId,
      req.body.note || '',
      req
    );
    res.json({ success: true, message: 'Admin onboarding approved', data });
  } catch (err) {
    next(err);
  }
};

export const rejectAdminOnboarding = async (req, res, next) => {
  try {
    const data = await superAdminService.rejectAdminOnboarding(
      req.params.adminId,
      req.body.rejectionReason,
      req
    );
    res.json({ success: true, message: 'Admin onboarding rejected', data });
  } catch (err) {
    next(err);
  }
};

export const getAdminOnboardingList = async (req, res, next) => {
  try {
    const result = await superAdminService.getAdminOnboardingList(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getAdminOnboardingDetail = async (req, res, next) => {
  try {
    const data = await superAdminService.getAdminOnboardingDetail(req.params.adminId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getInstituteById = async (req, res, next) => {
  try {
    const data = await superAdminService.getInstituteById(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
