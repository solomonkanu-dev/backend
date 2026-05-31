import RuleBook from '../models/RuleBook.js';

export const findByInstitute = (instituteId) =>
  RuleBook.findOne({ institute: instituteId }).populate('updatedBy', 'fullName email');

export const upsertByInstitute = (instituteId, update) =>
  RuleBook.findOneAndUpdate(
    { institute: instituteId },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate('updatedBy', 'fullName email');
