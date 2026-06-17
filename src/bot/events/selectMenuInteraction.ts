import { StringSelectMenuInteraction, VoiceChannel, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { TempChannel } from '../../database/models/TempChannel';

export const handleSelectMenuInteraction = async (interaction: StringSelectMenuInteraction) => {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (!member || !member.voice.channelId) {
    return interaction.reply({ content: 'You are not in a voice channel.', ephemeral: true });
  }

  const tempChannel = await TempChannel.findOne({ channelId: member.voice.channelId });
  if (!tempChannel || tempChannel.ownerId !== interaction.user.id) {
    return interaction.reply({ content: 'Only the channel owner can use these controls.', ephemeral: true });
  }

  const value = interaction.values[0];

  switch (value) {
    case 'opt_rename':
    case 'opt_game':
    case 'opt_status': {
      const modal = new ModalBuilder().setCustomId('modal_rename').setTitle('Rename Channel');
      const input = new TextInputBuilder().setCustomId('input_name').setLabel('New Channel Name').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      return interaction.showModal(modal);
    }
    case 'opt_limit': {
      const modal = new ModalBuilder().setCustomId('modal_limit').setTitle('Set User Limit');
      const input = new TextInputBuilder().setCustomId('input_limit').setLabel('Max Users (0 for unlimited)').setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      return interaction.showModal(modal);
    }
    case 'opt_bitrate': {
      const modal = new ModalBuilder().setCustomId('modal_bitrate').setTitle('Change Bitrate');
      const input = new TextInputBuilder().setCustomId('input_bitrate').setLabel('Bitrate in kbps (8 - 96)').setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      return interaction.showModal(modal);
    }
    case 'opt_text': {
      await interaction.update({ components: interaction.message.components });
      return interaction.followUp({ content: 'Use the `/voice text` slash command to create a text channel.', ephemeral: true });
    }
    case 'opt_lfm':
    case 'opt_nsfw':
    case 'opt_region': {
      await interaction.update({ components: interaction.message.components });
      return interaction.followUp({ content: 'This feature will be available in the Dashboard settings soon!', ephemeral: true });
    }
    case 'opt_claim': {
      await interaction.update({ components: interaction.message.components });
      return interaction.followUp({ content: 'Use the `/voice claim` slash command to take ownership.', ephemeral: true });
    }
    case 'opt_lock': {
      const channel = interaction.guild?.channels.cache.get(tempChannel.channelId) as VoiceChannel;
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: false });
      await interaction.update({ components: interaction.message.components });
      return interaction.followUp({ content: '🔒 Room is now **Locked**.', ephemeral: true });
    }
    case 'opt_unlock': {
      const channel = interaction.guild?.channels.cache.get(tempChannel.channelId) as VoiceChannel;
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: null });
      await interaction.update({ components: interaction.message.components });
      return interaction.followUp({ content: '🔓 Room is now **Unlocked**.', ephemeral: true });
    }
    case 'opt_hide': {
      const channel = interaction.guild?.channels.cache.get(tempChannel.channelId) as VoiceChannel;
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { ViewChannel: false });
      await interaction.update({ components: interaction.message.components });
      return interaction.followUp({ content: '👻 Room is now **Hidden**.', ephemeral: true });
    }
    case 'opt_unhide': {
      const channel = interaction.guild?.channels.cache.get(tempChannel.channelId) as VoiceChannel;
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { ViewChannel: null });
      await interaction.update({ components: interaction.message.components });
      return interaction.followUp({ content: '👁️ Room is now **Visible**.', ephemeral: true });
    }
    case 'opt_permit':
    case 'opt_reject':
    case 'opt_invite':
    case 'opt_transfer': {
      await interaction.update({ components: interaction.message.components });
      const mappedAction = value === 'opt_invite' ? 'opt_permit' : value;
      let label = 'Select a member/role to permit';
      if (value === 'opt_reject') label = 'Select a member/role to reject';
      if (value === 'opt_transfer') label = 'Select a member to transfer ownership to';
      
      const { MentionableSelectMenuBuilder } = require('discord.js');
      const select = new MentionableSelectMenuBuilder()
        .setCustomId(`mentionable_${mappedAction}`)
        .setPlaceholder(label);
        
      const row = new ActionRowBuilder<any>().addComponents(select);
      return interaction.followUp({ content: `**${label}:**`, components: [row], ephemeral: true });
    }
    default:
      await interaction.update({ components: interaction.message.components });
      return interaction.followUp({ content: 'Unknown option selected.', ephemeral: true });
  }
};
