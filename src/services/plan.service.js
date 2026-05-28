import * as repo from '../repositories/plan.repository.js';
import User from '../models/user.js';
import Class from '../models/Class.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/audit.js';
import { notify } from '../utils/notify.js';
import * as monime from './monime.service.js';

// The single paid plan. Priced per student per term (Plan.price = per-student rate).
const PAID_PLAN_NAME = 'standard';

export const getPlans = () => repo.findAll();

export const createPlan = async (body, req) => {
  const { name, displayName, description, price, limits } = body ?? {};
  if (!name || typeof name !== 'string') throw new AppError('Plan name is required', 400);
  if (!limits || typeof limits !== 'object') throw new AppError('Plan limits are required', 400);

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) throw new AppError('Plan name is invalid', 400);

  const existing = await repo.findByName(slug);
  if (existing) throw new AppError(`Plan "${slug}" already exists`, 409);

  const plan = await repo.createPlan({
    name: slug,
    displayName: displayName?.trim() || slug,
    description: description?.trim() || undefined,
    price: Number(price) || 0,
    limits: {
      maxStudents: Number(limits.maxStudents) || 0,
      maxLecturers: Number(limits.maxLecturers) || 0,
      maxClasses: Number(limits.maxClasses) || 0,
    },
  });

  logAudit(req, {
    action: 'CREATE_PLAN',
    entity: 'Plan',
    entityId: plan._id,
    description: `Created plan "${plan.name}"`,
    statusCode: 201,
  });

  return plan;
};

export const deletePlan = async (planId, req) => {
  const plan = await repo.findById(planId);
  if (!plan) throw new AppError('Plan not found', 404);
  if (plan.name === 'free' || plan.name === 'standard') {
    throw new AppError('The built-in free and standard plans cannot be deleted', 400);
  }

  const inUse = await repo.countInstitutesOnPlan(planId);
  if (inUse > 0) {
    throw new AppError(`Cannot delete: ${inUse} institute(s) are on this plan`, 409);
  }

  await repo.deleteById(planId);

  logAudit(req, {
    action: 'DELETE_PLAN',
    entity: 'Plan',
    entityId: planId,
    description: `Deleted plan "${plan.name}"`,
    statusCode: 200,
  });
};

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

// ─── Billing summary ──────────────────────────────────────────────────────────
// Drives the admin checkout calculator: live student count, per-student rate,
// and the current academic term the subscription would cover.
export const getBillingSummary = async (user) => {
  const instituteId = (user.institute?._id || user.institute)?.toString();
  if (!instituteId) throw new AppError('No institute associated with your account', 400);

  const plan = await repo.findByName(PAID_PLAN_NAME);
  if (!plan) throw new AppError('Paid plan is not configured', 500);

  const [currentTerm, liveStudentCount] = await Promise.all([
    repo.findCurrentTerm(instituteId),
    repo.countStudents(instituteId),
  ]);

  return {
    liveStudentCount,
    pricePerStudent: plan.price,
    planId: plan._id,
    planName: plan.displayName || plan.name,
    currentTerm: currentTerm
      ? {
          id: currentTerm._id,
          name: currentTerm.name,
          academicYear: currentTerm.academicYear,
          endDate: currentTerm.endDate,
        }
      : null,
  };
};

