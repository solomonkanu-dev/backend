import GradingScale from '../models/GradingScale.js';

export const create = (data) => GradingScale.create(data);

export const findByInstitute = (instituteId) =>
  GradingScale.find({ institute: instituteId })
    .populate('createdBy', 'fullName email')
    .sort({ isDefault: -1, createdAt: -1 });

export const findDefaultByInstitute = (instituteId) =>
  GradingScale.findOne({ institute: instituteId, isDefault: true });

export const findById = (id, instituteId) =>
  GradingScale.findOne({ _id: id, institute: instituteId })
    .populate('createdBy', 'fullName email');

export const unsetAllDefaults = (instituteId) =>
  GradingScale.updateMany({ institute: instituteId }, { isDefault: false });

export const unsetOtherDefaults = (instituteId, excludeId) =>
  GradingScale.updateMany(
    { institute: instituteId, _id: { $ne: excludeId } },
    { isDefault: false }
  );

export const save = (doc) => doc.save();

export const deleteOne = (doc) => doc.deleteOne();
