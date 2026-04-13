import * as submissionService from '../services/submission.service.js';

export const submitAssignment = async (req, res, next) => {
  try {
    const submission = await submissionService.submitAssignment(req.body, req.user);
    res.status(201).json({
      message: submission.isLate
        ? 'Assignment submitted (late)'
        : 'Assignment submitted successfully',
      submission,
    });
  } catch (err) {
    next(err);
  }
};

export const gradeSubmission = async (req, res, next) => {
  try {
    const submission = await submissionService.gradeSubmission(
      req.params.submissionId,
      req.body,
      req.user
    );
    res.json({ message: 'Submission graded', submission });
  } catch (err) {
    next(err);
  }
};

export const getSubmissionsForAssignment = async (req, res, next) => {
  try {
    const data = await submissionService.getSubmissionsForAssignment(
      req.params.assignmentId,
      req.user
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const resubmitAssignment = async (req, res, next) => {
  try {
    const submission = await submissionService.resubmitAssignment(
      req.params.submissionId,
      req.body,
      req.user
    );
    res.json({ message: 'Assignment resubmitted successfully', submission });
  } catch (err) {
    next(err);
  }
};

export const getMySubmissions = async (req, res, next) => {
  try {
    const data = await submissionService.getMySubmissions(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
