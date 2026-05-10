import InstituteModules from '../models/InstituteModules.js';

export const findByInstitute = (instituteId) =>
  InstituteModules.findOne({ institute: instituteId }).lean();

export const createDefaults = (instituteId) =>
  InstituteModules.create({ institute: instituteId });

export const findOneAndUpdate = (instituteId, update) =>
  InstituteModules.findOneAndUpdate(
    { institute: instituteId },
    { $set: update },
    { new: true, upsert: true, runValidators: true }
  );

export const findAll = () => InstituteModules.find({}).lean();
