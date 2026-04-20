import * as classService from '../services/class.service.js';

export const createClass = async (req, res, next) => {
  try {
    const newClass = await classService.createClass(req.body, req.user);
    res.status(201).json({ message: 'Class created successfully', class: newClass });
  } catch (err) {
    next(err);
  }
};

export const addStudentToClass = async (req, res, next) => {
  try {
    const classData = await classService.addStudentToClass(req.body, req.user);
    res.status(200).json({ message: 'Student added to class', class: classData });
  } catch (err) {
    next(err);
  }
};

export const getLecturerClasses = async (req, res, next) => {
  try {
    const data = await classService.getLecturerClasses(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getStudentClasses = async (req, res, next) => {
  try {
    const data = await classService.getStudentClasses(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getInstituteClasses = async (req, res, next) => {
  try {
    const data = await classService.getInstituteClasses(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getClasses = async (req, res, next) => {
  try {
    const data = await classService.getClasses(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getClassById = async (req, res, next) => {
  try {
    const data = await classService.getClassById(req.params.id, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const assignLecturerToClass = async (req, res, next) => {
  try {
    const singleClass = await classService.assignLecturerToClass(req.body, req.user);
    res.json({ message: 'Lecturer assigned to class successfully', class: singleClass });
  } catch (err) {
    next(err);
  }
};

export const getClassesWithSubjectSummary = async (req, res, next) => {
  try {
    const result = await classService.getClassesWithSubjectSummary(req.user);
    res.status(200).json({ statusCode: 200, count: result.length, classes: result });
  } catch (err) {
    next(err);
  }
};

export const getStudentByClass = async (req, res, next) => {
  try {
    const { classInfo, students } = await classService.getStudentByClass(
      req.params.classId,
      req.user
    );
    res.status(200).json({
      statusCode: 200,
      class: classInfo,
      count: students.length,
      students,
    });
  } catch (err) {
    next(err);
  }
};

export const updateClass = async (req, res, next) => {
  try {
    const updated = await classService.updateClass(req.params.classId, req.body, req.user);
    res.json({ message: "Class updated successfully", class: updated });
  } catch (err) {
    next(err);
  }
};
