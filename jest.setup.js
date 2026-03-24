// Jest setup file
// Mock environment variables for tests
process.env.JWT_SECRET = 'test-secret-key-12345';
process.env.JWT_EXPIRES_IN = '7d';
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/studmanbackend-test';
