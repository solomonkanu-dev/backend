import * as repo from '../repositories/calendar.repository.js';
import { AppError } from '../errors/AppError.js';

export const getCalendarEvents = (institute) => repo.findByInstitute(institute);

export const createCalendarEvent = async ({ institute, title, description, startDate, endDate, type }, userId) => {
  if (!title || !startDate || !endDate) throw new AppError('title, startDate, and endDate are required', 400);

  return repo.createEvent({
    title, description, startDate, endDate,
    type: type || 'event',
    institute,
    createdBy: userId,
  });
};

export const updateCalendarEvent = async (id, institute, { title, description, startDate, endDate, type }) => {
  const event = await repo.findById(id, institute);
  if (!event) throw new AppError('Event not found', 404);

  if (title !== undefined) event.title = title;
  if (description !== undefined) event.description = description;
  if (startDate !== undefined) event.startDate = startDate;
  if (endDate !== undefined) event.endDate = endDate;
  if (type !== undefined) event.type = type;

  await event.save();
  return event;
};

export const deleteCalendarEvent = async (id, institute) => {
  const event = await repo.deleteById(id, institute);
  if (!event) throw new AppError('Event not found', 404);
};
