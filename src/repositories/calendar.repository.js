import CalendarEvent from '../models/CalendarEvent.js';

export const findByInstitute = (institute) =>
  CalendarEvent.find({ institute }).sort({ startDate: 1 });

export const findById = (id, institute) =>
  CalendarEvent.findOne({ _id: id, institute });

export const createEvent = (data) => CalendarEvent.create(data);

export const deleteById = (id, institute) =>
  CalendarEvent.findOneAndDelete({ _id: id, institute });
