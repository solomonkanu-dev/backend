import Theme from '../models/Theme.js';

export const createTheme = (data) => Theme.create(data);

export const findPaginated = (query, skip, limit) =>
  Theme.find(query)
    .populate('createdBy', 'fullName email')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

export const countDocuments = (query) => Theme.countDocuments(query);

export const findById = (id) => Theme.findById(id).populate('createdBy', 'fullName email');

export const findActive = (instituteId) =>
  Theme.findOne({ institute: instituteId, isActive: true });

export const deactivateOthers = (institute, excludeId) =>
  Theme.updateMany({ institute, _id: { $ne: excludeId } }, { isActive: false });
