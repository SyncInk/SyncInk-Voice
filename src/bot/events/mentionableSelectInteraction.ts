import { MentionableSelectMenuInteraction, VoiceChannel } from 'discord.js';
import { TempChannel } from '../../database/models/TempChannel';
import { GuildSettings } from '../../database/models/GuildSettings';
import { buildRoomEmbed, clearOwnershipWarning, refreshRoomPanel } from '../utils/tempRoom';
import { ENV } from '../../config/config';

const getTempChannelFromInteraction = async (interaction: MentionableSelectMenuInteraction) => {
  if (!interaction.channelId) {
    return null;
  }

  return TempChannel.findOne({
    $or: [{ panelChannelId: interaction.channelId }, { textChannelId: interaction.channelId }],
  });
};

export const handleMentionableSelectMenuInteraction = async (interaction: MentionableSelectMenuInteraction) => {
  const guild = interaction.guild;
  const member = guild?.members.cache.get(interaction.user.id);

  if (!guild || !member) {
    return;
  }

  const tempChannel = await getTempChannelFromInteraction(interaction);
  if (!tempChannel || tempChannel.ownerId !== interaction.user.id) {
    return interaction.reply({
      embeds: [buildRoomEmbed('Owner only', 'Only the current room owner can use these controls.')],
      ephemeral: true,
    });
  }

  const channel = guild.channels.cache.get(tempChannel.channelId) as VoiceChannel | undefined;
  if (!channel) {
    return interaction.reply({
      embeds: [buildRoomEmbed('Voice channel missing') ],
      ephemeral: true,
    });
  }

  const settings = await GuildSettings.findOne({ guildId: guild.id }).catch(() => null);
  const targetId = interaction.values[0];
  const isRole = interaction.roles.has(targetId);
  const targetMember = guild.members.cache.get(targetId);
  const mention = `<@${isRole ? '&' : ''}${targetId}>`;

  try {
    if (interaction.customId === 'mentionable_opt_permit') {
      if (!isRole && !tempChannel.permittedUsers.includes(targetId)) {
        tempChannel.permittedUsers.push(targetId);
      }
      tempChannel.deniedUsers = tempChannel.deniedUsers.filter((id) => id !== targetId);
      await tempChannel.save();
      await channel.permissionOverwrites.edit(targetId, { Connect: true, ViewChannel: true });

      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.update({
        embeds: [buildRoomEmbed('Access permitted', `${mention} can now access the room.`)],
        components: [],
      });
    }

    if (interaction.customId === 'mentionable_opt_invite') {
      if (isRole || !targetMember) {
        return interaction.update({
          embeds: [buildRoomEmbed('Select a user', 'Invites can only be sent to users, not roles.')],
          components: [],
        });
      }

      await channel.permissionOverwrites.edit(targetId, { Connect: true, ViewChannel: true });
      if (!tempChannel.permittedUsers.includes(targetId)) {
        tempChannel.permittedUsers.push(targetId);
        await tempChannel.save();
      }

      const invite = await channel.createInvite({
        maxAge: 86400,
        maxUses: 1,
        unique: true,
        reason: `Temporary room invite from ${interaction.user.tag}`,
      });

      await targetMember.send({
        embeds: [
          buildRoomEmbed(
            'Voice room invite',
            `<@${interaction.user.id}> invited you to join **${channel.name}**.\n${invite.url}`,
          ),
        ],
      }).catch(() => null);

      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.update({
        embeds: [buildRoomEmbed('Invite created', `Invite for <@${targetId}>: ${invite.url}`)],
        components: [],
      });
    }

    if (interaction.customId === 'mentionable_opt_reject' || interaction.customId === 'mentionable_opt_kick') {
      if (!isRole) {
        tempChannel.permittedUsers = tempChannel.permittedUsers.filter((id) => id !== targetId);
        if (!tempChannel.deniedUsers.includes(targetId)) {
          tempChannel.deniedUsers.push(targetId);
        }
        await tempChannel.save();
      }

      await channel.permissionOverwrites.edit(targetId, { Connect: false });

      if (!isRole && targetMember?.voice.channelId === channel.id) {
        await targetMember.voice.disconnect('Rejected by room owner');
      }

      if (isRole) {
        for (const [memberId, voiceMember] of channel.members) {
          if (voiceMember.roles.cache.has(targetId) && memberId !== tempChannel.ownerId) {
            await voiceMember.voice.disconnect('Role rejected by room owner');
          }
        }
      }

      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.update({
        embeds: [buildRoomEmbed('Access rejected', `${mention} can no longer access the room.`)],
        components: [],
      });
    }

    if (interaction.customId === 'mentionable_opt_transfer') {
      if (isRole) {
        return interaction.update({
          embeds: [buildRoomEmbed('Select a user', 'Ownership cannot be transferred to a role.')],
          components: [],
        });
      }

      if (!targetMember || targetMember.voice.channelId !== channel.id) {
        return interaction.update({
          embeds: [buildRoomEmbed('User must be in the room', 'The new owner must already be connected to this voice channel.')],
          components: [],
        });
      }

      tempChannel.ownerId = targetId;
      await tempChannel.save();
      await clearOwnershipWarning(guild, tempChannel, 'transferred').catch(() => null);

      await refreshRoomPanel(channel, tempChannel, targetMember, settings, ENV.DASHBOARD_URL || undefined);
      await interaction.update({
        embeds: [buildRoomEmbed('Ownership transferred', `<@${targetId}> is now the owner of this room.`)],
        components: [],
      });
      await channel.send({ embeds: [buildRoomEmbed('New room owner', `<@${targetId}> is now the owner of this room.`)] }).catch(() => null);
    }
  } catch (error) {
    console.error('[MentionableSelect] Error:', error);
    const payload = {
      embeds: [buildRoomEmbed('Action failed', 'I could not apply that change. Check my channel permissions and try again.')],
      components: [],
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(payload);
    } else {
      await interaction.reply({ ...payload, ephemeral: true });
    }
  }
};
