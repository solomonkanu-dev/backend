import User from '../models/user.js';
import Institute from '../models/Institute.js';
import Plan from '../models/Plan.js';
import Class from '../models/Class.js';

const roleMap = { students: 'student', lecturers: 'lecturer' };
const limitKeyMap = { students: 'maxStudents', lecturers: 'maxLecturers', classes: 'maxClasses' };

export const enforcePlanLimits = (resourceType) => async (req, res, next) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;

    if (!instituteId) {
      return res.status(400).json({ success: false, message: 'Institute required' });
    }

    const institute = await Institute.findById(instituteId).populate('plan');

    let plan = institute?.plan;
    if (!plan) {
      plan = await Plan.findOne({ name: 'free' });
    }

    if (!plan) {
      return next();
    }

    let count;
    if (resourceType === 'classes') {
      count = await Class.countDocuments({ institute: instituteId });
    } else {
      const role = roleMap[resourceType];
      count = await User.countDocuments({ institute: instituteId, role });
    }

    const limitKey = limitKeyMap[resourceType];
    const limit = plan.limits[limitKey];

    if (count >= limit) {
      return res.status(403).json({
        success: false,
        message: `Plan limit reached. Upgrade your plan to add more ${resourceType}.`,
        limit,
        current: count,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
