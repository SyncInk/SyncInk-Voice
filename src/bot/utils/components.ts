import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { ENV } from '../../config/config';

export const getPanelButtons = () => {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_load_settings')
      .setLabel('Load Settings')
      .setStyle(ButtonStyle.Primary),
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
    .setPlaceholder('Room settings')
    .addOptions(
      { label: 'Name', description: 'Change the channel name', value: 'opt_rename' },
      { label: 'Limit', description: 'Change the channel user limit', value: 'opt_limit' },
      { label: 'Status', description: 'Change the channel status/topic', value: 'opt_status' },
      { label: 'Game', description: "Rename the channel to the game you're playing", value: 'opt_game' },
      { label: 'LFM', description: 'Post a looking-for-members message', value: 'opt_lfm' },
      { label: 'Bitrate', description: 'Change the channel bitrate', value: 'opt_bitrate' },
      { label: 'Region', description: 'Change or reset the voice region', value: 'opt_region' },
      { label: 'Text', description: 'Create or sync a temporary text channel', value: 'opt_text' },
      { label: 'NSFW', description: 'Toggle the room text channel NSFW setting', value: 'opt_nsfw' },
      { label: 'Claim', description: 'Claim ownership when the owner leaves', value: 'opt_claim' },
    );

  const usersMenu = new StringSelectMenuBuilder()
    .setCustomId('menu_users')
    .setPlaceholder('Permissions and ownership')
    .addOptions(
      { label: 'Lock', description: 'Lock the channel', value: 'opt_lock' },
      { label: 'Unlock', description: 'Unlock the channel', value: 'opt_unlock' },
      { label: 'Permit', description: 'Permit a user or role', value: 'opt_permit' },
      { label: 'Reject', description: 'Reject or kick a user or role', value: 'opt_reject' },
      { label: 'Invite', description: 'Create an invite for a user', value: 'opt_invite' },
      { label: 'Ghost', description: 'Make the channel invisible', value: 'opt_hide' },
      { label: 'Unghost', description: 'Make the channel visible', value: 'opt_unhide' },
      { label: 'Transfer', description: 'Transfer ownership to another user', value: 'opt_transfer' },
    );

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(settingsMenu),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(usersMenu),
  ];
};
