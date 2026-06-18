import { ModalSubmitInteraction, VoiceChannel } from 'discord.js';
import { TempChannel } from '../../database/models/TempChannel';
import { buildRoomEmbed, ensureRoomTextChannel } from '../utils/tempRoom';

export const handleModalSubmit = async (interaction: ModalSubmitInteraction) => {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (!member || !member.voice.channelId) {
    return interaction.reply({
      embeds: [buildRoomEmbed('Join a voice channel first')],
      ephemeral: true,
    });
  }

  const tempChannel = await TempChannel.findOne({ channelId: member.voice.channelId });
  if (!tempChannel || tempChannel.ownerId !== interaction.user.id) {
    return interaction.reply({
      embeds: [buildRoomEmbed('Owner only', 'Only the current room owner can use these controls.')],
      ephemeral: true,
    });
  }

  const channel = interaction.guild?.channels.cache.get(tempChannel.channelId) as VoiceChannel | undefined;
  if (!channel) {
    return interaction.reply({
      embeds: [buildRoomEmbed('Voice channel missing')],
      ephemeral: true,
    });
  }

  try {
    if (interaction.customId === 'modal_rename') {
      const newName = interaction.fields.getTextInputValue('input_name').trim().slice(0, 100);
      await channel.setName(newName);
      return interaction.reply({
        embeds: [buildRoomEmbed('Channel renamed', `Name: ${newName}`)],
        ephemeral: true,
      });
    }

    if (interaction.customId === 'modal_status') {
      const status = interaction.fields.getTextInputValue('input_status').trim().slice(0, 100);
      const textChannel = await ensureRoomTextChannel(channel, tempChannel, 'Temporary room status update');
      await textChannel.setTopic(status);
      tempChannel.status = status;
      await tempChannel.save();
      return interaction.reply({
        embeds: [buildRoomEmbed('Status updated', `Status: ${status}`)],
        ephemeral: true,
      });
    }

    if (interaction.customId === 'modal_limit') {
      const limit = Number.parseInt(interaction.fields.getTextInputValue('input_limit'), 10);
      if (Number.isNaN(limit) || limit < 0 || limit > 99) {
        return interaction.reply({
          embeds: [buildRoomEmbed('Invalid limit', 'Limit must be between 0 and 99.')],
          ephemeral: true,
        });
      }

      await channel.setUserLimit(limit);
      tempChannel.userLimit = limit;
      await tempChannel.save();
      return interaction.reply({
        embeds: [buildRoomEmbed('User limit updated', `Limit: ${limit === 0 ? 'Unlimited' : limit}`)],
        ephemeral: true,
      });
    }

    if (interaction.customId === 'modal_bitrate') {
      const bitrate = Number.parseInt(interaction.fields.getTextInputValue('input_bitrate'), 10);
      if (Number.isNaN(bitrate) || bitrate < 8 || bitrate > 384) {
        return interaction.reply({
          embeds: [buildRoomEmbed('Invalid bitrate', 'Bitrate must be between 8 and 384 kbps.')],
          ephemeral: true,
        });
      }

      const finalBitrate = Math.min(channel.guild.maximumBitrate, bitrate * 1000);
      await channel.setBitrate(finalBitrate);
      tempChannel.bitrate = finalBitrate;
      await tempChannel.save();
      return interaction.reply({
        embeds: [buildRoomEmbed('Bitrate updated', `Bitrate: ${Math.round(finalBitrate / 1000)} kbps`)],
        ephemeral: true,
      });
    }

    if (interaction.customId === 'modal_opt_transfer') {
      const targetId = interaction.fields.getTextInputValue('input_userid').trim();
      const targetMember = interaction.guild?.members.cache.get(targetId);

      if (!targetMember || targetMember.voice.channelId !== channel.id) {
        return interaction.reply({
          embeds: [buildRoomEmbed('User must be in the room', 'The new owner must already be connected to this voice channel.')],
          ephemeral: true,
        });
      }

      tempChannel.ownerId = targetId;
      await tempChannel.save();
      return interaction.reply({
        embeds: [buildRoomEmbed('Ownership transferred', `<@${targetId}> is now the owner of this room.`)],
      });
    }
  } catch (error) {
    console.error('[Modal] Error:', error);
    return interaction.reply({
      embeds: [buildRoomEmbed('Action failed', 'I could not apply that change. Check my permissions and try again.')],
      ephemeral: true,
    });
  }
};
