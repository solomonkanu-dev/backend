import StudentFee from '../models/StudentFee.js';
import FeeStructure from '../models/FeeStructure.js';

export const findStructuresForStudent = (instituteId, classId, studentId) =>
  FeeStructure.find({
    instituteId,
    $or: [
      { category: 'all' },
      { category: 'class', classId },
      { category: 'student', studentId },
    ],
  });

export const findOneStudentFee = (studentId, instituteId) =>
  StudentFee.findOne({ student: studentId, institute: instituteId });

export const createStudentFee = (data, session = null) => {
  const createOpts = session ? { session } : {};
  return StudentFee.create([data], createOpts).then(docs => docs[0]);
};

export const findStudentsWithFees = (instituteId) =>
  StudentFee.find({ institute: instituteId })
    .populate('student', 'fullName email')
    .populate('class', 'name')
    .sort({ createdAt: -1 });

export const findFeesForStudent = (studentId, instituteId) =>
  StudentFee.find({ student: studentId, institute: instituteId })
    .populate('student', 'fullName email')
    .populate('class', 'name');

export const findStudentFeesByFilter = (filter) =>
  StudentFee.find(filter).populate('class', 'name').lean();

export const updateStudentFeeById = (id, update, session = null) => {
  const opts = { new: true, ...(session ? { session } : {}) };
  return StudentFee.findByIdAndUpdate(id, update, opts);
};
