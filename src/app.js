import express, { json, urlencoded } from "express";
import fs from "fs";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient } from "./config/redis.js";
import adminRoutes from "./routes/admin.route.js";
import authRoutes from "./routes/auth.route.js";
import lecturerRoutes from "./routes/lecturer.route.js";
import studentRoutes from "./routes/student.route.js";
import superAdminRoutes from "./routes/superAdmin.route.js";
import classRoutes from "./routes/class.route.js";
import subjectRoutes from "./routes/subject.route.js";
import errorHandler from "./middlewares/errorHandler.js";
import assignmentRoutes from "./routes/assignment.route.js";
import submissionRoutes from "./routes/submission.route.js";
import attendanceRoutes from "./routes/attendance.route.js";
import feeStructureRoutes from "./routes/feeStructure.route.js";
import themeRoutes from "./routes/theme.route.js";
import salaryRoutes from "./routes/salary.route.js";
import accountRoutes from "./routes/account.route.js";
import gradingRoutes from "./routes/grading.route.js";
import reportCardTemplateRoutes from "./routes/reportCardTemplate.route.js";
import ratingTraitRoutes from "./routes/ratingTrait.route.js";
import reportCardRoutes from "./routes/reportCard.route.js";
import auditLogRoutes from "./routes/auditLog.route.js";
import announcementRoutes from "./routes/announcement.route.js";
import planRoutes from "./routes/plan.route.js";
import systemConfigRoutes from "./routes/systemConfig.route.js";
import instituteModulesRoutes from "./routes/instituteModules.route.js";
import exportRoutes from "./routes/export.route.js";
import notificationRoutes from "./routes/notification.route.js";
import uploadRoutes from "./routes/upload.route.js";
import termRoutes from "./routes/term.route.js";
import sharedTermRoutes from "./routes/sharedTerm.route.js";
import analyticsRoutes from "./routes/analytics.route.js";
import parentRoutes from "./routes/parent.route.js";
import timetableRoutes from "./routes/timetable.route.js";
import calendarRoutes from "./routes/calendar.route.js";
import chatRoutes from "./routes/chat.route.js";
import examRoutes from "./routes/exam.route.js";
import galleryRoutes from "./routes/gallery.route.js";
import financialRoutes from "./routes/financial.route.js";
import { maintenanceCheck } from "./middlewares/maintenanceCheck.js";
import { csrfProtection } from "./middlewares/csrfProtection.js";

const app = express();

// Trust the first proxy hop (Fly.io / Railway / Render / Nginx).
// Required so express-rate-limit can read X-Forwarded-For correctly.
app.set("trust proxy", 1);

// Middlewares
app.use(helmet());
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim().replace(/\/$/, ""))
  : [];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(json({
  limit: "10mb",
  verify: (req, _res, buf) => {
    if (req.originalUrl?.includes('/plans/webhook')) req.rawBody = buf;
  },
}));
app.use(urlencoded({ extended: true }));
app.use(compression({ threshold: 1024 }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Build a Redis store for rate-limit-redis; falls back to in-memory if Redis is unavailable
const makeRateLimitStore = (prefix) => {
  const client = getRedisClient();
  if (!client) return undefined;
  return new RedisStore({
    prefix: `studman:rl:${prefix}:`,
    sendCommand: (command, ...args) => client.call(command, ...args),
  });
};

// General rate limiter — shared across all instances via Redis
// General rate limiter — applies to every API request, shared across instances via Redis.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please slow down",
  store: makeRateLimitStore('general'),
});
app.use(limiter);

// Stricter rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many attempts, please try again later",
  store: makeRateLimitStore('auth'),
});
app.use("/api/v1/auth", authLimiter);

// Rate limiter for analytics endpoints (AI-driven, potentially expensive)
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many analytics requests, please slow down",
  store: makeRateLimitStore('analytics'),
});
app.use("/api/v1/analytics", analyticsLimiter);

// CSRF guard for cookie-authenticated mutations. JSON requests are protected
// by the CORS preflight; this catches the multipart/urlencoded gap.
// The Monime webhook is reachable because it carries no auth cookie.
app.use(csrfProtection);

// Maintenance check — skip super-admin routes and health endpoint
app.use((req, res, next) => {
  if (req.path.startsWith("/api/v1/super-admin") || req.path === "/health")
    return next();
  maintenanceCheck(req, res, next);
});

// Routes
app.get("/health", (req, res) =>
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() }),
);
app.get("/", (req, res) => res.json({ message: "API is running" }));
app.use("/api/v1/admin/terms", termRoutes);
app.use("/api/v1/terms", sharedTermRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/lecturer", lecturerRoutes);
app.use("/api/v1/student", studentRoutes);
app.use("/api/v1/super-admin", superAdminRoutes);
app.use("/api/v1/class", classRoutes);
app.use("/api/v1/subject", subjectRoutes);
app.use("/api/v1/assignment", assignmentRoutes);
app.use("/api/v1/submission", submissionRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/fees-structure", feeStructureRoutes);
app.use("/api/v1/salary", salaryRoutes);
app.use("/api/v1/account", accountRoutes);
app.use("/api/v1/theme", themeRoutes);
app.use("/api/v1/grading", gradingRoutes);
app.use("/api/v1/report-card-template", reportCardTemplateRoutes);
app.use("/api/v1/rating-trait", ratingTraitRoutes);
app.use("/api/v1/report-card", reportCardRoutes);
app.use("/api/v1/audit-logs", auditLogRoutes);
app.use("/api/v1/announcements", announcementRoutes);
app.use("/api/v1/plans", planRoutes);
app.use("/api/v1/system", systemConfigRoutes);
app.use("/api/v1/system-config", systemConfigRoutes);
app.use("/api/v1", instituteModulesRoutes);
app.use("/api/v1/exports", exportRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/parent", parentRoutes);
app.use("/api/v1/timetable", timetableRoutes);
app.use("/api/v1/calendar", calendarRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/exam", examRoutes);
app.use("/api/v1/gallery", galleryRoutes);
app.use("/api/v1/financial", financialRoutes);

// Error handler (last)
app.use(errorHandler);

export default app;
