import { Router } from 'express';
import { getStudents, getStudentById, getMyFees, getMyResults, getMyReportCard, getMyPayments, getMyPaymentReceipt, getMyRanking, getMyPromotionHistory } from '../controllers/student.controller.js';
import auth from '../middlewares/auth.js';
import { adminOnly } from '../middlewares/adminOnly.js';
import User from '../models/user.js';

const router = Router();

// Student self-service routes (must be before /:id)
router.get('/my-fees', auth, getMyFees);
router.get('/my-results', auth, getMyResults);
router.get('/my-promotion-history', auth, getMyPromotionHistory);
router.get('/my-report-card', auth, getMyReportCard);
router.get('/my-ranking', auth, getMyRanking);
router.get('/my-payments', auth, getMyPayments);
router.get('/my-payments/:paymentId/receipt', auth, getMyPaymentReceipt);

// Email notification preferences
router.patch('/email-preferences', auth, async (req, res) => {
  try {
    const { optOut } = req.body;

    if (!Array.isArray(optOut)) {
      return res.status(400).json({ message: 'optOut must be an array of notification type strings' });
    }

    const allowed = ['announcement', 'assignmentPosted'];
    const sanitized = optOut.filter((t) => allowed.includes(t));

    await User.findByIdAndUpdate(req.user._id, { emailOptOut: sanitized });

    res.json({ message: 'Email preferences updated', emailOptOut: sanitized });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin-facing routes
router.get('/', auth, adminOnly, getStudents);
router.get('/:id', auth, adminOnly, getStudentById);

export default router;
