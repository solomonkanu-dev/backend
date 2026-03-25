import express, { json, urlencoded } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import adminRoutes from './routes/admin.route.js';
import authRoutes from './routes/auth.route.js';
import lecturerRoutes from './routes/lecturer.route.js';
import studentRoutes from './routes/student.route.js';
import superAdminRoutes from './routes/superAdmin.route.js';
import classRoutes from './routes/class.route.js';
import subjectRoutes from './routes/subject.route.js';
import errorHandler from './middlewares/errorHandler.js';
import assignmentRoutes from './routes/assignment.route.js';
import submissionRoutes from './routes/submission.route.js';
import attendanceRoutes from './routes/attendance.route.js';
import feeStructureRoutes from './routes/feeStructure.route.js';
import themeRoutes from './routes/theme.route.js';
import salaryRoutes from './routes/salary.route.js';
import accountRoutes from './routes/account.route.js';
import gradingRoutes from './routes/grading.route.js';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || [] }));
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true }));
app.use(compression());
app.use(morgan('dev'));

// Rate limiter (basic)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Stricter rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts, please try again later',
});
app.use('/api/v1/auth', authLimiter);

// Routes
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/', (req, res) => res.json({ message: 'API is running' }));
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/lecturer', lecturerRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/super-admin', superAdminRoutes);
app.use('/api/v1/class', classRoutes);
app.use('/api/v1/subject', subjectRoutes);
app.use('/api/v1/assignment', assignmentRoutes);
app.use('/api/v1/submission', submissionRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/fees-structure', feeStructureRoutes);
app.use('/api/v1/salary', salaryRoutes);
app.use('/api/v1/account', accountRoutes);
app.use('/api/v1/theme', themeRoutes);
app.use('/api/v1/grading', gradingRoutes);

// Error handler (last)
app.use(errorHandler);

export default app;