// ─── Online checkout (card / mobile money via Monime) ─────────────────────────
export const createCheckout = async (studentCountInput, user, frontendBaseUrl) => {
  const instituteId = (user.institute?._id || user.institute)?.toString();
  if (!instituteId) throw new AppError('No institute associated with your account', 400);

  const plan = await repo.findByName(PAID_PLAN_NAME);
  if (!plan) throw new AppError('Paid plan is not configured', 500);

  const currentTerm = await repo.findCurrentTerm(instituteId);
  if (!currentTerm) {
    throw new AppError('Set your current academic term before subscribing', 409);
  }

  const liveStudentCount = await repo.countStudents(instituteId);
  const studentCount = Math.floor(Number(studentCountInput));
  if (!Number.isInteger(studentCount) || studentCount < 1) {
    throw new AppError('Student count must be a positive whole number', 400);
  }
  if (studentCount < liveStudentCount) {
    throw new AppError(
      `You have ${liveStudentCount} students enrolled — pay for at least that many`,
      400
    );
  }

  const pricePerStudent = plan.price;
  const amount = studentCount * pricePerStudent;

  const institute = await repo.findInstituteById(instituteId);
  const instituteName = institute?.name || 'Institute';

  // Record a pending payment first so verify/webhook have something to resolve.
  const payment = await repo.createPlanPayment({
    institute: instituteId,
    plan: plan._id,
    term: currentTerm._id,
    studentCount,
    pricePerStudent,
    amount,
    method: 'card',
    channel: 'online',
    status: 'pending',
  });

  const slug = instituteName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const reference = `${slug}-${PAID_PLAN_NAME}-${payment._id}`;

  try {
    const session = await monime.createCheckoutSession({
      name: `${plan.displayName || plan.name} Plan`,
      description: `${studentCount} students × NLe ${pricePerStudent} — ${instituteName}`,
      priceInMinorUnits: Math.round(amount * 100),
      currency: 'SLE',
      successUrl: `${frontendBaseUrl}/api/payment/success`,
      cancelUrl: `${frontendBaseUrl}/api/payment/cancel`,
      reference,
      metadata: {
        planPaymentId: payment._id.toString(),
        instituteId,
        planId: plan._id.toString(),
        termId: currentTerm._id.toString(),
        studentCount: String(studentCount),
      },
    });

    payment.monimeSessionId = session.id;
    payment.reference = reference;
    await payment.save();

    return { checkoutUrl: session.redirectUrl, sessionId: session.id, amount, studentCount };
  } catch (err) {
    payment.status = 'failed';
    await payment.save();
    throw err;
  }
};

// ─── Shared activation ────────────────────────────────────────────────────────
// Idempotent: a payment that is already completed is returned untouched, so a
// duplicate webhook or a repeated verify call cannot re-activate the plan.
const activateSubscription = async (planPaymentId, actorId = null) => {
  const payment = await repo.findPlanPaymentById(planPaymentId);
  if (!payment) throw new AppError('Payment record not found', 404);
  if (payment.status === 'completed') return payment;

  const plan = await repo.findById(payment.plan);
  if (!plan) throw new AppError('Plan not found', 404);

  // Subscription runs to the end of the covered term; fall back to +4 months.
  let planExpiry = null;
  if (payment.term) {
    const term = await repo.findTermById(payment.term);
    if (term?.endDate) planExpiry = new Date(term.endDate);
  }
  if (!planExpiry) {
    planExpiry = new Date();
    planExpiry.setMonth(planExpiry.getMonth() + 4);
  }

  const year = new Date().getFullYear();
  const seq = String((await repo.countCompletedPlanPayments()) + 1).padStart(5, '0');

  payment.status = 'completed';
  payment.receiptNumber = `SUB-${year}-${seq}`;
  payment.paidAt = new Date();
  await payment.save();

  await repo.updateInstituteWithPlan(payment.institute, {
    plan: plan._id,
    planExpiry,
    subscription: {
      assignedAt: new Date(),
      assignedBy: actorId || null,
      studentsPaidFor: payment.studentCount,
      term: payment.term || null,
    },
  });

  const admin = await User.findOne({ institute: payment.institute, role: 'admin' }, '_id');
  if (admin) {
    notify({
      recipientId: admin._id,
      instituteId: payment.institute,
      type: 'plan_assigned',
      title: 'Subscription Activated',
      message: `Your ${plan.displayName || plan.name} plan is active for ${payment.studentCount} students. Expires ${planExpiry.toDateString()}.`,
      relatedEntity: { entityType: 'Institute', entityId: payment.institute },
    });
  }

  return payment;
};

// ─── Verify (called by the frontend success page) ────────────────────────────
export const verifyAndActivatePlan = async (sessionId, user) => {
  const payment = await repo.findPlanPaymentBySession(sessionId);
  if (!payment) throw new AppError('Payment record not found', 404);

  const userInstituteId = (user.institute?._id || user.institute)?.toString();
  if (userInstituteId !== payment.institute.toString()) throw new AppError('Unauthorized', 403);

  if (payment.status !== 'completed') {
    const session = await monime.getCheckoutSession(sessionId);
    if (session.status !== 'completed') {
      throw new AppError(`Payment not completed. Status: ${session.status}`, 400);
    }
    await activateSubscription(payment._id, user._id);
  }

  const fresh = await repo.findPlanPaymentById(payment._id);
  const plan = await repo.findById(fresh.plan);
  const institute = await repo.findInstituteById(payment.institute);
  return { plan, planExpiry: institute?.planExpiry, payment: fresh };
};

