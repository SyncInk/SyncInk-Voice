import { Guild, TextChannel, PermissionFlagsBits } from 'discord.js';
import { SyncinkBot } from '../bot';
import { buildEmbed } from '../utils/embed';

export const handleGuildCreate = async (client: SyncinkBot, guild: Guild) => {
  // Find a suitable text channel to send the welcome message
  const systemChannel = guild.systemChannel;
  let targetChannel: TextChannel | undefined;

  if (systemChannel && systemChannel.permissionsFor(client.user!)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
    targetChannel = systemChannel;
  } else {
    // Fallback to the first available text channel
    const channels = guild.channels.cache.filter(c => c.isTextBased() && c.permissionsFor(client.user!)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]));
    targetChannel = channels.first() as TextChannel;
  }

  if (targetChannel) {
    const embed = buildEmbed()
      .setTitle('Get started!')
      .setDescription(`**Create temporary channels:**\n\`/setup\` commands can be used to set temporary channels.\n\`/setup\`\n\n**Set up bot settings:**\n\`/voice\` commands can be used to set up certain settings.\n\`/voice limit\`\n\`/voice private\`\n\`/voice permit\`\n\`/voice reject\`\n\nTo reset the above commands use:\n\`/voice reset\`\n\n**Toggle commands:**\n\`/toggle\` commands can be used to toggle commands/features on/off.\n\`/toggle list\`\n\`/toggle set\`\n\n**User Interface:**\n\`/interface\` can be used to send the temporary channel control interface to any channel of your liking for easy access.\n\n**Need help?**\nIf you're experiencing issues with the bot, you can:\n• Use \`/troubleshoot\` to diagnose permission and setup issues\n• Check the documentation below\n• Join our support server\n• Use the dashboard for advanced configuration\n• Contact support if problems persist`)
      .setFooter({ text: 'Description for each command can be found when you click on the command.' });

    try {
      await targetChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('[GuildCreate] Failed to send welcome message:', error);
    }
  }
};
