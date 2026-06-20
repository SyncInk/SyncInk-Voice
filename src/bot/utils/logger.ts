import { EmbedBuilder, Guild, TextChannel } from 'discord.js';
import { GuildSettings } from '../../database/models/GuildSettings';

export type LogEventType = 
  | 'channelCreated'
  | 'channelDeleted'
  | 'channelRenamed'
  | 'channelLocked'
  | 'channelUnlocked'
  | 'permissionChanges'
  | 'ownershipTransfer'
  | 'userMovement'
  | 'commandUsage'
  | 'interfaceUsage';

interface LogEventOptions {
  guild: Guild;
  type: LogEventType;
  title: string;
  description: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  executor?: { id: string; tag: string; avatarUrl: string | null };
}

export const logEvent = async (options: LogEventOptions) => {
  try {
    const settings = await GuildSettings.findOne({ guildId: options.guild.id });
    if (!settings || !settings.loggingChannelId || !settings.loggingEvents) return;

    if (!settings.loggingEvents[options.type]) return;

    const channel = options.guild.channels.cache.get(settings.loggingChannelId) as TextChannel | undefined;
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle(options.title)
      .setDescription(options.description)
      .setColor(options.color || 0x2b2d31)
      .setTimestamp();

    if (options.fields) embed.addFields(options.fields);
    if (options.executor) {
      embed.setFooter({ 
        text: `Action by: ${options.executor.tag} (${options.executor.id})`, 
        iconURL: options.executor.avatarUrl || undefined 
      });
    }

    await channel.send({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    // Fail gracefully
  }
};
