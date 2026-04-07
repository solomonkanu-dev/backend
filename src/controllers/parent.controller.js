import * as parentService from '../services/parent.service.js';

export const getMyChildren = async (req, res, next) => {
  try {
    const data = await parentService.getMyChildren(req.user.linkedStudents);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getChildAttendance = async (req, res, next) => {
  try {
    const result = await parentService.getChildAttendance(
      req.params.studentId,
      req.query.classId,
      req.user
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getChildResults = async (req, res, next) => {
  try {
    const result = await parentService.getChildResults(
      req.params.studentId,
      req.query.classId,
      req.user
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getChildPromotionHistory = async (req, res, next) => {
  try {
    const result = await parentService.getChildPromotionHistory(
      req.params.studentId,
      req.user
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getChildFees = async (req, res, next) => {
  try {
    const data = await parentService.getChildFees(req.params.studentId, req.user);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getAnnouncements = async (req, res, next) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;
    const data = await parentService.getAnnouncements(instituteId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};
