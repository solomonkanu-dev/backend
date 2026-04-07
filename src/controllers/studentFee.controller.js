import * as studentFeeService from '../services/studentFee.service.js';

export const getStructuresForStudent = async (req, res, next) => {
  try {
    const structures = await studentFeeService.getStructuresForStudent(req.params.studentId);
    res.json({ structures });
  } catch (err) {
    next(err);
  }
};

export const assignFeeToStudent = async (req, res, next) => {
  try {
    const studentFee = await studentFeeService.assignFeeToStudent(req.body);
    res.status(201).json({ message: 'Student fees generated successfully', studentFee });
  } catch (err) {
    next(err);
  }
};

export const getStudentsWithFees = async (req, res, next) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;
    const data = await studentFeeService.getStudentsWithFees(instituteId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getFeesForStudent = async (req, res, next) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;
    const data = await studentFeeService.getFeesForStudent(req.params.studentId, instituteId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
