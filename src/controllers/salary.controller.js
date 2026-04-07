import * as salaryService from '../services/salary.service.js';

export const addSalary = async (req, res, next) => {
  try {
    const data = await salaryService.addSalary(req.body, req.user);
    res.status(201).json({ message: 'Salary record created successfully', data });
  } catch (err) {
    next(err);
  }
};

export const getAllSalaries = async (req, res, next) => {
  try {
    const result = await salaryService.getAllSalaries(req.query, req.user);
    res.json({ statusCode: 200, ...result });
  } catch (err) {
    next(err);
  }
};

export const getLecturerSalaries = async (req, res, next) => {
  try {
    const result = await salaryService.getLecturerSalaries(
      req.params.lecturerId,
      req.query,
      req.user
    );
    res.json({ statusCode: 200, ...result });
  } catch (err) {
    next(err);
  }
};

export const getSalaryById = async (req, res, next) => {
  try {
    const data = await salaryService.getSalaryById(req.params.id, req.user);
    res.json({ statusCode: 200, data });
  } catch (err) {
    next(err);
  }
};

export const updateSalary = async (req, res, next) => {
  try {
    const data = await salaryService.updateSalary(req.params.id, req.body, req.user);
    res.json({ message: 'Salary record updated successfully', data });
  } catch (err) {
    next(err);
  }
};

export const markAsPaid = async (req, res, next) => {
  try {
    const data = await salaryService.markAsPaid(req.params.id, req.user);
    res.json({ message: 'Salary marked as paid', data });
  } catch (err) {
    next(err);
  }
};

export const getMonthlySalarySummary = async (req, res, next) => {
  try {
    const result = await salaryService.getMonthlySalarySummary(
      req.params.salaryMonth,
      req.user
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const deleteSalary = async (req, res, next) => {
  try {
    await salaryService.deleteSalary(req.params.id, req.user);
    res.json({ message: 'Salary record deleted successfully' });
  } catch (err) {
    next(err);
  }
};
