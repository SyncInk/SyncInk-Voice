import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { ENV } from '../../config/config';
import { EMOJIS } from './emojis';

export const getPanelButtons = () => {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_load_settings')
      .setLabel('Load Settings')
      .setEmoji(EMOJIS.raw.settings)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_refresh_panel')
      .setLabel('Refresh Panel')
      .setEmoji(EMOJIS.raw.checkyes)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setLabel('Dashboard')
      .setURL(ENV.DASHBOARD_URL || 'https://discord.com')
      .setStyle(ButtonStyle.Link),
  );

  return [row];
};

export const getPanelDropdowns = () => {
  const ts = Date.now();
  const settingsMenu = new StringSelectMenuBuilder()
    .setCustomId(`menu_settings_${ts}`)
    .setPlaceholder('Room Settings')
    .addOptions(
      { label: 'Name', description: 'Change the channel name', value: 'opt_rename', emoji: EMOJIS.raw.mic },
      { label: 'Limit', description: 'Change the channel user limit', value: 'opt_limit', emoji: EMOJIS.raw.members },
      { label: 'Status', description: 'Change the channel status or topic', value: 'opt_status', emoji: EMOJIS.raw.suggestion },
      { label: 'Game', description: 'Rename the channel to your current game', value: 'opt_game', emoji: EMOJIS.raw.settings },
      { label: 'LFM', description: 'Post a looking-for-members message', value: 'opt_lfm', emoji: EMOJIS.raw.alert },
      { label: 'Bitrate', description: 'Adjust audio quality', value: 'opt_bitrate', emoji: EMOJIS.raw.volume },
      { label: 'Region', description: 'Change the voice server region', value: 'opt_region', emoji: EMOJIS.raw.earth },
      { label: 'Text', description: 'Create a temporary text chat', value: 'opt_text', emoji: EMOJIS.raw.text },
      { label: 'NSFW', description: 'Toggle NSFW restriction', value: 'opt_nsfw', emoji: EMOJIS.raw.nsfw },
      { label: 'Claim', description: 'Claim ownership if owner leaves', value: 'opt_claim', emoji: EMOJIS.raw.host },
    );

  const usersMenu = new StringSelectMenuBuilder()
    .setCustomId(`menu_users_${ts}`)
    .setPlaceholder('Room Permissions')
    .addOptions(
      { label: 'Lock', description: 'Lock the channel to everyone', value: 'opt_lock', emoji: EMOJIS.raw.locked },
      { label: 'Unlock', description: 'Unlock the channel for everyone', value: 'opt_unlock', emoji: EMOJIS.raw.unlocked },
      { label: 'Permit', description: 'Allow a user or role to join', value: 'opt_permit', emoji: EMOJIS.raw.shieldCheck },
      { label: 'Reject', description: 'Kick and deny a user or role', value: 'opt_reject', emoji: EMOJIS.raw.refused },
      { label: 'Invite', description: 'Generate an invite link', value: 'opt_invite', emoji: EMOJIS.raw.invite },
      { label: 'Ghost', description: 'Hide the channel from the channel list', value: 'opt_hide', emoji: EMOJIS.raw.shield },
      { label: 'Unghost', description: 'Make the channel visible again', value: 'opt_unhide', emoji: EMOJIS.raw.shieldCheck },
      { label: 'Transfer', description: 'Transfer ownership to another user', value: 'opt_transfer', emoji: EMOJIS.raw.host },
    );

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(settingsMenu),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(usersMenu),
  ];
};
