import mongoose from 'mongoose';
import logger from '../utils/logger.js';

// Cache the database connection for serverless environments
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB(uri) {
  // Return existing connection if available
  if (cached.conn) {
    logger.info('Using cached database connection');
    return cached.conn;
  }

  // Create new connection if promise doesn't exist
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable buffering for serverless
      maxPoolSize: 10, // Maximum number of connections
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    logger.info('Creating new database connection');
    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      logger.info('Database connected successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    logger.error('Database connection failed:', error);
    throw error;
  }

  return cached.conn;
}

// Handle connection events
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.info('Mongoose disconnected');
});

export default connectDB;