import { SyncinkBot } from '../bot';
import { TempChannel } from '../../database/models/TempChannel';
import { GuildSettings } from '../../database/models/GuildSettings';
import { GuildSetup } from '../../database/models/GuildSetup';
import { refreshGuildPanels } from '../utils/tempRoom';
import { ENV } from '../../config/config';

export const handleReady = async (client: SyncinkBot) => {
  console.log(`[Bot] Logged in as ${client.user?.tag}`);
  console.log(`[Bot] Serving ${client.guilds.cache.size} guilds`);

  const cleanupOrphanedChannels = async () => {
    for (const guild of client.guilds.cache.values()) {
      try {
        const settings = await GuildSettings.findOne({ guildId: guild.id }).catch(() => null);
        const setups = await GuildSetup.find({ guildId: guild.id }).catch(() => []);

        const generatorCategoryIds = new Set<string>();
        if (settings?.setupCategoryId) generatorCategoryIds.add(settings.setupCategoryId);
        for (const s of setups) {
          if (s.categoryId) generatorCategoryIds.add(s.categoryId);
        }

        const generatorChannelIds = new Set<string>();
        if (settings?.setupChannelId) generatorChannelIds.add(settings.setupChannelId);
        for (const s of setups) {
          if (s.generatorChannelId) generatorChannelIds.add(s.generatorChannelId);
        }

        // 1. Clean up managed channels tracked in database
        const tempChannels = await TempChannel.find({ guildId: guild.id }).catch(() => []);
        for (const tc of tempChannels) {
          let ch = guild.channels.cache.get(tc.channelId);
          if (!ch) {
            ch = (await guild.channels.fetch(tc.channelId).catch(() => null)) as any;
          }

          if (!ch) {
            console.log(`[Cleaner] Pruning missing channel ${tc.channelId} from DB in guild "${guild.name}"`);
            await TempChannel.deleteOne({ _id: tc._id }).catch(() => null);
            continue;
          }

          if (ch.isVoiceBased()) {
            const activeStates = guild.voiceStates.cache.filter((vs) => vs.channelId === ch.id);
            let hasHuman = false;
            for (const vs of activeStates.values()) {
              const u = vs.member?.user || client.users.cache.get(vs.id);
              if (u && !u.bot) {
                hasHuman = true;
                break;
              }
            }

            if (activeStates.size === 0 || !hasHuman) {
              console.log(`[Cleaner] Deleting empty temporary channel "${ch.name}" (${ch.id}) with no humans in guild "${guild.name}"`);
              if (tc.textChannelId) {
                const textCh = guild.channels.cache.get(tc.textChannelId)
                  || (await guild.channels.fetch(tc.textChannelId).catch(() => null));
                if (textCh) {
                  await textCh.delete().catch(() => null);
                }
              }
              await ch.delete().catch(() => null);
              await TempChannel.deleteOne({ _id: tc._id }).catch(() => null);
            }
          }
        }

        // 2. Clean up any unmanaged orphaned channels under generator categories that are empty of humans
        for (const ch of guild.channels.cache.values()) {
          if (!ch.isVoiceBased()) continue;
          if (generatorChannelIds.has(ch.id)) continue;
          if (!ch.parentId || !generatorCategoryIds.has(ch.parentId)) continue;

          const activeStates = guild.voiceStates.cache.filter((vs) => vs.channelId === ch.id);
          let hasHuman = false;
          for (const vs of activeStates.values()) {
            const u = vs.member?.user || client.users.cache.get(vs.id);
            if (u && !u.bot) {
              hasHuman = true;
              break;
            }
          }

          if (activeStates.size === 0 || !hasHuman) {
            console.log(`[Cleaner] Deleting orphaned category channel "${ch.name}" (${ch.id}) in guild "${guild.name}"`);
            await ch.delete().catch(() => null);
            await TempChannel.deleteOne({ channelId: ch.id }).catch(() => null);
          }
        }
      } catch (err) {
        console.error(`[Cleaner] Error cleaning channels in guild ${guild.id}:`, err);
      }
    }
  };

  // Run initial sweep on bot startup
  await cleanupOrphanedChannels();

  // Run periodic sweep every 20s to guarantee no empty orphaned channels ever linger
  setInterval(cleanupOrphanedChannels, 20 * 1000);

  // Restore panels for active channels with members
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
