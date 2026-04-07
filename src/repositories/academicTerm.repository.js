import AcademicTerm from '../models/AcademicTerm.js';

export const findByInstitute = (institute) =>
  AcademicTerm.find({ institute }).sort({ academicYear: -1, startDate: -1 });

export const findOneByInstitute = (termId, institute) =>
  AcademicTerm.findOne({ _id: termId, institute });

export const createTerm = (data) => AcademicTerm.create(data);

export const clearCurrentTerms = (institute) =>
  AcademicTerm.updateMany({ institute }, { isCurrent: false });

export const clearCurrentTermsExcept = (institute, termId) =>
  AcademicTerm.updateMany({ institute, _id: { $ne: termId } }, { isCurrent: false });

export const deleteByIdAndInstitute = (termId, institute) =>
  AcademicTerm.findOneAndDelete({ _id: termId, institute });
