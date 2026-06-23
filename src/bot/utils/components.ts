import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { ENV } from '../../config/config';

export const getPanelButtons = () => {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_load_settings')
      .setLabel('Load Settings')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_refresh_panel')
      .setLabel('Refresh Panel')
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
    .setPlaceholder('Room Settings')
    .addOptions(
      { label: 'Name', description: 'Change the channel name', value: 'opt_rename', emoji: { id: '1517255773405577416', name: 'syncinkvoicename' } },
      { label: 'Limit', description: 'Change the channel user limit', value: 'opt_limit', emoji: { id: '1517255341698453554', name: 'syncinkvoicelimit' } },
      { label: 'Status', description: 'Change the channel status or topic', value: 'opt_status', emoji: { id: '1517256854361870386', name: 'syncinkvoicestatus' } },
      { label: 'Game', description: 'Rename the channel to your current game', value: 'opt_game', emoji: { id: '1517253861897801918', name: 'syncinkvoicegame' } },
      { label: 'LFM', description: 'Post a looking-for-members message', value: 'opt_lfm', emoji: { id: '1517255135846203635', name: 'syncinkvoicelfm' } },
      { label: 'Bitrate', description: 'Adjust audio quality', value: 'opt_bitrate', emoji: { id: '1517253080716935332', name: 'syncinkvoicebitrate' } },
      { label: 'Region', description: 'Change the voice server region', value: 'opt_region', emoji: { id: '1517256470230732840', name: 'syncinkvoiceregion' } },
      { label: 'Text', description: 'Create a temporary text chat', value: 'opt_text', emoji: { id: '1517256986901614732', name: 'syncinkvoicetext' } },
      { label: 'NSFW', description: 'Toggle NSFW restriction', value: 'opt_nsfw', emoji: { id: '1517255998761337014', name: 'syncinkvoicensfw' } },
      { label: 'Claim', description: 'Claim ownership if owner leaves', value: 'opt_claim', emoji: { id: '1517253606686986323', name: 'syncinkvoiceclaimtransfer' } },
    );

  const usersMenu = new StringSelectMenuBuilder()
    .setCustomId('menu_users')
    .setPlaceholder('Room Permissions')
    .addOptions(
      { label: 'Lock', description: 'Lock the channel to everyone', value: 'opt_lock', emoji: { id: '1517255505490215212', name: 'syncinkvoicelock' } },
      { label: 'Unlock', description: 'Unlock the channel for everyone', value: 'opt_unlock', emoji: { id: '1517257209371820052', name: 'syncinkvoiceunlock' } },
      { label: 'Permit', description: 'Allow a user or role to join', value: 'opt_permit', emoji: { id: '1517256162968338633', name: 'syncinkvoicepermit' } },
      { label: 'Reject', description: 'Kick and deny a user or role', value: 'opt_reject', emoji: { id: '1517256700221198447', name: 'syncinkvoicereject' } },
      { label: 'Invite', description: 'Generate an invite link', value: 'opt_invite', emoji: { id: '1517254877632266280', name: 'syncinkvoiceinvite' } },
      { label: 'Ghost', description: 'Hide the channel from the channel list', value: 'opt_hide', emoji: { id: '1517254528158666824', name: 'syncinkvoiceghost' } },
      { label: 'Unghost', description: 'Make the channel visible again', value: 'opt_unhide', emoji: { id: '1517254681083248761', name: 'syncinkvoiceunghost' } },
      { label: 'Transfer', description: 'Transfer ownership to another user', value: 'opt_transfer', emoji: { id: '1517253606686986323', name: 'syncinkvoiceclaimtransfer' } },
    );

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(settingsMenu),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(usersMenu),
  ];
};
