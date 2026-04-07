import * as timetableService from '../services/timetable.service.js';

export const getTimetableByClass = async (req, res, next) => {
  try {
    const timetable = await timetableService.getTimetableByClass(
      req.params.classId,
      req.user.institute
    );
    res.json({ data: timetable });
  } catch (err) {
    next(err);
  }
};

export const getAllTimetables = async (req, res, next) => {
  try {
    const timetables = await timetableService.getAllTimetables(req.user.institute);
    res.json({ data: timetables });
  } catch (err) {
    next(err);
  }
};

export const createOrUpdateTimetable = async (req, res, next) => {
  try {
    const timetable = await timetableService.createOrUpdateTimetable(req.body, req.user.institute);
    res.json({ message: 'Timetable saved', data: timetable });
  } catch (err) {
    next(err);
  }
};

export const updateTimetable = async (req, res, next) => {
  try {
    const timetable = await timetableService.updateTimetable(
      req.params.id,
      req.body,
      req.user.institute
    );
    res.json({ message: 'Timetable updated', data: timetable });
  } catch (err) {
    next(err);
  }
};

export const deleteTimetable = async (req, res, next) => {
  try {
    await timetableService.deleteTimetable(req.params.id, req.user.institute);
    res.json({ message: 'Timetable deleted' });
  } catch (err) {
    next(err);
  }
};
