import {
  ActionRowBuilder,
  MentionableSelectMenuBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
  TextChannel,
  VoiceChannel,
  ButtonBuilder,
  ButtonStyle,
  OverwriteType,
  PermissionFlagsBits,
} from 'discord.js';
import { TempChannel } from '../../database/models/TempChannel';
import { GuildSettings } from '../../database/models/GuildSettings';
import { sendWebhookMessage } from '../utils/webhook';
import {
  buildLookingForMembersEmbed,
  buildRoomEmbed,
  clearOwnershipWarning,
  ensureRoomTextChannel,
  getCurrentGameName,
  getDisplayNameParts,
  refreshRoomPanel,
  toTextChannelName,
  enforceFeature,
} from '../utils/tempRoom';
import { getPanelDropdowns, getPanelButtons } from '../utils/components';
import { ENV } from '../../config/config';

const REGION_OPTIONS = [
  { label: 'Automatic', value: 'automatic', emoji: '🌐' },
  { label: 'Brazil', value: 'brazil', emoji: '🇧🇷' },
  { label: 'Hong Kong', value: 'hongkong', emoji: '🇭🇰' },
  { label: 'India', value: 'india', emoji: '🇮🇳' },
  { label: 'Japan', value: 'japan', emoji: '🇯🇵' },
  { label: 'Singapore', value: 'singapore', emoji: '🇸🇬' },
  { label: 'Sydney', value: 'sydney', emoji: '🇦🇺' },
  { label: 'US Central', value: 'us-central', emoji: '🇺🇸' },
  { label: 'US East', value: 'us-east', emoji: '🇺🇸' },
  { label: 'US South', value: 'us-south', emoji: '🇺🇸' },
  { label: 'US West', value: 'us-west', emoji: '🇺🇸' },
] as const;

const showTextModal = (
  interaction: StringSelectMenuInteraction,
  customId: string,
  title: string,
  inputId: string,
  label: string,
  placeholder?: string,
) => {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
  const input = new TextInputBuilder()
    .setCustomId(inputId)
    .setLabel(label)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  if (placeholder) {
    input.setPlaceholder(placeholder);
  }

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  return interaction.showModal(modal);
};

