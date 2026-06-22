import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { ENV } from '../../config/config';

export const getPanelButtons = () => {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_load_settings')
      .setLabel('Apply Defaults')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_refresh_panel')
      .setLabel('Save To Defaults')
      .setStyle(ButtonStyle.Secondary),
  );

  return [row];
};

export const getPanelDropdowns = () => {
  const settingsMenu = new StringSelectMenuBuilder()
    .setCustomId('menu_settings')
    .setPlaceholder('Change the look of your room')
    .addOptions(
      { label: 'Name', description: 'Change the channel name', value: 'opt_rename', emoji: '📝' },
      { label: 'Limit', description: 'Change the channel user limit', value: 'opt_limit', emoji: '👥' },
      { label: 'Status', description: 'Change the channel status/topic', value: 'opt_status', emoji: '💬' },
      { label: 'Game', description: "Rename the channel to the game you're playing", value: 'opt_game', emoji: '🎮' },
      { label: 'LFM', description: 'Post a looking-for-members message', value: 'opt_lfm', emoji: '📢' },
      { label: 'Bitrate', description: 'Change the channel bitrate', value: 'opt_bitrate', emoji: '📻' },
      { label: 'Region', description: 'Change or reset the voice region', value: 'opt_region', emoji: '🌍' },
      { label: 'Text', description: 'Create a temporary text channel', value: 'opt_text', emoji: '💬' },
      { label: 'NSFW', description: 'Toggle NSFW for the voice and text channels', value: 'opt_nsfw', emoji: '🔞' },
      { label: 'Claim', description: 'Claim ownership when the owner leaves', value: 'opt_claim', emoji: '👑' },
    );

  const usersMenu = new StringSelectMenuBuilder()
    .setCustomId('menu_users')
    .setPlaceholder('Change access to your room')
    .addOptions(
      { label: 'Lock', description: 'Lock the channel', value: 'opt_lock', emoji: '🔒' },
      { label: 'Unlock', description: 'Unlock the channel', value: 'opt_unlock', emoji: '🔓' },
      { label: 'Permit', description: 'Permit a user or role', value: 'opt_permit', emoji: '✅' },
      { label: 'Reject', description: 'Reject or kick a user or role', value: 'opt_reject', emoji: '❌' },
      { label: 'Invite', description: 'Create an invite for a user', value: 'opt_invite', emoji: '💌' },
      { label: 'Ghost', description: 'Make the channel invisible', value: 'opt_hide', emoji: '👻' },
      { label: 'Unghost', description: 'Make the channel visible', value: 'opt_unhide', emoji: '👁️' },
      { label: 'Transfer', description: 'Transfer ownership to another user', value: 'opt_transfer', emoji: '🔄' },
    );

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(settingsMenu),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(usersMenu),
  ];
};
