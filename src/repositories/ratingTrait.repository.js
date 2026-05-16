import RatingTrait from '../models/RatingTrait.js';

export const create = (data) => RatingTrait.create(data);

export const insertMany = (docs) => RatingTrait.insertMany(docs);

export const findByInstitute = (instituteId, domain) => {
  const filter = { institute: instituteId };
  if (domain) filter.domain = domain;
  return RatingTrait.find(filter).sort({ domain: 1, order: 1, name: 1 });
};

export const findById = (id, instituteId) =>
  RatingTrait.findOne({ _id: id, institute: instituteId });

export const countByInstitute = (instituteId) =>
  RatingTrait.countDocuments({ institute: instituteId });

export const save = (doc) => doc.save();

export const deleteOne = (doc) => doc.deleteOne();
