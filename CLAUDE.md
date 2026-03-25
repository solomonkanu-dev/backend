# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start with nodemon (auto-reload on src changes)
npm start            # Production mode

# Testing
npm test                                         # Run all tests
npm run test:watch                               # Watch mode
npm run test:coverage                            # Coverage report
npm test -- __tests__/models/user.test.js        # Single test file
npm test -- --testNamePattern="Auth"             # Tests matching pattern
npm run test:verbose                             # Verbose output

# Code quality
npm run lint         # ESLint
npm run format       # Prettier

# Seeds
npm run seed:superadmin   # Create the initial super admin user
```

## Required Environment Variables

```
MONGO_URI=           # Required — server will exit(1) without it
JWT_SECRET=          # Required — server will exit(1) without it
ALLOWED_ORIGINS=     # Comma-separated CORS origins
PORT=                # Defaults to 8080
CLOUDINARY_*         # For file uploads
```

Tests use a hardcoded test DB (`mongodb://localhost:27017/studmanbackend-test`) and `JWT_SECRET=test-secret-key-12345` set in `jest.setup.js`.

## Architecture Overview

**Runtime**: Node.js (ESM modules — `"type": "module"` in package.json), Express 5, MongoDB/Mongoose. Deployed on Fly.io (port 8080 default) with Vercel support.

### Multi-Tenant Design

The system is multi-tenant. Each `Institute` belongs to one `admin` user (unique constraint). All scoped resources (users, classes, subjects, etc.) carry an `institute` ObjectId. Every authenticated request has `req.user.institute` populated.

### User Roles & Authorization Chain

Four roles: `super_admin` → `admin` → `lecturer` → `student`.

Middleware stack used on protected routes:
1. `auth` — verifies JWT (Bearer header or cookie), attaches `req.user`, checks `isActive`
2. `adminOnly` / `superAdmin` / `adminOrSuperAdmin` — role guards
3. `enforcePlanLimits(resourceType)` — checks institute plan limits before creating students/lecturers/classes

### Request Flow

```
Request → helmet/cors/compression/morgan → rate limiter → maintenanceCheck → route → controller → response
```

The `maintenanceCheck` middleware skips `/api/v1/super-admin` and `/health`.

### Audit Logging

Import `logAudit` from `src/utils/audit.js` and call it after successful mutations. It is fire-and-forget — failures are silently swallowed so they never break responses.

```js
await logAudit(req, { action: 'CREATE_STUDENT', entity: 'User', entityId: user._id, description: '...', statusCode: 201 });
```

### Plan / Subscription System

- `Plan` model stores named tiers (e.g., `free`) with a `limits` object (`maxStudents`, `maxLecturers`, `maxClasses`).
- Plans are seeded at server startup via `src/config/seedPlans.js`.
- `enforcePlanLimits` middleware enforces these limits before creation endpoints.
- `Institute.plan` references the active plan; `Institute.planExpiry` tracks expiry.

### Onboarding Workflow

Users have an `onboarding.status` field (`pending` → `under_review` → `approved`/`rejected`). Status transitions are tracked in `onboarding.transitions[]`.

### File Uploads

Cloudinary is used for all file storage. `src/middlewares/upload.js` (multer) handles multipart parsing before the upload controller sends to Cloudinary.

### Notifications & Exports

- `src/utils/notify.js` — helper to create `Notification` documents
- `src/utils/csvExport.js` — CSV export helpers used by `export.controller.js`

### Test Structure

Tests live in `__tests__/` mirroring `src/` structure:
- `__tests__/models/` — Mongoose schema validation tests
- `__tests__/controllers/` — business logic tests (mocked DB)
- `__tests__/middlewares/` — middleware unit tests
- `__tests__/utils/` — utility tests

Tests use `supertest` for HTTP-level controller tests and `jest.spyOn` / `jest.mock` for mocking. Always clean up test data in `afterEach`.
