import * as calendarService from '../services/calendar.service.js';

export const getCalendarEvents = async (req, res, next) => {
  try {
    const events = await calendarService.getCalendarEvents(req.user.institute);
    res.json({ data: events });
  } catch (err) {
    next(err);
  }
};

export const createCalendarEvent = async (req, res, next) => {
  try {
    const event = await calendarService.createCalendarEvent({ institute: req.user.institute, ...req.body }, req.user._id);
    res.status(201).json({ message: 'Event created', data: event });
  } catch (err) {
    next(err);
  }
};

export const updateCalendarEvent = async (req, res, next) => {
  try {
    const event = await calendarService.updateCalendarEvent(req.params.id, req.user.institute, req.body);
    res.json({ message: 'Event updated', data: event });
  } catch (err) {
    next(err);
  }
};

export const deleteCalendarEvent = async (req, res, next) => {
  try {
    await calendarService.deleteCalendarEvent(req.params.id, req.user.institute);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
};
