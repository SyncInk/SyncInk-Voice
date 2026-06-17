import mongoose from 'mongoose';
import { ENV } from '../config/config';

export const connectDatabase = async () => {
  try {
    await mongoose.connect(ENV.MONGO_URI);
    console.log('[Database] MongoDB connected successfully');
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error);
    process.exit(1);
  }
};
