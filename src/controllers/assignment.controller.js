import * as assignmentService from '../services/assignment.service.js';

export const createAssignment = async (req, res, next) => {
  try {
    const assignment = await assignmentService.createAssignment(req.body, req.user);
    res.status(201).json({ message: 'Assignment created successfully', assignment });
  } catch (err) {
    next(err);
  }
};

export const getAssignmentsBySubject = async (req, res, next) => {
  try {
    const data = await assignmentService.getAssignmentsBySubject(
      req.params.subjectId,
      req.user
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getAssignmentsByClass = async (req, res, next) => {
  try {
    const data = await assignmentService.getAssignmentsByClass(
      req.params.classId,
      req.user
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getMyAssignments = async (req, res, next) => {
  try {
    const data = await assignmentService.getMyAssignments(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getAssignmentById = async (req, res, next) => {
  try {
    const data = await assignmentService.getAssignmentById(req.params.id, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const updateAssignment = async (req, res, next) => {
  try {
    const assignment = await assignmentService.updateAssignment(
      req.params.id,
      req.body,
      req.user
    );
    res.json({ message: 'Assignment updated', assignment });
  } catch (err) {
    next(err);
  }
};

export const deleteAssignment = async (req, res, next) => {
  try {
    await assignmentService.deleteAssignment(req.params.id, req.user);
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    next(err);
  }
};
