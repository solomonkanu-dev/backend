import { AppError } from '../errors/AppError.js';
import * as classRepo from '../repositories/class.repository.js';

export const createClass = async (body, user) => {
  if (user.role !== 'admin') throw new AppError('Access denied', 403);

  const { name, lecturerId } = body;
  
  // Validate that name is not empty or whitespace-only
  const trimmedName = name && name.trim();
  if (!trimmedName || !lecturerId) throw new AppError('All fields are required', 400);

  const lecturer = await classRepo.findLecturer(lecturerId, user.institute);
  if (!lecturer) throw new AppError('Lecturer not found', 404);

  return classRepo.create({ name: trimmedName, lecturer: lecturer._id, institute: user.institute });
};

export const addStudentToClass = async (body, user) => {
  if (user.role !== 'admin') throw new AppError('Access denied', 403);

  const { classId, studentId } = body;

  const { default: User } = await import('../models/user.js');
  const student = await User.findOne({ _id: studentId, role: 'student', institute: user.institute });
  if (!student) throw new AppError('Student not found', 404);

  const classData = await classRepo.findOne({ _id: classId, institute: user.institute });
  if (!classData) throw new AppError('Class not found', 404);

  if (classData.students.some((s) => s.toString() === studentId.toString())) {
    throw new AppError('Student already in class', 400);
  }

  classData.students.push(studentId);
  return classRepo.save(classData);
};

export const getLecturerClasses = async (user) =>
  classRepo.findByLecturer(user.id);

export const getStudentClasses = async (user) =>
  classRepo.findByStudent(user.id);

export const getInstituteClasses = async (user) =>
  classRepo.findByInstitute(user.institute);

export const getClasses = async (user) =>
  classRepo.findByInstituteWithLecturer(user.institute);

export const getClassById = async (id, user) => {
  const instituteId = user.institute?._id || user.institute;
  const singleClass = await classRepo.findByIdWithDetails(id, instituteId);
  if (!singleClass) throw new AppError('Class not found', 404);
  return singleClass;
};

export const updateClass = async (classId, { name, lecturerId }, user) => {
  if (user.role !== 'admin') throw new AppError('Access denied', 403);

  const instituteId = user.institute?._id || user.institute;
  const singleClass = await classRepo.findOne({ _id: classId, institute: instituteId });
  if (!singleClass) throw new AppError('Class not found', 404);

  // Validate and trim class name: reject whitespace-only or empty strings
  if (name) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new AppError('Class name cannot be empty or whitespace-only', 400);
    }
    singleClass.name = trimmedName;
  }

  if (lecturerId) {
    const lecturer = await classRepo.findLecturer(lecturerId, instituteId);
    if (!lecturer) throw new AppError('Lecturer not found', 404);
    singleClass.lecturer = lecturer._id;
  }

  return classRepo.save(singleClass);
};

export const assignLecturerToClass = async (body, user) => {
  if (user.role !== 'admin') throw new AppError('Access denied', 403);

  const { classId, lecturerId } = body;

  const singleClass = await classRepo.findById(classId);
  if (!singleClass) throw new AppError('Class not found', 404);

  const lecturer = await classRepo.findLecturer(lecturerId, singleClass.institute || user.institute);
  if (!lecturer) throw new AppError('Lecturer not found', 404);

  singleClass.lecturer = lecturer._id;
  return classRepo.save(singleClass);
};

export const getClassesWithSubjectSummary = async (user) => {
  if (!['admin', 'lecturer'].includes(user.role)) {
    throw new AppError('Access denied', 403);
  }

  const instituteId = user.institute?._id || user.institute;
  const classes = await classRepo.findByInstituteWithSubjectSummary(instituteId);
  const subjects = await classRepo.findSubjectsByInstitute(instituteId);

  const subjectMap = {};
  subjects.forEach((subject) => {
    const cid = subject.class.toString();
    if (!subjectMap[cid]) subjectMap[cid] = [];
    subjectMap[cid].push(subject);
  });

  return classes.map((cls) => {
    const classSubjects = subjectMap[cls._id.toString()] || [];
    const totalSubjects = classSubjects.length;
    const totalMale = cls.students.filter(
      (s) => s.studentProfile?.gender?.toLowerCase() === 'male'
    ).length;
    const totalFemale = cls.students.filter(
      (s) => s.studentProfile?.gender?.toLowerCase() === 'female'
    ).length;

    return {
      ...cls,
      totalSubjects,
      totalMale,
      totalFemale,
      totalStudents: cls.students.length,
      subjects: classSubjects.map((s) => ({ id: s._id, name: s.name, totalMarks: s.totalMarks })),
      students: cls.students.map((s) => ({ _id: s._id, fullName: s.fullName, email: s.email })),
    };
  });
};

export const getStudentByClass = async (classId, user) => {
  if (!classId) throw new AppError('classId is required', 400);

  const classData = await classRepo.findOne({ _id: classId, institute: user.institute });
  if (!classData) throw new AppError('Class not found', 404);

  // Re-fetch with populated students
  const populated = await classRepo.findByIdWithDetails(classId, user.institute?._id || user.institute);
  const students = (populated?.students ?? []).map((student) => ({
    _id: student._id,
    fullName: student.fullName,
    email: student.email,
    registrationNumber: student.studentProfile?.registrationNumber,
    dateOfAdmission: student.studentProfile?.dateOfAdmission,
    dateOfBirth: student.studentProfile?.dateOfBirth,
    gender: student.studentProfile?.gender,
    mobileNumber: student.studentProfile?.mobileNumber,
    address: student.studentProfile?.address,
    bloodGroup: student.studentProfile?.bloodGroup,
    profilePhoto: student.profilePhoto,
    isActive: student.isActive,
  }));

  return { classInfo: { _id: populated._id, name: populated.name }, students };
};
