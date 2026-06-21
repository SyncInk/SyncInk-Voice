import { SyncinkBot } from '../bot';
import { TempChannel } from '../../database/models/TempChannel';
import { refreshGuildPanels } from '../utils/tempRoom';
import { ENV } from '../../config/config';

export const handleReady = async (client: SyncinkBot) => {
  console.log(`[Bot] Logged in as ${client.user?.tag}`);
  console.log(`[Bot] Serving ${client.guilds.cache.size} guilds`);

  for (const guild of client.guilds.cache.values()) {
    const tempChannels = await TempChannel.find({ guildId: guild.id }).catch(() => []);
    if (!tempChannels.length) {
      continue;
    }

    await refreshGuildPanels(guild, tempChannels, ENV.DASHBOARD_URL || undefined).catch((error) => {
      console.error(`[Bot] Failed to restore panels for ${guild.id}:`, error);
    });
  }
};