// ─── Webhook (Monime → backend, async) ────────────────────────────────────────
export const handleWebhookEvent = async (event) => {
  if (event?.type !== 'checkout_session.completed') return;
  const planPaymentId = event?.data?.metadata?.planPaymentId;
  if (!planPaymentId) return;
  await activateSubscription(planPaymentId, null); // idempotent
};

// ─── Manual payment (cash / bank transfer, recorded by super-admin) ───────────
export const recordManualPayment = async (
  { instituteId, studentCount, method, reference = '', note = '' },
  req
) => {
  if (!instituteId) throw new AppError('instituteId is required', 400);
  if (!['cash', 'bank_transfer'].includes(method)) {
    throw new AppError('Method must be cash or bank_transfer', 400);
  }

  const count = Math.floor(Number(studentCount));
  if (!Number.isInteger(count) || count < 1) {
    throw new AppError('Student count must be a positive whole number', 400);
  }

  const plan = await repo.findByName(PAID_PLAN_NAME);
  if (!plan) throw new AppError('Paid plan is not configured', 500);

  const institute = await repo.findInstituteById(instituteId);
  if (!institute) throw new AppError('Institute not found', 404);

  const currentTerm = await repo.findCurrentTerm(instituteId);

  const payment = await repo.createPlanPayment({
    institute: instituteId,
    plan: plan._id,
    term: currentTerm?._id || null,
    studentCount: count,
    pricePerStudent: plan.price,
    amount: count * plan.price,
    method,
    channel: 'manual',
    status: 'pending',
    reference,
    note,
    recordedBy: req.user._id,
  });

  await activateSubscription(payment._id, req.user._id);

  logAudit(req, {
    action: 'RECORD_PLAN_PAYMENT',
    entity: 'Institute',
    entityId: instituteId,
    description: `Recorded ${method} plan payment for "${institute.name}" — ${count} students`,
    statusCode: 200,
  });

  return repo.findPlanPaymentForReceipt(payment._id);
};

// ─── Payment history & receipts ───────────────────────────────────────────────
const resolveInstituteId = (user, queryInstituteId) => {
  if (user.role === 'super_admin') {
    if (!queryInstituteId) throw new AppError('instituteId query param required', 400);
    return queryInstituteId;
  }
  const instituteId = user.institute?._id || user.institute;
  if (!instituteId) throw new AppError('No institute associated with your account', 400);
  return instituteId;
};

export const getPlanPayments = async (user, queryInstituteId) =>
  repo.findPlanPaymentsByInstitute(resolveInstituteId(user, queryInstituteId));

export const getPlanPaymentReceipt = async (paymentId, user) => {
  const payment = await repo.findPlanPaymentForReceipt(paymentId);
  if (!payment) throw new AppError('Payment not found', 404);

  if (user.role !== 'super_admin') {
    const instituteId = (user.institute?._id || user.institute)?.toString();
    const paymentInstituteId = (payment.institute?._id || payment.institute)?.toString();
    if (instituteId !== paymentInstituteId) throw new AppError('Unauthorized', 403);
  }

  const institute = await repo.findInstituteById(payment.institute?._id || payment.institute);
  return { payment, institute, plan: payment.plan, term: payment.term };
};

// ─── Current plan + usage ─────────────────────────────────────────────────────
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

  // For the paid plan the student cap is what the institute paid for, unless
  // the subscription has expired (then it falls back to the plan's own limit).
  const expired = institute.planExpiry && new Date(institute.planExpiry) < new Date();
  const paidCapacity = institute.subscription?.studentsPaidFor;
  const maxStudents =
    plan?.name === PAID_PLAN_NAME && !expired && paidCapacity
      ? paidCapacity
      : plan?.limits?.maxStudents;

  return {
    plan,
    planExpiry: institute.planExpiry,
    expired: !!expired,
    subscription: institute.subscription,
    usage: {
      students: { current: studentCount, max: maxStudents },
      lecturers: { current: lecturerCount, max: plan?.limits?.maxLecturers },
      classes: { current: classCount, max: plan?.limits?.maxClasses },
    },
  };
};
