import * as repo from '../repositories/plan.repository.js';
import User from '../models/user.js';
import Class from '../models/Class.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/audit.js';
import { notify } from '../utils/notify.js';
import * as monime from './monime.service.js';

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

export const getAvailablePlans = () => repo.findAll();

export const createCheckout = async (planId, user, frontendBaseUrl) => {
  const plan = await repo.findById(planId);
  if (!plan) throw new AppError('Plan not found', 404);
  if (plan.name === 'free') throw new AppError('Free plan does not require payment', 400);
  if (!plan.price || plan.price <= 0) throw new AppError('This plan has no price configured', 400);

  const instituteId = (user.institute?._id || user.institute)?.toString();
  if (!instituteId) throw new AppError('No institute associated with your account', 400);

  const reference = `inst-${instituteId}-plan-${plan._id}-${Date.now()}`;
  const priceInMinorUnits = Math.round(plan.price * 100);

  const session = await monime.createCheckoutSession({
    name: plan.displayName || plan.name,
    priceInMinorUnits,
    currency: 'SLE',
    successUrl: `${frontendBaseUrl}/admin/plan/success`,
    cancelUrl: `${frontendBaseUrl}/admin/plan/cancel`,
    reference,
    metadata: {
      planId: plan._id.toString(),
      instituteId,
      planName: plan.name,
    },
  });

  return { checkoutUrl: session.redirectUrl, sessionId: session.id };
};

export const verifyAndActivatePlan = async (sessionId, user) => {
  const session = await monime.getCheckoutSession(sessionId);

  if (session.status !== 'completed') {
    throw new AppError(`Payment not completed. Status: ${session.status}`, 400);
  }

  const { planId, instituteId } = session.metadata || {};
  if (!planId || !instituteId) throw new AppError('Invalid session metadata', 400);

  const userInstituteId = (user.institute?._id || user.institute)?.toString();
  if (userInstituteId !== instituteId) throw new AppError('Unauthorized', 403);

  const plan = await repo.findById(planId);
  if (!plan) throw new AppError('Plan not found', 404);

  const planExpiry = new Date();
  planExpiry.setMonth(planExpiry.getMonth() + 1);

  const institute = await repo.updateInstituteWithPlan(instituteId, {
    plan: plan._id,
    planExpiry,
    subscription: { assignedAt: new Date(), assignedBy: user._id },
  });

  notify({
    recipientId: user._id,
    instituteId,
    type: 'plan_assigned',
    title: 'Plan Activated',
    message: `Your ${plan.displayName || plan.name} plan is now active. Expires ${planExpiry.toDateString()}.`,
    relatedEntity: { entityType: 'Institute', entityId: instituteId },
  });

  return { plan, planExpiry, institute };
};

export const handleWebhookEvent = async (event) => {
  const { type, data } = event;

  if (type !== 'checkout_session.completed') return;

  const { planId, instituteId } = data?.metadata || {};
  if (!planId || !instituteId) return;

  const plan = await repo.findById(planId);
  if (!plan) return;

  const planExpiry = new Date();
  planExpiry.setMonth(planExpiry.getMonth() + 1);

  await repo.updateInstituteWithPlan(instituteId, {
    plan: plan._id,
    planExpiry,
    subscription: { assignedAt: new Date() },
  });

  const admin = await User.findOne({ institute: instituteId, role: 'admin' }, '_id');
  if (admin) {
    notify({
      recipientId: admin._id,
      instituteId,
      type: 'plan_assigned',
      title: 'Plan Activated',
      message: `Your ${plan.displayName || plan.name} plan is now active. Expires ${planExpiry.toDateString()}.`,
      relatedEntity: { entityType: 'Institute', entityId: instituteId },
    });
  }
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
