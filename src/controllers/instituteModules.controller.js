import * as service from '../services/instituteModules.service.js';

export const getModules = async (req, res, next) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;
    const data = await service.getModules(instituteId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const updateModules = async (req, res, next) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;
    const data = await service.updateModules(instituteId, req.body.modules ?? {}, req);
    res.json({ message: 'Module toggles updated', data });
  } catch (err) {
    next(err);
  }
};

export const getLecturerAccess = async (req, res, next) => {
  try {
    const data = await service.getLecturerModuleAccess(req.params.lecturerId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const setLecturerAccess = async (req, res, next) => {
  try {
    const data = await service.setLecturerModuleAccess(
      req.params.lecturerId,
      req.body.moduleAccess ?? [],
      req
    );
    res.json({ message: 'Lecturer module access updated', data });
  } catch (err) {
    next(err);
  }
};
