import mongoose from 'mongoose';
import { ENV } from '../config/config';

export const connectDatabase = async () => {
  const mongoUri = ENV.MONGO_URI?.trim();

  if (!mongoUri || mongoUri.includes('<db_password>')) {
    console.error('\n[CRITICAL ERROR] Failed to connect to MongoDB!');
    console.error('Your MONGO_URI is missing a real database password.');
    console.error('Open MongoDB Atlas -> Connect -> Drivers, then replace <db_password> with the actual database user password.');
    console.error('If the password contains characters like @, :, /, ?, #, [, ], or %, URL-encode it before saving the variable.\n');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri, { family: 4 });
    console.log('[Database] MongoDB connected successfully');
  } catch (error: any) {
    console.error('\n[CRITICAL ERROR] Failed to connect to MongoDB!');
    console.error('If you are hosting on Railway or Render, you must set the MONGO_URI environment variable.');
    console.error('Make sure you created a MongoDB Atlas cluster, copied the driver connection string, and saved it in your host variables.\n');
    console.error('Error Details:', error.message);
    process.exit(1);
  }
};
