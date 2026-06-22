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
    new ButtonBuilder()
      .setLabel('Dashboard')
      .setURL(ENV.DASHBOARD_URL || 'https://discord.com')
      .setStyle(ButtonStyle.Link),
  );

  return [row];
};

export const getPanelDropdowns = () => {
  const settingsMenu = new StringSelectMenuBuilder()
    .setCustomId('menu_settings')
    .setPlaceholder('Change the look of your room')
    .addOptions(
      { label: 'Name', description: 'Change the channel name', value: 'opt_rename' },
      { label: 'Limit', description: 'Change the channel user limit', value: 'opt_limit' },
      { label: 'Status', description: 'Change the channel status or topic', value: 'opt_status' },
      { label: 'Game', description: 'Rename the channel to your current game', value: 'opt_game' },
      { label: 'LFM', description: 'Post a looking-for-members message', value: 'opt_lfm' },
      { label: 'Bitrate', description: 'Adjust audio quality', value: 'opt_bitrate' },
      { label: 'Region', description: 'Change the voice server region', value: 'opt_region' },
      { label: 'Text', description: 'Create a temporary text chat', value: 'opt_text' },
      { label: 'NSFW', description: 'Toggle NSFW restriction', value: 'opt_nsfw' },
      { label: 'Claim', description: 'Claim ownership if owner leaves', value: 'opt_claim' },
    );

  const usersMenu = new StringSelectMenuBuilder()
    .setCustomId('menu_users')
    .setPlaceholder('Change access to your room')
    .addOptions(
      { label: 'Lock', description: 'Lock the channel to everyone', value: 'opt_lock' },
      { label: 'Unlock', description: 'Unlock the channel for everyone', value: 'opt_unlock' },
      { label: 'Permit', description: 'Allow a user or role to join', value: 'opt_permit' },
      { label: 'Reject', description: 'Kick and deny a user or role', value: 'opt_reject' },
      { label: 'Invite', description: 'Generate an invite link', value: 'opt_invite' },
      { label: 'Ghost', description: 'Hide the channel from the channel list', value: 'opt_hide' },
      { label: 'Unghost', description: 'Make the channel visible again', value: 'opt_unhide' },
      { label: 'Transfer', description: 'Transfer ownership to another user', value: 'opt_transfer' },
    );

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(settingsMenu),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(usersMenu),
  ];
};
