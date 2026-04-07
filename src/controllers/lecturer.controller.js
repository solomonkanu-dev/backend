import * as lecturerService from '../services/lecturer.service.js';

export const getLecturerDashboard = (req, res) => {
  res.json({ message: 'Lecturer dashboard not yet implemented' });
};

export const getLecturers = async (req, res, next) => {
  try {
    const data = await lecturerService.getLecturers(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getLecturerById = async (req, res, next) => {
  try {
    const data = await lecturerService.getLecturerById(req.params.id, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getMyClasses = async (req, res, next) => {
  try {
    const data = await lecturerService.getMyClasses(req.user);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getLecturerPromotionEligibility = async (req, res, next) => {
  try {
    const data = await lecturerService.getLecturerPromotionEligibility(
      req.params.classId,
      req.query,
      req.user
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const lecturerBulkPromote = async (req, res, next) => {
  try {
    const result = await lecturerService.lecturerBulkPromote(req.body, req);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};
