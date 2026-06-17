import mongoose from 'mongoose';
import { ENV } from '../config/config';

export const connectDatabase = async () => {
  try {
    await mongoose.connect(ENV.MONGO_URI);
    console.log('[Database] MongoDB connected successfully');
  } catch (error: any) {
    console.error('\n❌ [CRITICAL ERROR] Failed to connect to MongoDB!');
    console.error('If you are hosting on Railway or Render, you MUST set the MONGO_URI environment variable.');
    console.error('Make sure you have created a MongoDB Atlas account, copied the connection string, and added it to your host variables.\n');
    console.error('Error Details:', error.message);
    process.exit(1);
  }
};
