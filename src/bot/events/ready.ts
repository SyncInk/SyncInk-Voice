import { SyncinkBot } from '../bot';
import { TempChannel } from '../../database/models/TempChannel';
import { refreshGuildPanels, restoreOwnershipWarnings } from '../utils/tempRoom';
import { ENV } from '../../config/config';

export const handleReady = async (client: SyncinkBot) => {
  console.log(`[Bot] Logged in as ${client.user?.tag}`);
  console.log(`[Bot] Serving ${client.guilds.cache.size} guilds`);

  const cleanupOrphanedChannels = async () => {
    for (const guild of client.guilds.cache.values()) {
      try {
        const tempChannels = await TempChannel.find({ guildId: guild.id }).catch(() => []);
        for (const tc of tempChannels) {
          const ch = guild.channels.cache.get(tc.channelId);

          // If channel was deleted while bot was offline, prune from DB
          if (!ch) {
            console.log(`[Cleaner] Pruning missing channel ${tc.channelId} from DB in guild "${guild.name}"`);
            await TempChannel.deleteOne({ _id: tc._id }).catch(() => null);
            continue;
          }

          // If channel is voice based and has 0 members, delete it and its companion text channel
          if (ch.isVoiceBased() && ch.members.size === 0) {
            console.log(`[Cleaner] Deleting empty orphaned channel "${ch.name}" (${ch.id}) in guild "${guild.name}"`);
            if (tc.textChannelId) {
              const textCh = guild.channels.cache.get(tc.textChannelId);
              if (textCh) {
                await textCh.delete().catch(() => null);
              }
            }
            await TempChannel.deleteOne({ _id: tc._id }).catch(() => null);
            await ch.delete().catch(() => null);
          }
        }
      } catch (err) {
        console.error(`[Cleaner] Error cleaning channels in guild ${guild.id}:`, err);
      }
    }
  };

  // Run initial sweep on bot startup
  await cleanupOrphanedChannels();

  // Run periodic sweep every 45s to guarantee no empty orphaned channels ever linger
  setInterval(cleanupOrphanedChannels, 45 * 1000);

  // Restore panels and warnings for active channels with members
  for (const guild of client.guilds.cache.values()) {
    const tempChannels = await TempChannel.find({ guildId: guild.id }).catch(() => []);
    if (!tempChannels.length) {
      continue;
    }

    await refreshGuildPanels(guild, tempChannels, ENV.DASHBOARD_URL || undefined).catch((error) => {
      console.error(`[Bot] Failed to restore panels for ${guild.id}:`, error);
    });

    await restoreOwnershipWarnings(guild, tempChannels, ENV.DASHBOARD_URL || undefined).catch((error) => {
      console.error(`[Bot] Failed to restore ownership warnings for ${guild.id}:`, error);
    });
  }
};