const showRegionMenu = async (interaction: StringSelectMenuInteraction) => {
  const regionMenu = new StringSelectMenuBuilder()
    .setCustomId('menu_region')
    .setPlaceholder('Select a voice region')
    .addOptions(
      REGION_OPTIONS.map((option) => ({
        label: option.label,
        value: option.value,
        emoji: option.emoji,
      })),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(regionMenu);
  return interaction.reply({
    embeds: [buildRoomEmbed('<a:syncearthblurple:1519008181550842008> Select Voice Region', 'Choose a region for your voice channel. The panel will stay open.')],
    components: [row],
    ephemeral: true,
  });
};

const getTempChannelFromInteraction = async (interaction: StringSelectMenuInteraction) => {
  if (!interaction.channelId) {
    return null;
  }

  return TempChannel.findOne({
    $or: [{ panelChannelId: interaction.channelId }, { textChannelId: interaction.channelId }],
  });
};

export const handleSelectMenuInteraction = async (interaction: StringSelectMenuInteraction) => {
  const guild = interaction.guild;
  const member = guild?.members.cache.get(interaction.user.id);

  if (!guild || !member) {
    return;
  }

  const tempChannel = await getTempChannelFromInteraction(interaction);
  if (!tempChannel) {
    return interaction.reply({
      embeds: [buildRoomEmbed('<a:refused:1520901852651323593> Temporary room not found', 'This menu is not linked to an active temporary room.')],
      ephemeral: true,
    });
  }

  const channel = guild.channels.cache.get(tempChannel.channelId) as VoiceChannel | undefined;
  if (!channel) {
    return interaction.reply({
      embeds: [buildRoomEmbed('<a:refused:1520901852651323593> Voice channel missing', 'I could not find the voice channel for this room.')],
      ephemeral: true,
    });
  }

  const settings = await GuildSettings.findOne({ guildId: guild.id }).catch(() => null);
  const value = interaction.values[0];

  if (interaction.customId.startsWith('menu_settings') || interaction.customId.startsWith('menu_users')) {
    interaction.message.edit({ components: [...getPanelDropdowns(), ...getPanelButtons()] }).catch(() => null);
  }

  if (interaction.customId === 'menu_region') {
    const region = value === 'automatic' ? null : value;
    await channel.setRTCRegion(region);
    const label = value === 'automatic'
      ? 'Automatic'
      : REGION_OPTIONS.find((option) => option.value === value)?.label || value;
    await interaction.update({
      embeds: [buildRoomEmbed('<a:approved:1520901996389990440> Voice region updated', `Region set to: **${label}**`)],
      components: [],
    });
    return;
  }

  if (interaction.customId.startsWith('menu_settings') && value === 'opt_region') {
    if (!(await enforceFeature(tempChannel, 'region', interaction))) return;
    return showRegionMenu(interaction);
  }

  if (value === 'opt_claim') {
    if (tempChannel.ownerId === interaction.user.id) {
      return interaction.reply({
        embeds: [buildRoomEmbed('<a:refused:1520901852651323593> Already owner', 'You are already the owner of this VC.')],
        ephemeral: true,
      });
    }

    if (channel.members.has(tempChannel.ownerId)) {
      return interaction.reply({
        embeds: [buildRoomEmbed('<a:refused:1520901852651323593> Owner is still here', 'You can only claim this room after the current owner leaves.')],
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
    await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
    await interaction.reply({
      embeds: [buildRoomEmbed('<a:approved:1520901996389990440> Ownership Claimed', `<@${interaction.user.id}> is now the owner of this room.`)],
      ephemeral: true,
    });
    return;
  }

  if (tempChannel.ownerId !== interaction.user.id) {
    return interaction.reply({
      embeds: [buildRoomEmbed('<a:refused:1520901852651323593> Owner only', 'Only the current room owner can use these controls.')],
      ephemeral: true,
    });
  }

  switch (value) {
    case 'opt_rename':
      if (!(await enforceFeature(tempChannel, 'rename', interaction))) return;
      return showTextModal(interaction, 'modal_rename', 'Rename Channel', 'input_name', 'New channel name');

    case 'opt_status':
      if (!(await enforceFeature(tempChannel, 'status', interaction))) return;
      return showTextModal(interaction, 'modal_status', 'Set Voice Status', 'input_status', 'Status text (shown under channel name)', 'e.g. Chilling');

    case 'opt_limit':
      if (!(await enforceFeature(tempChannel, 'userLimit', interaction))) return;
      return showTextModal(interaction, 'modal_limit', 'Set User Limit', 'input_limit', 'Max users', '0 for unlimited');

    case 'opt_bitrate':
      if (!(await enforceFeature(tempChannel, 'bitrate', interaction))) return;
      return showTextModal(interaction, 'modal_bitrate', 'Change Bitrate', 'input_bitrate', 'Bitrate in kbps', '8 - 384');

    case 'opt_game': {
      if (!(await enforceFeature(tempChannel, 'rename', interaction))) return;
      const gameName = getCurrentGameName(member);
      if (!gameName) {
        await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
        await interaction.reply({
          embeds: [buildRoomEmbed('<a:refused:1520901852651323593> No game detected', 'I could not see a current game activity for you.')],
          ephemeral: true,
        });
        return;
      }

      await channel.setName(gameName);
      if (tempChannel.textChannelId) {
        const textChannel = guild.channels.cache.get(tempChannel.textChannelId) as TextChannel | undefined;
        if (textChannel?.isTextBased()) {
          await textChannel.setName(toTextChannelName(gameName)).catch(() => null);
        }
      }

      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      await interaction.reply({
        embeds: [buildRoomEmbed('<a:approved:1520901996389990440> Channel renamed', `Name: ${gameName}`)],
        ephemeral: true,
      });
      return;
    }

    case 'opt_text': {
      if (!(await enforceFeature(tempChannel, 'textChannel', interaction))) return;
      const textCh = await ensureRoomTextChannel(channel, tempChannel, 'Temporary voice room chat', getDisplayNameParts(member));
      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      await interaction.reply({
        embeds: [buildRoomEmbed('<a:approved:1520901996389990440> Text chat ready', `Linked text chat: ${textCh}`)],
        ephemeral: true,
      });
      return;
    }

    case 'opt_lfm': {
      if (!(await enforceFeature(tempChannel, 'requestToJoin', interaction))) return;
      if (tempChannel.isLocked) {
        return interaction.reply({
          embeds: [buildRoomEmbed('<a:refused:1520901852651323593> Channel Locked', 'You cannot use the LFM feature while your voice channel is locked.')],
          ephemeral: true,
        });
      }

      const lfmChannelId = settings?.lfmChannelId;
      if (!lfmChannelId) {
        return interaction.reply({
          embeds: [buildRoomEmbed('<a:refused:1520901852651323593> LFM Channel Not Configured', 'The LFM feature has not been configured. Ask your server administrator to set the LFM Channel in the dashboard.')],
          ephemeral: true,
        });
      }

      const lfmChannel = guild.channels.cache.get(lfmChannelId);
      if (!lfmChannel?.isTextBased()) {
        return interaction.reply({
          embeds: [buildRoomEmbed('<a:refused:1520901852651323593> LFM Channel Error', 'The configured LFM channel is invalid or missing. Ask your server administrator to update the settings.')],
          ephemeral: true,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_lfm')
        .setTitle('Looking For Members');

      const msgInput = new TextInputBuilder()
        .setCustomId('input_lfm_msg')
        .setLabel('Custom Message (Optional)')
        .setPlaceholder('Add a note like: "Looking for 2 more for Valorant Ranked!"')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(300);

      const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(msgInput);
      modal.addComponents(actionRow);

      await interaction.showModal(modal);
      return;
    }

    case 'opt_nsfw': {
      if (!(await enforceFeature(tempChannel, 'nsfw', interaction))) return;
      const nextValue = !tempChannel.isNsfw;
      tempChannel.isNsfw = nextValue;
      await tempChannel.save();
      await channel.setNSFW(nextValue).catch(() => null);

      if (tempChannel.textChannelId) {
        const textChannel = guild.channels.cache.get(tempChannel.textChannelId) as TextChannel | undefined;
        if (textChannel?.isTextBased()) {
          await textChannel.setNSFW(nextValue).catch(() => null);
        }
      }

      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      await interaction.reply({
        embeds: [buildRoomEmbed(nextValue ? '<a:approved:1520901996389990440> NSFW enabled' : '<a:approved:1520901996389990440> NSFW disabled')],
        ephemeral: true,
      });
      return;
    }

    case 'opt_lock': {
      if (!(await enforceFeature(tempChannel, 'lock', interaction))) return;
      await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
      
      if (channel.parent) {
        const updates = [];
        for (const [id, overwrite] of channel.parent.permissionOverwrites.cache) {
          if (overwrite.type === OverwriteType.Role && id !== guild.roles.everyone.id) {
            if (tempChannel.permittedUsers.includes(id)) continue;
            if (overwrite.allow.has(PermissionFlagsBits.Connect)) {
              updates.push(channel.permissionOverwrites.edit(id, { Connect: false }).catch(() => null));
            }
          }
        }
        await Promise.all(updates);
      }

      tempChannel.isLocked = true;
      await tempChannel.save();
      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      await interaction.reply({ embeds: [buildRoomEmbed('<a:approved:1520901996389990440> Channel locked', 'No new users can join.')], ephemeral: true });
      return;
    }

    case 'opt_unlock': {
      if (!(await enforceFeature(tempChannel, 'lock', interaction))) return;
      await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: null });
      
      if (channel.parent) {
        const updates = [];
        for (const [id, overwrite] of channel.parent.permissionOverwrites.cache) {
          if (overwrite.type === OverwriteType.Role && id !== guild.roles.everyone.id) {
            if (tempChannel.permittedUsers.includes(id)) continue;
            if (overwrite.allow.has(PermissionFlagsBits.Connect)) {
              updates.push(channel.permissionOverwrites.edit(id, { Connect: null }).catch(() => null));
            }
          }
        }
        await Promise.all(updates);
      }

      tempChannel.isLocked = false;
      await tempChannel.save();
      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      await interaction.reply({ embeds: [buildRoomEmbed('<a:approved:1520901996389990440> Channel unlocked', 'Users can freely join.')], ephemeral: true });
      return;
    }

    case 'opt_hide': {
      if (!(await enforceFeature(tempChannel, 'ghost', interaction))) return;
      await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
      
      if (channel.parent) {
        const updates = [];
        for (const [id, overwrite] of channel.parent.permissionOverwrites.cache) {
          if (overwrite.type === OverwriteType.Role && id !== guild.roles.everyone.id) {
            if (tempChannel.permittedUsers.includes(id)) continue;
            if (overwrite.allow.has(PermissionFlagsBits.ViewChannel)) {
              updates.push(channel.permissionOverwrites.edit(id, { ViewChannel: false }).catch(() => null));
            }
          }
        }
        await Promise.all(updates);
      }

      tempChannel.isHidden = true;
      await tempChannel.save();
      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      await interaction.reply({ embeds: [buildRoomEmbed('<a:approved:1520901996389990440> Channel hidden', 'Your channel is now invisible.')], ephemeral: true });
      return;
    }

    case 'opt_unhide': {
      if (!(await enforceFeature(tempChannel, 'ghost', interaction))) return;
      await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: null });
      
      if (channel.parent) {
        const updates = [];
        for (const [id, overwrite] of channel.parent.permissionOverwrites.cache) {
          if (overwrite.type === OverwriteType.Role && id !== guild.roles.everyone.id) {
            if (tempChannel.permittedUsers.includes(id)) continue;
            if (overwrite.allow.has(PermissionFlagsBits.ViewChannel)) {
              updates.push(channel.permissionOverwrites.edit(id, { ViewChannel: null }).catch(() => null));
            }
          }
        }
        await Promise.all(updates);
      }

      tempChannel.isHidden = false;
      await tempChannel.save();
      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      await interaction.reply({ embeds: [buildRoomEmbed('<a:approved:1520901996389990440> Channel visible', 'Your channel is now visible to everyone.')], ephemeral: true });
      return;
    }

    case 'opt_permit':
    case 'opt_reject':
    case 'opt_invite':
    case 'opt_transfer': {
      const featureKey = value.replace('opt_', '') as keyof typeof import('../../database/models/GuildSetup').featuresDefault;
      if (!(await enforceFeature(tempChannel, featureKey, interaction))) return;
      const label =
        value === 'opt_reject'
          ? 'Select a user or role to reject'
          : value === 'opt_invite'
            ? 'Select a user to invite'
            : value === 'opt_transfer'
              ? 'Select a user to transfer ownership to'
              : 'Select a user or role to permit';

      const select = new MentionableSelectMenuBuilder()
        .setCustomId(`mentionable_${value}`)
        .setPlaceholder(label);

      const row = new ActionRowBuilder<MentionableSelectMenuBuilder>().addComponents(select);
      await refreshRoomPanel(channel, tempChannel, member, settings, ENV.DASHBOARD_URL || undefined);
      return interaction.reply({
        embeds: [buildRoomEmbed(label)],
        components: [row],
        ephemeral: true,
      });
    }

    default:
      return interaction.reply({ embeds: [buildRoomEmbed('<a:refused:1520901852651323593> Unknown option')], ephemeral: true });
  }
};
