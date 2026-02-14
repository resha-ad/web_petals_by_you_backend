import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';

export const connectToDB = async () => {
  // Skip real DB connection during Jest tests
  if (process.env.NODE_ENV === 'test') {
    console.log('Skipping real DB connect in test environment');
    return;
  }

  if (mongoose.connection.readyState >= 1) {
    console.log('MongoDB already connected, skipping...');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Successfully connected to MongoDB (production/dev)');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};