import Plan from '../models/Plan.js';
import Institute from '../models/Institute.js';

export const findAll = () => Plan.find().sort({ price: 1 });

export const findById = (id) => Plan.findById(id);

export const findByIdAndUpdate = (id, update) =>
  Plan.findByIdAndUpdate(id, update, { new: true });

export const findByName = (name) => Plan.findOne({ name });

export const updateInstituteWithPlan = (instituteId, update) =>
  Institute.findByIdAndUpdate(instituteId, update, { new: true }).populate('plan');

export const findInstituteById = (id) => Institute.findById(id).populate('plan');
