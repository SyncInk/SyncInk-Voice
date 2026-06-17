import { MentionableSelectMenuInteraction, VoiceChannel } from 'discord.js';
import { TempChannel } from '../../database/models/TempChannel';

export const handleMentionableSelectMenuInteraction = async (interaction: MentionableSelectMenuInteraction) => {
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

  const selectedTarget = interaction.values[0]; // This is the ID of the user or role
  const isRole = interaction.roles.has(selectedTarget);
  const targetId = selectedTarget;
  const targetMember = interaction.guild?.members.cache.get(targetId);

  try {
    if (interaction.customId === 'mentionable_opt_permit') {
      if (!isRole && !tempChannel.permittedUsers.includes(targetId)) {
        tempChannel.permittedUsers.push(targetId);
        await tempChannel.save();
      }
      await channel.permissionOverwrites.edit(targetId, { Connect: true, ViewChannel: true });
      await interaction.update({ content: `✅ Permitted <@${isRole ? '&' : ''}${targetId}> to join the room.`, components: [] });
      return;
    }

    if (interaction.customId === 'mentionable_opt_reject' || interaction.customId === 'mentionable_opt_kick') {
      if (!isRole) {
        tempChannel.permittedUsers = tempChannel.permittedUsers.filter(id => id !== targetId);
        if (!tempChannel.deniedUsers.includes(targetId)) tempChannel.deniedUsers.push(targetId);
        await tempChannel.save();
      }
      await channel.permissionOverwrites.edit(targetId, { Connect: false });
      
      // If it's a user and they are in the channel, kick them
      if (!isRole && targetMember && targetMember.voice.channelId === channel.id) {
        await targetMember.voice.disconnect('Rejected by owner');
      }
      // If it's a role, kick anyone with that role in the channel
      if (isRole) {
        for (const [memberId, chanMember] of channel.members) {
          if (chanMember.roles.cache.has(targetId) && memberId !== tempChannel.ownerId) {
            await chanMember.voice.disconnect('Role rejected by owner');
          }
        }
      }
      
      await interaction.update({ content: `❌ Rejected <@${isRole ? '&' : ''}${targetId}> from the room.`, components: [] });
      return;
    }

    if (interaction.customId === 'mentionable_opt_transfer') {
      if (isRole) {
        return interaction.update({ content: '❌ You cannot transfer ownership to a role. Please select a user.', components: [] });
      }
      if (!targetMember || targetMember.voice.channelId !== channel.id) {
        return interaction.update({ content: '❌ The target user must be in the voice channel to transfer ownership.', components: [] });
      }
      tempChannel.ownerId = targetId;
      await tempChannel.save();
      
      // Update the message and ping the new owner inside the VC text chat so everyone knows
      await interaction.update({ content: `👑 Ownership successfully transferred to <@${targetId}>.`, components: [] });
      await channel.send({ content: `<@${targetId}> is now the owner of this room.` });
      return;
    }
  } catch (error) {
    console.error('[MentionableSelect] Error:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content: '❌ An error occurred applying the changes.', components: [] });
    } else {
      await interaction.reply({ content: '❌ An error occurred applying the changes.', ephemeral: true });
    }
  }
};
