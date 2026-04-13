import User from '../models/user.js';
import Institute from '../models/Institute.js';
import Plan from '../models/Plan.js';
import Class from '../models/Class.js';
import { cacheGet, cacheSet } from '../utils/cache.js';

const roleMap = { students: 'student', lecturers: 'lecturer' };
const limitKeyMap = { students: 'maxStudents', lecturers: 'maxLecturers', classes: 'maxClasses' };

const PLAN_TTL = 300; // 5 minutes — plan limits change rarely

const getPlanLimits = async (instituteId) => {
  const cacheKey = `institute:plan:${instituteId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const institute = await Institute.findById(instituteId).populate('plan');
  let plan = institute?.plan;
  if (!plan) plan = await Plan.findOne({ name: 'free' });
  if (!plan) return null;

  const limits = plan.limits;
  await cacheSet(cacheKey, limits, PLAN_TTL);
  return limits;
};

export const enforcePlanLimits = (resourceType) => async (req, res, next) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;

    if (!instituteId) {
      return res.status(400).json({ success: false, message: 'Institute required' });
    }

    const limits = await getPlanLimits(instituteId);

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

    if (count >= limit) {
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
