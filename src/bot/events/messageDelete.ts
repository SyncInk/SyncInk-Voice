import { Message } from 'discord.js';
import { TempChannel } from '../../database/models/TempChannel';
import { ENV } from '../../config/config';
import { restoreRoomPanel, shouldIgnorePanelDeletion } from '../utils/tempRoom';

export const handleMessageDelete = async (message: Message | any) => {
  if (!message.guildId) {
    return;
  }

  if (shouldIgnorePanelDeletion(message.id)) {
    return;
  }

  const tempChannel = await TempChannel.findOne({ panelMessageId: message.id });
  if (!tempChannel) {
    return;
  }

  if (tempChannel.panelChannelId && message.channelId && tempChannel.panelChannelId !== message.channelId) {
    return;
  }

  const guild = message.guild ?? message.client.guilds.cache.get(tempChannel.guildId);
  if (!guild) {
    return;
  }

  await restoreRoomPanel(guild, tempChannel, ENV.DASHBOARD_URL || undefined).catch((error) => {
    console.error('[MessageDelete] Failed to restore panel:', error);
  });
};
