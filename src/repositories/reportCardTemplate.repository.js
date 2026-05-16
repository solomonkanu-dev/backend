import ReportCardTemplate from '../models/ReportCardTemplate.js';

export const create = (data) => ReportCardTemplate.create(data);

export const findByInstitute = (instituteId) =>
  ReportCardTemplate.find({ institute: instituteId })
    .populate('createdBy', 'fullName email')
    .sort({ isDefault: -1, createdAt: -1 });

export const findDefaultByInstitute = (instituteId) =>
  ReportCardTemplate.findOne({ institute: instituteId, isDefault: true });

export const findById = (id, instituteId) =>
  ReportCardTemplate.findOne({ _id: id, institute: instituteId })
    .populate('createdBy', 'fullName email');

export const unsetAllDefaults = (instituteId) =>
  ReportCardTemplate.updateMany({ institute: instituteId }, { isDefault: false });

export const unsetOtherDefaults = (instituteId, excludeId) =>
  ReportCardTemplate.updateMany(
    { institute: instituteId, _id: { $ne: excludeId } },
    { isDefault: false }
  );

export const save = (doc) => doc.save();

export const deleteOne = (doc) => doc.deleteOne();
