import { SyncinkBot } from '../bot';

export const handleReady = (client: SyncinkBot) => {
  console.log(`[Bot] Logged in as ${client.user?.tag}`);
  console.log(`[Bot] Serving ${client.guilds.cache.size} guilds`);
};
