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
      { label: 'Name', description: 'Change the channel name', value: 'opt_rename', emoji: { name: 'syncinkvoicename', id: '1517255773405577416' } },
      { label: 'Limit', description: 'Change the channel user limit', value: 'opt_limit', emoji: { name: 'syncinkvoicelimit', id: '1517255341698453554' } },
      { label: 'Status', description: 'Change the channel status or topic', value: 'opt_status', emoji: { name: 'syncinkvoicestatus', id: '1517256854361870386' } },
      { label: 'Game', description: 'Rename the channel to your current game', value: 'opt_game', emoji: { name: 'syncinkvoicegame', id: '1517253861897801918' } },
      { label: 'LFM', description: 'Post a looking-for-members message', value: 'opt_lfm', emoji: { name: 'syncinkvoiceLFM', id: '1517255135846203635' } },
      { label: 'Bitrate', description: 'Adjust audio quality', value: 'opt_bitrate', emoji: { name: 'syncinkvoicebitrate', id: '1517253080716935332' } },
      { label: 'Region', description: 'Change the voice server region', value: 'opt_region', emoji: { name: 'syncinkvoiceregion', id: '1517256470230732840' } },
      { label: 'Text', description: 'Create a temporary text chat', value: 'opt_text', emoji: { name: 'syncinkvoicetext', id: '1517256986901614732' } },
      { label: 'NSFW', description: 'Toggle NSFW restriction', value: 'opt_nsfw', emoji: { name: 'syncinkvoiceNSFW', id: '1517255998761337014' } },
      { label: 'Claim', description: 'Claim ownership if owner leaves', value: 'opt_claim', emoji: { name: 'syncinkvoiceclaimtransfer', id: '1517253606686986323' } },
    );

  const usersMenu = new StringSelectMenuBuilder()
    .setCustomId('menu_users')
    .setPlaceholder('Change access to your room')
    .addOptions(
      { label: 'Lock', description: 'Lock the channel to everyone', value: 'opt_lock', emoji: { name: 'syncinkvoicelock', id: '1517255505490215212' } },
      { label: 'Unlock', description: 'Unlock the channel for everyone', value: 'opt_unlock', emoji: { name: 'syncinkvoiceunlock', id: '1517257209371820052' } },
      { label: 'Permit', description: 'Allow a user or role to join', value: 'opt_permit', emoji: { name: 'syncinkvoicepermit', id: '1517256162968338633' } },
      { label: 'Reject', description: 'Kick and deny a user or role', value: 'opt_reject', emoji: { name: 'syncinkvoicereject', id: '1517256700221198447' } },
      { label: 'Invite', description: 'Generate an invite link', value: 'opt_invite', emoji: { name: 'syncinkvoiceinvite', id: '1517254877632266280' } },
      { label: 'Ghost', description: 'Hide the channel from the channel list', value: 'opt_hide', emoji: { name: 'syncinkvoiceghost', id: '1517254528158666824' } },
      { label: 'Unghost', description: 'Make the channel visible again', value: 'opt_unhide', emoji: { name: 'syncinkvoiceunghost', id: '1517254681083248761' } },
      { label: 'Transfer', description: 'Transfer ownership to another user', value: 'opt_transfer', emoji: { name: 'syncinkvoiceclaimtransfer', id: '1517253606686986323' } },
    );

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(settingsMenu),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(usersMenu),
  ];
};
