import Timetable from '../models/Timetable.js';

const populateTimetable = (query) =>
  query
    .populate('class', 'name')
    .populate('entries.subject', 'name')
    .populate('entries.lecturer', 'fullName');

export const findByClass = (classId, institute) =>
  populateTimetable(Timetable.findOne({ class: classId, institute }));

export const findByInstitute = (institute) =>
  populateTimetable(Timetable.find({ institute }));

export const upsertByClass = (classId, institute, entries) =>
  populateTimetable(
    Timetable.findOneAndUpdate(
      { class: classId, institute },
      { entries },
      { new: true, upsert: true, runValidators: true }
    )
  );

export const updateById = (id, institute, entries) =>
  populateTimetable(
    Timetable.findOneAndUpdate(
      { _id: id, institute },
      { entries },
      { new: true, runValidators: true }
    )
  );

export const deleteById = (id, institute) =>
  Timetable.findOneAndDelete({ _id: id, institute });
