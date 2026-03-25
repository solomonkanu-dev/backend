import Plan from '../models/Plan.js';
import Institute from '../models/Institute.js';
import User from '../models/user.js';
import Class from '../models/Class.js';
import { logAudit } from '../utils/audit.js';
import { notify } from '../utils/notify.js';

const isDev = process.env.NODE_ENV === 'development';

export const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ price: 1 });
    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const updatePlanLimits = async (req, res) => {
  try {
    const { planId } = req.params;

    const plan = await Plan.findByIdAndUpdate(planId, { limits: req.body.limits, ...( req.body.price !== undefined && { price: req.body.price } ), ...( req.body.displayName !== undefined && { displayName: req.body.displayName } ), ...( req.body.isActive !== undefined && { isActive: req.body.isActive } ) }, { new: true });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({ success: true, message: 'Plan updated successfully', data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const assignPlanToInstitute = async (req, res) => {
  try {
    const { instituteId, planName, expiryDate } = req.body;

    if (!instituteId || !planName) {
      return res.status(400).json({ success: false, message: 'instituteId and planName are required' });
    }

    const plan = await Plan.findOne({ name: planName });
    if (!plan) {
      return res.status(404).json({ success: false, message: `Plan "${planName}" not found` });
    }

    const institute = await Institute.findByIdAndUpdate(
      instituteId,
      {
        plan: plan._id,
        planExpiry: expiryDate || null,
        subscription: {
          assignedAt: new Date(),
          assignedBy: req.user._id,
        },
      },
      { new: true }
    ).populate('plan');

    if (!institute) {
      return res.status(404).json({ success: false, message: 'Institute not found' });
    }

    logAudit(req, { action: 'ASSIGN_PLAN', entity: 'Institute', entityId: institute._id, description: `Assigned plan "${planName}" to institute "${institute.name}"`, statusCode: 200 });

    // Notify the institute's admin
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

    res.json({ success: true, message: 'Plan assigned successfully', data: institute });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const getMyPlan = async (req, res) => {
  try {
    let instituteId;

    if (req.user.role === 'super_admin') {
      instituteId = req.query.instituteId;
      if (!instituteId) {
        return res.status(400).json({ success: false, message: 'instituteId query param required for super admin' });
      }
    } else {
      instituteId = req.user.institute?._id || req.user.institute;
      if (!instituteId) {
        return res.status(400).json({ success: false, message: 'No institute associated with your account' });
      }
    }

    const institute = await Institute.findById(instituteId).populate('plan');

    if (!institute) {
      return res.status(404).json({ success: false, message: 'Institute not found' });
    }

    let plan = institute.plan;
    if (!plan) {
      plan = await Plan.findOne({ name: 'free' });
    }

    const [studentCount, lecturerCount, classCount] = await Promise.all([
      User.countDocuments({ institute: instituteId, role: 'student' }),
      User.countDocuments({ institute: instituteId, role: 'lecturer' }),
      Class.countDocuments({ institute: instituteId }),
    ]);

    res.json({
      success: true,
      data: {
        plan,
        planExpiry: institute.planExpiry,
        subscription: institute.subscription,
        usage: {
          students:  { current: studentCount,  max: plan?.limits?.maxStudents  },
          lecturers: { current: lecturerCount, max: plan?.limits?.maxLecturers },
          classes:   { current: classCount,    max: plan?.limits?.maxClasses   },
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};
