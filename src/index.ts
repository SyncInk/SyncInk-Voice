import { connectDatabase } from './database/connect';
import { SyncinkBot } from './bot/bot';
import { loadCommands } from './bot/utils/commandLoader';
import { startApi } from './api';
import { ENV } from './config/config';

// Global process error handlers to prevent crashes on mobile (Termux) or cloud environments
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Error] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error, origin) => {
  console.error(`[Process Error] Uncaught Exception: ${error?.stack || error}\nOrigin: ${origin}`);
});

process.on('SIGINT', () => {
  console.log('[Process] Received SIGINT. Gracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Process] Received SIGTERM. Gracefully shutting down...');
  process.exit(0);
});

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
  startApi(bot);

  // 4. Automated 24/7 Keep-Alive (Prevents Render from sleeping after 15m)
  const KEEP_ALIVE_URL = process.env.KEEP_ALIVE_URL || 'https://syncink-voice.onrender.com/api/health';
  const KEEP_ALIVE_MS = 8 * 60 * 1000; // 8 minutes

  const sendKeepAlivePing = async () => {
    try {
      await fetch(KEEP_ALIVE_URL, {
        headers: { 'User-Agent': 'SyncInk-Voice-KeepAlive/1.0' },
      });
    } catch {
      // Best effort keep-alive
    }
  };

  setTimeout(sendKeepAlivePing, 30 * 1000);
  setInterval(sendKeepAlivePing, KEEP_ALIVE_MS);
};

bootstrap().catch((error) => {
  console.error('[Bootstrap Error] Failed to start application:', error);
});

