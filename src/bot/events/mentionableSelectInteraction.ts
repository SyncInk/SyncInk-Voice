import { MentionableSelectMenuInteraction, VoiceChannel } from 'discord.js';
import { TempChannel } from '../../database/models/TempChannel';
import { GuildSettings } from '../../database/models/GuildSettings';
import { buildRoomEmbed, clearOwnershipWarning, refreshRoomPanel, enforceFeature } from '../utils/tempRoom';
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

  await interaction.deferUpdate().catch(() => null);

  const tempChannel = await getTempChannelFromInteraction(interaction);
  if (!tempChannel || tempChannel.ownerId !== interaction.user.id) {
    return interaction.followUp({
      embeds: [buildRoomEmbed('Owner only', 'Only the current room owner can use these controls.')],
      ephemeral: true,
    });
  }

  const channel = guild.channels.cache.get(tempChannel.channelId) as VoiceChannel | undefined;
  if (!channel) {
    return interaction.followUp({
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
      if (!(await enforceFeature(tempChannel, 'permit', interaction))) return;
      if (!isRole && !tempChannel.permittedUsers.includes(targetId)) {
        tempChannel.permittedUsers.push(targetId);
      }
      tempChannel.deniedUsers = tempChannel.deniedUsers.filter((id) => id !== targetId);
      await tempChannel.save();
      await channel.permissionOverwrites.edit(targetId, { Connect: true, ViewChannel: true });

      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);

      const permitMessage = tempChannel.isLocked
        ? `${mention} can now access the room.`
        : `The room is currently unlocked, so everyone can already join. However, ${mention} has been added to the permitted list and will retain access if you lock the room later.`;

      return interaction.editReply({
        embeds: [buildRoomEmbed('<a:approved:1520901996389990440> Access permitted', permitMessage)],
        components: [],
      });
    }

    if (interaction.customId === 'mentionable_opt_invite') {
      if (!(await enforceFeature(tempChannel, 'invite', interaction))) return;
      if (isRole || !targetMember) {
        return interaction.editReply({
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
            '<:sync_invite_people:1519004773297164358> Voice room invite',
            `<@${interaction.user.id}> invited you to join **${channel.name}**.\n${invite.url}`,
          ),
        ],
      }).catch(() => null);

      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.editReply({
        embeds: [buildRoomEmbed('<a:approved:1520901996389990440> Invite created', `Invite for <@${targetId}>: ${invite.url}`)],
        components: [],
      });
    }

    if (interaction.customId === 'mentionable_opt_reject' || interaction.customId === 'mentionable_opt_kick') {
      if (!(await enforceFeature(tempChannel, 'reject', interaction))) return;
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

      const rejectMessage = tempChannel.isLocked
        ? `${mention} can no longer access the room.`
        : `Even though the room is unlocked, ${mention} has been explicitly rejected and can no longer join.`;

      return interaction.editReply({
        embeds: [buildRoomEmbed('<a:refused:1520901852651323593> Access rejected', rejectMessage)],
        components: [],
      });
    }

    if (interaction.customId === 'mentionable_opt_transfer') {
      if (!(await enforceFeature(tempChannel, 'transfer', interaction))) return;
      if (isRole) {
        return interaction.editReply({
          embeds: [buildRoomEmbed('Select a user', 'Ownership cannot be transferred to a role.')],
          components: [],
        });
      }

      if (targetId === tempChannel.ownerId) {
        return interaction.editReply({
          embeds: [buildRoomEmbed('<a:sync_alert:1513822294831534220> Already owner', 'You are already the owner of this room.')],
          components: [],
        });
      }

      if (!targetMember || targetMember.voice.channelId !== channel.id) {
        return interaction.editReply({
          embeds: [buildRoomEmbed('User must be in the room', 'The new owner must already be connected to this voice channel.')],
          components: [],
        });
      }

      tempChannel.ownerId = targetId;
      await tempChannel.save();
      await clearOwnershipWarning(guild, tempChannel, 'transferred').catch(() => null);

      await refreshRoomPanel(channel, tempChannel, targetMember, settings, ENV.DASHBOARD_URL || undefined);
      await interaction.editReply({
        embeds: [buildRoomEmbed('<a:approved:1520901996389990440> Ownership transferred', `<@${targetId}> is now the owner of this room.`)],
        components: [],
      });
      await channel.send({ embeds: [buildRoomEmbed('<a:approved:1520901996389990440> New room owner', `<@${targetId}> is now the owner of this room.`)] }).catch(() => null);
    }
  } catch (error: any) {
    console.error('[MentionableSelect] Error:', error);
    const errorMessage = error?.message || String(error);
    const payload = {
      embeds: [buildRoomEmbed('<a:refused:1520901852651323593> Action failed', `I could not apply that change.\n**Error Details:** \`${errorMessage}\`\n\nCheck my channel permissions (\`Manage Roles\`, \`Move Members\`) and try again.`)],
      components: [],
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(payload);
    } else {
      await interaction.reply({ ...payload, ephemeral: true });
    }
  }
};
