import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { ENV } from '../../config/config';

export const getPanelButtons = () => {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('btn_load_settings').setLabel('Load Settings').setEmoji('⚙️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('Dashboard').setURL(ENV.DASHBOARD_URL).setStyle(ButtonStyle.Link)
  );

  return [row];
};

export const getPanelDropdowns = () => {
  const settingsMenu = new StringSelectMenuBuilder()
    .setCustomId('menu_settings')
    .setPlaceholder('Change channel settings')
    .addOptions(
      { label: 'Name', description: 'Change the channel name', value: 'opt_rename', emoji: '📝' },
      { label: 'Limit', description: 'Change the channel limit', value: 'opt_limit', emoji: '👥' },
      { label: 'Status', description: 'Change the channel status', value: 'opt_status', emoji: '💬' },
      { label: 'Game', description: "Change the channel name to the game you're playing", value: 'opt_game', emoji: '🎮' },
      { label: 'LFM', description: "Post a message to the LFM channel to let others know you're looking for members", value: 'opt_lfm', emoji: '👤' },
      { label: 'Bitrate', description: 'Change the channel bitrate', value: 'opt_bitrate', emoji: '🎚️' },
      { label: 'Region', description: 'Change the channel voice region', value: 'opt_region', emoji: '🌐' },
      { label: 'Text', description: 'Create a temporary text channel', value: 'opt_text', emoji: '#️⃣' },
      { label: 'NSFW', description: 'Set your temporary channel to NSFW', value: 'opt_nsfw', emoji: '⚠️' },
      { label: 'Claim', description: 'Claim ownership of the channel', value: 'opt_claim', emoji: '👑' }
    );

  const usersMenu = new StringSelectMenuBuilder()
    .setCustomId('menu_users')
    .setPlaceholder('Change channel permissions')
    .addOptions(
      { label: 'Lock', description: 'Lock the channel', value: 'opt_lock', emoji: '🔒' },
      { label: 'Unlock', description: 'Unlock the channel', value: 'opt_unlock', emoji: '🔓' },
      { label: 'Permit', description: 'Permit users/roles to access the channel', value: 'opt_permit', emoji: '✅' },
      { label: 'Reject', description: 'Reject/kick users/roles from accessing the channel', value: 'opt_reject', emoji: '❌' },
      { label: 'Invite', description: 'Invite a user to access the channel', value: 'opt_invite', emoji: '➕' },
      { label: 'Ghost', description: 'Make your channel invisible', value: 'opt_hide', emoji: '👻' },
      { label: 'Unghost', description: 'Make your channel visible', value: 'opt_unhide', emoji: '👁️' },
      { label: 'Transfer', description: 'Transfer ownership to another user', value: 'opt_transfer', emoji: '👑' }
    );

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(settingsMenu),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(usersMenu),
  ];
};
