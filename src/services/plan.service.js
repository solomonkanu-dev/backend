import * as repo from '../repositories/plan.repository.js';
import User from '../models/user.js';
import Class from '../models/Class.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/audit.js';
import { notify } from '../utils/notify.js';

export const getPlans = () => repo.findAll();

export const updatePlanLimits = async (planId, body) => {
  const plan = await repo.findByIdAndUpdate(planId, {
    limits: body.limits,
    ...(body.price !== undefined && { price: body.price }),
    ...(body.displayName !== undefined && { displayName: body.displayName }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  });

  if (!plan) throw new AppError('Plan not found', 404);
  return plan;
};

export const assignPlanToInstitute = async ({ instituteId, planName, expiryDate }, req) => {
  if (!instituteId || !planName) throw new AppError('instituteId and planName are required', 400);

  const plan = await repo.findByName(planName);
  if (!plan) throw new AppError(`Plan "${planName}" not found`, 404);

  const institute = await repo.updateInstituteWithPlan(instituteId, {
    plan: plan._id,
    planExpiry: expiryDate || null,
    subscription: { assignedAt: new Date(), assignedBy: req.user._id },
  });

  if (!institute) throw new AppError('Institute not found', 404);

  logAudit(req, {
    action: 'ASSIGN_PLAN',
    entity: 'Institute',
    entityId: institute._id,
    description: `Assigned plan "${planName}" to institute "${institute.name}"`,
    statusCode: 200,
  });

  const admin = await User.findOne({ institute: institute._id, role: 'admin' }, '_id');
  if (admin) {
    notify({
      recipientId: admin._id,
      instituteId: institute._id,
      type: 'plan_assigned',
      title: 'Plan Updated',
      message: `Your institute has been assigned the ${planName} plan`,
      relatedEntity: { entityType: 'Institute', entityId: institute._id },
    });
  }

  return institute;
};

export const getMyPlan = async (user, queryInstituteId) => {
  let instituteId;

  if (user.role === 'super_admin') {
    if (!queryInstituteId) throw new AppError('instituteId query param required for super admin', 400);
    instituteId = queryInstituteId;
  } else {
    instituteId = user.institute?._id || user.institute;
    if (!instituteId) throw new AppError('No institute associated with your account', 400);
  }

  const institute = await repo.findInstituteById(instituteId);
  if (!institute) throw new AppError('Institute not found', 404);

  let plan = institute.plan;
  if (!plan) plan = await repo.findByName('free');

  const [studentCount, lecturerCount, classCount] = await Promise.all([
    User.countDocuments({ institute: instituteId, role: 'student' }),
    User.countDocuments({ institute: instituteId, role: 'lecturer' }),
    Class.countDocuments({ institute: instituteId }),
  ]);

  return {
    plan,
    planExpiry: institute.planExpiry,
    subscription: institute.subscription,
    usage: {
      students: { current: studentCount, max: plan?.limits?.maxStudents },
      lecturers: { current: lecturerCount, max: plan?.limits?.maxLecturers },
      classes: { current: classCount, max: plan?.limits?.maxClasses },
    },
  };
};
