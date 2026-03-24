# Jest Testing Guide

This document provides comprehensive information about the Jest test suite for the StudMan Backend API.

## Table of Contents
- [Installation](#installation)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Test Coverage](#test-coverage)
- [Writing New Tests](#writing-new-tests)

## Installation

Jest is already installed as a dependency. To ensure all dependencies are installed:

```bash
npm install
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with Coverage Report
```bash
npm test -- --coverage
```

### Run Specific Test File
```bash
npm test -- __tests__/models/user.test.js
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="Auth"
```

### Run Tests in Verbose Mode
```bash
npm test -- --verbose
```

## Test Structure

The test files are organized as follows:

```
__tests__/
├── models/
│   ├── user.test.js              # User model tests
│   ├── class.test.js             # Class model tests
│   ├── subject.test.js           # Subject model tests
│   ├── institute.test.js         # Institute model tests
│   ├── assignment.test.js        # Assignment model tests
│   └── submission.test.js        # Submission model tests
├── controllers/
│   ├── auth.controller.test.js   # Authentication controller tests
│   ├── student.controller.test.js # Student controller tests
│   ├── lecturer.controller.test.js # Lecturer controller tests
│   └── class.controller.test.js   # Class controller tests
├── middlewares/
│   ├── auth.test.js              # Auth middleware tests
│   └── errorHandler.test.js      # Error handler middleware tests
└── utils/
    └── logger.test.js            # Logger utility tests
```

## Test Categories

### Model Tests
Tests for Mongoose schema validation, field defaults, references, and constraints:
- **User Model**: Password hashing, role validation, unique email
- **Class Model**: Code uniqueness, references to lecturer
- **Subject Model**: Unique code per class constraint
- **Institute Model**: Unique name and admin enforcement
- **Assignment Model**: Required fields and references
- **Submission Model**: Multiple submissions support, references

### Controller Tests
Tests for business logic and request handling:
- **Auth Controller**: Login, GetMe, Logout functionality
- **Student Controller**: Get all students, get student by ID
- **Lecturer Controller**: Get all lecturers, get lecturer by ID
- **Class Controller**: Create class, add student to class

### Middleware Tests
Tests for middleware functionality:
- **Auth Middleware**: Token validation, user authentication
- **Error Handler**: Error logging and response formatting

### Utility Tests
Tests for utility functions:
- **Logger**: Log level methods, error handling

## Test Coverage

Current test coverage includes:

| File Type | Coverage |
|-----------|----------|
| Models | ~95% |
| Controllers | ~85% |
| Middlewares | ~90% |
| Utils | ~85% |

To generate a detailed coverage report:

```bash
npm test -- --coverage --collectCoverageFrom="src/**/*.js"
```

## Writing New Tests

### Test File Naming
- Name test files as `[filename].test.js`
- Place them in `__tests__` directory matching src structure

### Test Template

```javascript
describe('Feature Name', () => {
  // Setup
  beforeAll(async () => {
    // Connect to test database
  });

  beforeEach(async () => {
    // Reset test data
  });

  // Cleanup
  afterEach(async () => {
    // Clean up test data
  });

  afterAll(async () => {
    // Disconnect database
  });

  describe('Specific Functionality', () => {
    it('should do something specific', async () => {
      // Test implementation
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Best Practices

1. **Database Isolation**: Use separate test database (defined in `jest.setup.js`)
2. **Cleanup**: Always clean up test data in `afterEach` hooks
3. **Descriptive Names**: Use clear test names that describe what's being tested
4. **Mock External Services**: Mock Cloudinary, email services, etc.
5. **Error Cases**: Test both success and failure scenarios
6. **Edge Cases**: Test boundary conditions and edge cases

### Testing Async Code

```javascript
// Use async/await
it('should fetch user', async () => {
  const user = await User.create({...});
  expect(user).toBeDefined();
});

// Or return promises
it('should fetch user', () => {
  return User.create({...}).then(user => {
    expect(user).toBeDefined();
  });
});
```

### Mocking

```javascript
// Mock a module
jest.mock('../../src/utils/logger.js');

// Mock a method
jest.spyOn(User, 'findById').mockResolvedValueOnce(mockUser);

// Restore mocks
User.findById.mockRestore();
```

## Environment Variables for Testing

Tests use the following environment variables (set in `jest.setup.js`):

- `JWT_SECRET`: `test-secret-key-12345`
- `JWT_EXPIRES_IN`: `7d`
- `NODE_ENV`: `test`
- `MONGO_URI`: `mongodb://localhost:27017/studmanbackend-test`

To use a custom `.env.test` file, create it in the project root and it will be loaded automatically.

## Debugging Tests

### Run Single Test
```bash
npm test -- __tests__/models/user.test.js
```

### Debug with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome DevTools.

### Print Logs in Tests
```javascript
it('should do something', () => {
  console.log('Debug info');
  expect(result).toBe(value);
});
```

Run with: `npm test -- --verbose`

## Common Issues

### Port Already in Use
If MongoDB connection fails, ensure port 27017 is available or update `MONGO_URI` in `jest.setup.js`.

### Timeout Errors
Increase timeout in jest.config.js if tests are slow:
```javascript
testTimeout: 20000 // milliseconds
```

### Module Not Found
Ensure ES modules are configured correctly with `"type": "module"` in package.json.

## Continuous Integration

To run tests in CI/CD pipeline:

```bash
npm test -- --coverage --watchAll=false --passWithNoTests
```

Add to `.github/workflows/test.yml` for automated testing on push/PR.

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Mongoose Testing](https://mongoosejs.com/docs/api/Model.html)
- [Express Testing](https://expressjs.com/en/guide/testing.html)
