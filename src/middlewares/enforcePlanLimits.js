import User from '../models/user.js';
import Institute from '../models/Institute.js';
import Plan from '../models/Plan.js';
import Class from '../models/Class.js';

const roleMap = { students: 'student', lecturers: 'lecturer' };
const limitKeyMap = { students: 'maxStudents', lecturers: 'maxLecturers', classes: 'maxClasses' };

// Effective limits for an institute. For the paid 'standard' plan the student
// cap is what the institute paid for (Institute.subscription.studentsPaidFor),
// and an expired subscription falls back to the free tier.
const getEffectiveLimits = async (instituteId) => {
  const institute = await Institute.findById(instituteId).populate('plan');
  const freePlan = await Plan.findOne({ name: 'free' });

  const plan = institute?.plan;
  const expired =
    institute?.planExpiry && new Date(institute.planExpiry) < new Date();

  if (!plan || expired) {
    return freePlan?.limits || null;
  }

  const limits = { ...(plan.limits || {}) };
  if (plan.name === 'standard' && institute.subscription?.studentsPaidFor > 0) {
    limits.maxStudents = institute.subscription.studentsPaidFor;
  }
  return limits;
};

export const enforcePlanLimits = (resourceType) => async (req, res, next) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;

    if (!instituteId) {
      return res.status(400).json({ success: false, message: 'Institute required' });
    }

    const limits = await getEffectiveLimits(instituteId);

    if (!limits) return next();

    let count;
    if (resourceType === 'classes') {
      count = await Class.countDocuments({ institute: instituteId });
    } else {
      const role = roleMap[resourceType];
      count = await User.countDocuments({ institute: instituteId, role });
    }

    const limitKey = limitKeyMap[resourceType];
    const limit = limits[limitKey];

    if (limit !== undefined && count >= limit) {
      return res.status(403).json({
        success: false,
        message: `Plan limit reached. Contact service provider to Upgrade your plan to add more ${resourceType}.`,
        limit,
        current: count,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
