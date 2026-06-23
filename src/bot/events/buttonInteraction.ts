import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  TextChannel,
  VoiceChannel,
  ButtonBuilder,
} from 'discord.js';
import { TempChannel } from '../../database/models/TempChannel';
import { UserProfile } from '../../database/models/UserProfile';
import {
  buildRoomEmbed,
  clearOwnershipWarning,
  formatRoomName,
  markPanelDeletionIgnored,
  refreshRoomPanel,
  toTextChannelName,
} from '../utils/tempRoom';
import { GuildSettings } from '../../database/models/GuildSettings';
import { ENV } from '../../config/config';

const getTempChannelFromInteraction = async (interaction: ButtonInteraction) => {
  if (!interaction.channelId) {
    return null;
  }

  return TempChannel.findOne({
    $or: [{ panelChannelId: interaction.channelId }, { textChannelId: interaction.channelId }],
  });
};

export const handleButtonInteraction = async (interaction: ButtonInteraction) => {
  const guild = interaction.guild;
  const member = guild?.members.cache.get(interaction.user.id);

  if (!guild || !member) {
    return;
  }

  if (interaction.customId.startsWith('btn_lfm_join_vc_')) {
    const vcId = interaction.customId.replace('btn_lfm_join_vc_', '');
    const vc = guild.channels.cache.get(vcId) as VoiceChannel | undefined;
    if (!vc) {
      return interaction.reply({
        embeds: [buildRoomEmbed('Voice channel missing', 'This voice channel no longer exists.')],
        ephemeral: true,
      });
    }

    if (vc.userLimit > 0 && vc.members.size >= vc.userLimit) {
      return interaction.reply({
        embeds: [buildRoomEmbed('Channel Full', 'This voice channel is currently full.')],
        ephemeral: true,
      });
    }

    // Grant access explicitly
    await vc.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: true,
      Connect: true,
    }).catch(() => null);

    // Disable the button on the message
    const msg = interaction.message;
    if (msg && msg.components.length > 0) {
      const row = msg.components[0] as any;
      const disabledRow = new ActionRowBuilder<ButtonBuilder>();
      row.components.forEach((c: any) => {
        if (c.customId === interaction.customId) {
          disabledRow.addComponents(ButtonBuilder.from(c as any).setDisabled(true).setLabel('Claimed'));
        } else {
          disabledRow.addComponents(ButtonBuilder.from(c as any));
        }
      });
      await msg.edit({ components: [disabledRow] }).catch(() => null);
    }

    return interaction.reply({
      content: `You have been granted access! Click here to join: <#${vc.id}>`,
      ephemeral: true,
    });
  }

  const tempChannel = await getTempChannelFromInteraction(interaction);
  if (!tempChannel) {
    return interaction.reply({
      embeds: [buildRoomEmbed('Temporary room not found', 'This control panel is not linked to an active temporary room.')],
      ephemeral: true,
    });
  }

  const voiceChannel = guild.channels.cache.get(tempChannel.channelId) as VoiceChannel | undefined;
  if (!voiceChannel) {
    return interaction.reply({
      embeds: [buildRoomEmbed('Voice channel missing', 'I could not find the voice channel for this room.')],
      ephemeral: true,
    });
  }

  const ownerOnly = tempChannel.ownerId === interaction.user.id;
  if (!ownerOnly && interaction.customId !== 'btn_refresh_panel' && interaction.customId !== 'btn_claim_room') {
    return interaction.reply({
      embeds: [buildRoomEmbed('Owner only', 'Only the current room owner can use these controls.')],
      ephemeral: true,
    });
  }

  const settings = await GuildSettings.findOne({ guildId: guild.id }).catch(() => null);

  switch (interaction.customId) {
    case 'btn_refresh_panel': {
      await refreshRoomPanel(voiceChannel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.reply({
        embeds: [buildRoomEmbed('Panel refreshed', 'The control panel has been updated.')],
        ephemeral: true,
      });
    }

    case 'btn_load_settings': {
      const profile = await UserProfile.findOne({ userId: interaction.user.id });
      if (!profile || (!profile.defaultName && profile.defaultLimit === null && profile.defaultBitrate === null)) {
        return interaction.reply({
          embeds: [
            buildRoomEmbed(
              'No saved preferences yet',
              'Open the dashboard and save your personal room defaults, then use Load Settings.',
            ),
          ],
          ephemeral: true,
        });
      }

      const applied: string[] = [];
      if (profile.defaultName) {
        const newName = formatRoomName(profile.defaultName, member);
        await voiceChannel.setName(newName);
        applied.push(`Name: ${newName}`);

        if (tempChannel.textChannelId) {
          const textChannel = guild.channels.cache.get(tempChannel.textChannelId) as TextChannel | undefined;
          if (textChannel?.isTextBased()) {
            await textChannel.setName(toTextChannelName(newName)).catch(() => null);
          }
        }
      }

      if (profile.defaultLimit !== null && profile.defaultLimit !== undefined) {
        await voiceChannel.setUserLimit(profile.defaultLimit);
        tempChannel.userLimit = profile.defaultLimit;
        applied.push(`Limit: ${profile.defaultLimit === 0 ? 'Unlimited' : profile.defaultLimit}`);
      }

      if (profile.defaultBitrate) {
        const bitrate = Math.min(voiceChannel.guild.maximumBitrate, Math.max(8_000, profile.defaultBitrate * 1_000));
        await voiceChannel.setBitrate(bitrate);
        tempChannel.bitrate = bitrate;
        applied.push(`Bitrate: ${Math.round(bitrate / 1000)} kbps`);
      }

      await tempChannel.save();
      await refreshRoomPanel(voiceChannel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.reply({
        embeds: [buildRoomEmbed(`Applied ${applied.length} saved settings`, applied.join('\n'))],
        ephemeral: true,
      });
    }

    case 'btn_lock':
      await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
      tempChannel.isLocked = true;
      await tempChannel.save();
      await refreshRoomPanel(voiceChannel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.reply({ embeds: [buildRoomEmbed('<:sync_close_ticket:1513811041694519326> Channel locked', 'No new users can join.')], ephemeral: true });

    case 'btn_unlock':
      await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { Connect: null });
      tempChannel.isLocked = false;
      await tempChannel.save();
      await refreshRoomPanel(voiceChannel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.reply({ embeds: [buildRoomEmbed('<:syncunlocked:1519087149301891313> Channel unlocked', 'Users can freely join now.')], ephemeral: true });

    case 'btn_hide':
      await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
      tempChannel.isHidden = true;
      await tempChannel.save();
      await refreshRoomPanel(voiceChannel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.reply({ embeds: [buildRoomEmbed('Channel hidden', 'Your channel is now invisible to others.')], ephemeral: true });

    case 'btn_unhide':
      await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: null });
      tempChannel.isHidden = false;
      await tempChannel.save();
      await refreshRoomPanel(voiceChannel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.reply({ embeds: [buildRoomEmbed('Channel visible', 'Your channel is now visible to everyone.')], ephemeral: true });

    case 'btn_rename': {
      const modal = new ModalBuilder().setCustomId('modal_rename').setTitle('Rename Channel');
      const input = new TextInputBuilder()
        .setCustomId('input_name')
        .setLabel('New Channel Name')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      return interaction.showModal(modal);
    }

    case 'btn_limit': {
      const modal = new ModalBuilder().setCustomId('modal_limit').setTitle('Set User Limit');
      const input = new TextInputBuilder()
        .setCustomId('input_limit')
        .setLabel('Max Users (0 for unlimited)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      return interaction.showModal(modal);
    }

    case 'btn_transfer': {
      const modal = new ModalBuilder().setCustomId('modal_opt_transfer').setTitle('Transfer Ownership');
      const input = new TextInputBuilder()
        .setCustomId('input_userid')
        .setLabel('New Owner User ID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      return interaction.showModal(modal);
    }

    case 'btn_delete': {
      if (tempChannel.panelMessageId) {
        markPanelDeletionIgnored(tempChannel.panelMessageId);
        const panelChannel = tempChannel.panelChannelId
          ? guild.channels.cache.get(tempChannel.panelChannelId)
          : null;
        const panelMessage = panelChannel?.isTextBased()
          ? await panelChannel.messages.fetch(tempChannel.panelMessageId).catch(() => null)
          : null;
        if (panelMessage) {
          await panelMessage.delete().catch(() => null);
        }
      }

      await interaction.reply({ embeds: [buildRoomEmbed('Deleting channel', 'The temporary room is being removed.')], ephemeral: true });

      await TempChannel.deleteOne({ channelId: tempChannel.channelId });

      if (tempChannel.textChannelId) {
        const textChannel = guild.channels.cache.get(tempChannel.textChannelId);
        if (textChannel) {
          await textChannel.delete().catch(() => null);
        }
      }

      await voiceChannel.delete().catch(() => null);
      return;
    }

    case 'btn_claim_room': {
      if (!voiceChannel.members.has(interaction.user.id)) {
        return interaction.reply({
          embeds: [buildRoomEmbed('Not in Voice Channel', 'You must be inside the voice channel to use this button.')],
          ephemeral: true,
        });
      }

      if (tempChannel.ownerId === interaction.user.id) {
        return interaction.reply({
          embeds: [buildRoomEmbed('<a:sync_check_yes:1518997998128988160> Already owner', 'You are already the owner of this VC.')],
          ephemeral: true,
        });
      }

      if (voiceChannel.members.has(tempChannel.ownerId)) {
        return interaction.reply({
          embeds: [buildRoomEmbed('Owner is still here', 'You can only claim this room after the current owner leaves.')],
          ephemeral: true,
        });
      }

      const warningExpiresAt = tempChannel.ownerWarningExpiresAt?.getTime() || 0;
      if (warningExpiresAt && warningExpiresAt > Date.now()) {
        const remainingSeconds = Math.ceil((warningExpiresAt - Date.now()) / 1000);
        return interaction.reply({
          embeds: [
            buildRoomEmbed(
              'Ownership protection active',
              `Please wait **${remainingSeconds} seconds** before claiming this room.`,
            ),
          ],
          ephemeral: true,
        });
      }

      if (warningExpiresAt && warningExpiresAt <= Date.now()) {
        await clearOwnershipWarning(guild, tempChannel, 'transferred');
      }

      tempChannel.ownerId = interaction.user.id;
      await tempChannel.save();
      await refreshRoomPanel(voiceChannel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      await interaction.reply({
        embeds: [buildRoomEmbed('Ownership claimed', `<@${interaction.user.id}> is now the owner of this room.`)],
        ephemeral: true,
      });
      return;
    }

    default:
      return interaction.reply({ embeds: [buildRoomEmbed('Unknown action')], ephemeral: true });
  }
};
