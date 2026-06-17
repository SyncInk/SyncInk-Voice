import { ModalSubmitInteraction, VoiceChannel } from 'discord.js';
import { TempChannel } from '../../database/models/TempChannel';

export const handleModalSubmit = async (interaction: ModalSubmitInteraction) => {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (!member || !member.voice.channelId) {
    return interaction.reply({ content: 'You are not in a voice channel.', ephemeral: true });
  }

  const tempChannel = await TempChannel.findOne({ channelId: member.voice.channelId });
  if (!tempChannel || tempChannel.ownerId !== interaction.user.id) {
    return interaction.reply({ content: 'Only the channel owner can use these controls.', ephemeral: true });
  }

  const channel = interaction.guild?.channels.cache.get(tempChannel.channelId) as VoiceChannel;
  if (!channel) return;

  try {
    if (interaction.customId === 'modal_rename') {
      const newName = interaction.fields.getTextInputValue('input_name');
      await channel.setName(newName);
      return interaction.reply({ content: `✅ Channel renamed to **${newName}**`, ephemeral: true });
    }

    if (interaction.customId === 'modal_limit') {
      const limitStr = interaction.fields.getTextInputValue('input_limit');
      const limit = parseInt(limitStr);
      if (isNaN(limit) || limit < 0 || limit > 99) {
        return interaction.reply({ content: '❌ Invalid limit. Must be between 0 and 99.', ephemeral: true });
      }
      await channel.setUserLimit(limit);
      tempChannel.userLimit = limit;
      await tempChannel.save();
      return interaction.reply({ content: `✅ User limit set to **${limit === 0 ? 'Unlimited' : limit}**`, ephemeral: true });
    }

    if (interaction.customId === 'modal_bitrate') {
      const bitrateStr = interaction.fields.getTextInputValue('input_bitrate');
      const bitrate = parseInt(bitrateStr);
      if (isNaN(bitrate) || bitrate < 8 || bitrate > 96) {
        return interaction.reply({ content: '❌ Invalid bitrate. Must be between 8 and 96 kbps.', ephemeral: true });
      }
      await channel.setBitrate(bitrate * 1000);
      tempChannel.bitrate = bitrate * 1000;
      await tempChannel.save();
      return interaction.reply({ content: `✅ Bitrate set to **${bitrate} kbps**`, ephemeral: true });
    }

    if (interaction.customId.startsWith('modal_opt_')) {
      const targetId = interaction.fields.getTextInputValue('input_userid');
      const targetMember = interaction.guild?.members.cache.get(targetId);
      
      if (!targetMember) {
        return interaction.reply({ content: '❌ User not found in this server. Make sure to provide a valid User ID.', ephemeral: true });
      }

      if (interaction.customId === 'modal_opt_permit') {
        if (!tempChannel.permittedUsers.includes(targetId)) {
          tempChannel.permittedUsers.push(targetId);
          await tempChannel.save();
        }
        await channel.permissionOverwrites.edit(targetId, { Connect: true, ViewChannel: true });
        return interaction.reply({ content: `✅ Permitted <@${targetId}> to join the room.`, ephemeral: true });
      }

      if (interaction.customId === 'modal_opt_reject' || interaction.customId === 'modal_opt_kick') {
        tempChannel.permittedUsers = tempChannel.permittedUsers.filter(id => id !== targetId);
        if (!tempChannel.deniedUsers.includes(targetId)) tempChannel.deniedUsers.push(targetId);
        await tempChannel.save();
        await channel.permissionOverwrites.edit(targetId, { Connect: false });
        if (targetMember.voice.channelId === channel.id) {
          await targetMember.voice.disconnect('Rejected by owner');
        }
        return interaction.reply({ content: `❌ Rejected <@${targetId}> from the room.`, ephemeral: true });
      }

      if (interaction.customId === 'modal_opt_transfer') {
        if (targetMember.voice.channelId !== channel.id) {
          return interaction.reply({ content: '❌ The target user must be in the voice channel to transfer ownership.', ephemeral: true });
        }
        tempChannel.ownerId = targetId;
        await tempChannel.save();
        return interaction.reply({ content: `👑 Ownership transferred to <@${targetId}>.`, ephemeral: false });
      }
    }
  } catch (error) {
    console.error('[Modal] Error:', error);
    return interaction.reply({ content: '❌ An error occurred applying the changes.', ephemeral: true });
  }
};
