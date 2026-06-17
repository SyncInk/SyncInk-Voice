import { ButtonInteraction, VoiceChannel, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { TempChannel } from '../../database/models/TempChannel';

export const handleButtonInteraction = async (interaction: ButtonInteraction) => {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (!member || !member.voice.channelId) {
    return interaction.reply({ content: 'You are not in a voice channel.', ephemeral: true });
  }

  const tempChannel = await TempChannel.findOne({ channelId: member.voice.channelId });
  if (!tempChannel) {
    return interaction.reply({ content: 'You are not in a temporary voice channel.', ephemeral: true });
  }

  if (tempChannel.ownerId !== interaction.user.id) {
    return interaction.reply({ content: 'Only the channel owner can use these controls.', ephemeral: true });
  }

  const channel = interaction.guild?.channels.cache.get(tempChannel.channelId) as VoiceChannel;
  if (!channel) return;

  switch (interaction.customId) {
    case 'btn_lock':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: false });
      tempChannel.isLocked = true;
      await tempChannel.save();
      return interaction.reply({ content: '🔒 Channel is now locked.', ephemeral: true });
    
    case 'btn_unlock':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: null });
      tempChannel.isLocked = false;
      await tempChannel.save();
      return interaction.reply({ content: '🔓 Channel is now unlocked.', ephemeral: true });
      
    case 'btn_hide':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { ViewChannel: false });
      tempChannel.isHidden = true;
      await tempChannel.save();
      return interaction.reply({ content: '👻 Channel is now hidden.', ephemeral: true });
      
    case 'btn_unhide':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { ViewChannel: null });
      tempChannel.isHidden = false;
      await tempChannel.save();
      return interaction.reply({ content: '👁️ Channel is now visible.', ephemeral: true });
      
    case 'btn_rename': {
      const modal = new ModalBuilder().setCustomId('modal_rename').setTitle('Rename Channel');
      const input = new TextInputBuilder().setCustomId('input_name').setLabel('New Channel Name').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      return interaction.showModal(modal);
    }
    
    case 'btn_limit': {
      const modal = new ModalBuilder().setCustomId('modal_limit').setTitle('Set User Limit');
      const input = new TextInputBuilder().setCustomId('input_limit').setLabel('Max Users (0 for unlimited)').setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      return interaction.showModal(modal);
    }

    case 'btn_transfer': {
      const modal = new ModalBuilder().setCustomId('modal_opt_transfer').setTitle('Transfer Ownership');
      const input = new TextInputBuilder().setCustomId('input_userid').setLabel('New Owner User ID').setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      return interaction.showModal(modal);
    }

    case 'btn_delete': {
      await interaction.reply({ content: '🗑️ Deleting channel...', ephemeral: true });
      if (tempChannel.textChannelId) {
        const txtChan = interaction.guild!.channels.cache.get(tempChannel.textChannelId);
        if (txtChan) await txtChan.delete();
      }
      await channel.delete();
      await TempChannel.deleteOne({ channelId: tempChannel.channelId });
      return;
    }

    default:
      return interaction.reply({ content: 'Unknown action.', ephemeral: true });
  }
};
