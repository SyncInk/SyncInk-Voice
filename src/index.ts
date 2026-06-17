import { connectDatabase } from './database/connect';
import { SyncinkBot } from './bot/bot';
import { loadCommands } from './bot/utils/commandLoader';
import { startApi } from './api';
import { ENV } from './config/config';

const bootstrap = async () => {
  console.log('Starting Syncink Voice...');

  if (!ENV.TOKEN || !ENV.CLIENT_ID) {
    console.error('Missing Discord Bot Token or Client ID in environment variables.');
    process.exit(1);
  }

  // 1. Connect to MongoDB
  await connectDatabase();

  // 2. Start the Discord Bot
  const bot = new SyncinkBot();
  await loadCommands(bot);
  await bot.start();

  // 3. Start Dashboard API
  startApi();
};

bootstrap().catch(console.error);
