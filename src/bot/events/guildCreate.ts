import { Guild, PermissionFlagsBits, TextChannel } from 'discord.js';
import { SyncinkBot } from '../bot';
import { buildEmbed } from '../utils/embed';
import { ENV } from '../../config/config';

export const handleGuildCreate = async (client: SyncinkBot, guild: Guild) => {
  const systemChannel = guild.systemChannel;
  let targetChannel: TextChannel | undefined;

  if (
    systemChannel &&
    systemChannel.permissionsFor(client.user!)?.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ])
  ) {
    targetChannel = systemChannel;
  } else {
    const channels = guild.channels.cache.filter((channel) =>
      channel.isTextBased() &&
      channel.permissionsFor(client.user!)?.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ]),
    );
    targetChannel = channels.first() as TextChannel | undefined;
  }

  if (!targetChannel) {
    return;
  }

  const embed = buildEmbed()
    .setTitle('Thank you for inviting SyncInk Voice')
    .setDescription(
      `Use \`/setup\` to create or connect a Join to Create voice channel.\n\n` +
        `Room owners can manage name, limit, status, game rename, LFM, bitrate, region, text chat, NSFW, lock, permit, reject, invite, ghost, and transfer controls from the panel.\n\n` +
        `Dashboard: ${ENV.DASHBOARD_URL || 'Configure DASHBOARD_URL in your host variables'}`,
    )
    .setFooter({ text: 'Use /setup to begin.' });

  try {
    await targetChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('[GuildCreate] Failed to send welcome message:', error);
  }
};
