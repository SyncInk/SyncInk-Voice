import { config } from 'dotenv';
config();

export const ENV = {
  TOKEN: process.env.TOKEN || '',
  CLIENT_ID: process.env.CLIENT_ID || '',
  CLIENT_SECRET: process.env.CLIENT_SECRET || '',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/syncink',
  PORT: process.env.PORT || 3000,
  DASHBOARD_URL: process.env.DASHBOARD_URL || 'https://syncink.app',
  BRAND_COLOR: parseInt(process.env.BRAND_COLOR || '8B5CF6', 16),
};
