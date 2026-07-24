import { ModalSubmitInteraction, TextChannel, VoiceChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TempChannel } from '../../database/models/TempChannel';
import { GuildSettings } from '../../database/models/GuildSettings';
import { buildRoomEmbed, clearOwnershipWarning, refreshRoomPanel, toTextChannelName, buildLookingForMembersEmbed } from '../utils/tempRoom';
import { sendWebhookMessage } from '../utils/webhook';
import { ENV } from '../../config/config';

const getTempChannelFromModal = async (interaction: ModalSubmitInteraction) => {
  if (!interaction.channelId) {
    return null;
  }

  return TempChannel.findOne({
    $or: [{ panelChannelId: interaction.channelId }, { textChannelId: interaction.channelId }],
  });
};

export const handleModalSubmit = async (interaction: ModalSubmitInteraction) => {
  const guild = interaction.guild;
  const member = guild?.members.cache.get(interaction.user.id);

  if (!guild || !member) {
    return;
  }

  const tempChannel = await getTempChannelFromModal(interaction);
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

  try {
    if (interaction.customId === 'modal_rename') {
      const newName = interaction.fields.getTextInputValue('input_name').trim().slice(0, 100);
      await channel.setName(newName);

      if (tempChannel.textChannelId) {
        const textChannel = guild.channels.cache.get(tempChannel.textChannelId) as TextChannel | undefined;
        if (textChannel?.isTextBased()) {
          await textChannel.setName(toTextChannelName(newName)).catch(() => null);
        }
      }

      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.reply({
        embeds: [buildRoomEmbed('<a:approved:1520901996389990440> Room renamed', `The room is now named **${newName}**.`)],
        ephemeral: true,
      });
    }

    if (interaction.customId === 'modal_status') {
      const status = interaction.fields.getTextInputValue('input_status').trim().slice(0, 500);

      try {
        await interaction.client.rest.put(`/channels/${channel.id}/voice-status`, { body: { status } });
      } catch {
        const vc = channel as VoiceChannel & { setStatus?: (s: string) => Promise<unknown> };
        if (typeof vc.setStatus === 'function') {
          await vc.setStatus(status).catch(() => null);
        }
      }

      tempChannel.status = status;
      await tempChannel.save();
      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.reply({
        embeds: [buildRoomEmbed('<a:approved:1520901996389990440> Voice status updated', `Status: **${status}**`)],
        ephemeral: true,
      });
    }

    if (interaction.customId === 'modal_limit') {
      const limit = Number.parseInt(interaction.fields.getTextInputValue('input_limit'), 10);
      if (Number.isNaN(limit) || limit < 0 || limit > 99) {
        return interaction.reply({
          embeds: [buildRoomEmbed('<a:refused:1520901852651323593> Invalid limit', 'Limit must be between 0 and 99.')],
          ephemeral: true,
        });
      }

      await channel.setUserLimit(limit);
      tempChannel.userLimit = limit;
      await tempChannel.save();
      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.reply({
        embeds: [buildRoomEmbed('<a:approved:1520901996389990440> User limit set', `The room limit is now **${limit === 0 ? 'Unlimited' : limit}**.`)],
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
      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.reply({
        embeds: [buildRoomEmbed('Bitrate updated', `Bitrate: **${Math.round(finalBitrate / 1000)} kbps**`)],
        ephemeral: true,
      });
    }

    if (interaction.customId === 'modal_opt_transfer') {
      const targetId = interaction.fields.getTextInputValue('input_userid').trim();
      const targetMember = guild.members.cache.get(targetId);

      if (!targetMember || targetMember.voice.channelId !== channel.id) {
        return interaction.reply({
          embeds: [buildRoomEmbed('User must be in the room', 'The new owner must already be connected to this voice channel.')],
          ephemeral: true,
        });
      }

      if (targetId === tempChannel.ownerId) {
        return interaction.reply({
          embeds: [buildRoomEmbed('<a:sync_alert:1513822294831534220> Already owner', 'You are already the owner of this room.')],
          ephemeral: true,
        });
      }

      tempChannel.ownerId = targetId;
      await tempChannel.save();
      await clearOwnershipWarning(guild, tempChannel, 'transferred').catch(() => null);
      await refreshRoomPanel(channel, tempChannel, targetMember, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.reply({
        embeds: [buildRoomEmbed('<a:approved:1520901996389990440> Ownership transferred', `<@${targetId}> is now the owner of this room.`)],
        ephemeral: true,
      });
    }

    if (interaction.customId === 'modal_lfm') {
      const customMsg = interaction.fields.getTextInputValue('input_lfm_msg').trim() || undefined;
      const lfmChannelId = settings?.lfmChannelId;
      
      if (!lfmChannelId) {
        return interaction.reply({ embeds: [buildRoomEmbed('<a:refused:1520901852651323593> LFM Error', 'LFM is not configured.')], ephemeral: true });
      }

      const lfmChannel = guild.channels.cache.get(lfmChannelId);
      if (!lfmChannel?.isTextBased()) {
        return interaction.reply({ embeds: [buildRoomEmbed('<a:refused:1520901852651323593> LFM Error', 'LFM channel is missing.')], ephemeral: true });
      }

      const joinBtn = new ButtonBuilder()
        .setCustomId(`btn_lfm_join_vc_${tempChannel.channelId}`)
        .setLabel('Join VC')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔗');

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(joinBtn);
      const embed = buildLookingForMembersEmbed(member, channel.name, channel.members.size, channel.userLimit, settings?.lfmMessage, customMsg);

      let msgId: string | null = null;
      try {
        const msg = await sendWebhookMessage(
          lfmChannel as any,
          { embeds: [embed], components: [row] },
          { serverAvatar: settings?.serverAvatar, serverNickname: settings?.serverNickname },
        );
        msgId = msg?.id || null;
      } catch (err) {
        return interaction.reply({
          embeds: [buildRoomEmbed('<a:refused:1520901852651323593> Error', 'Failed to send LFM message. Please check bot permissions.')],
          ephemeral: true,
        });
      }

      if (msgId) {
        tempChannel.lfmChannelId = lfmChannelId;
        await tempChannel.save().catch(() => null);
      }

      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.reply({
        embeds: [buildRoomEmbed('<a:approved:1520901996389990440> LFM posted', `Posted a looking-for-members message in ${lfmChannel}.`)],
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error('[Modal] Error:', error);
    return interaction.reply({
      embeds: [buildRoomEmbed('<a:refused:1520901852651323593> Action failed', 'I could not apply that change. Check my permissions and try again.')],
      ephemeral: true,
    });
  }
};
