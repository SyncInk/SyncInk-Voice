import {
  ActionRowBuilder,
  ChannelType,
  MentionableSelectMenuBuilder,
  ModalBuilder,
  GuildMember,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
  VoiceChannel,
} from 'discord.js';
import { TempChannel } from '../../database/models/TempChannel';
import { GuildSettings } from '../../database/models/GuildSettings';
import { sendWebhookMessage } from '../utils/webhook';
import {
  buildControlPanelEmbed,
  buildLookingForMembersEmbed,
  buildRoomEmbed,
  getCurrentGameName,
  ensureRoomTextChannel,
  getDisplayNameParts,
} from '../utils/tempRoom';
import { getPanelButtons, getPanelDropdowns } from '../utils/components';
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

const freshControlPanel = async (member: GuildMember, guildId: string) => {
  const settings = await GuildSettings.findOne({ guildId });
  return {
    embeds: [buildControlPanelEmbed(member, ENV.DASHBOARD_URL || undefined, settings)],
    components: [...getPanelButtons(), ...getPanelDropdowns()],
  };
};

// Region menu is shown as EPHEMERAL so the main control panel is NEVER replaced/removed
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
    embeds: [buildRoomEmbed('🌐 Select Voice Region', 'Choose a region for your voice channel. The panel will stay open.')],
    components: [row],
    ephemeral: true,
  });
};

export const handleSelectMenuInteraction = async (interaction: StringSelectMenuInteraction) => {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (!member || !member.voice.channelId) {
    return interaction.reply({
      embeds: [buildRoomEmbed('Join a voice channel first', 'You must be in a temporary voice room to use this menu.')],
      ephemeral: true,
    });
  }

  const tempChannel = await TempChannel.findOne({ channelId: member.voice.channelId });
  if (!tempChannel) {
    return interaction.reply({
      embeds: [buildRoomEmbed('Temporary channel not found', 'This menu only works inside a SyncInk temporary voice channel.')],
      ephemeral: true,
    });
  }

  const channel = interaction.guild?.channels.cache.get(tempChannel.channelId) as VoiceChannel | undefined;
  if (!channel) {
    return interaction.reply({
      embeds: [buildRoomEmbed('Voice channel missing', 'I could not find the voice channel for this room.')],
      ephemeral: true,
    });
  }

  // menu_region comes from an ephemeral reply — update that ephemeral with confirmation
  if (interaction.customId === 'menu_region') {
    const value = interaction.values[0];
    const region = value === 'automatic' ? null : value;
    await channel.setRTCRegion(region);
    const label = value === 'automatic'
      ? 'Automatic'
      : REGION_OPTIONS.find((option) => option.value === value)?.label || value;
    await interaction.update({
      embeds: [buildRoomEmbed('✅ Voice region updated', `Region set to: **${label}**`)],
      components: [],
    });
    return;
  }

  const value = interaction.values[0];

  if (interaction.customId === 'menu_settings' && value === 'opt_region') {
    return showRegionMenu(interaction);
  }

  if (value === 'opt_claim') {
    if (tempChannel.ownerId === interaction.user.id) {
      return interaction.reply({
        embeds: [buildRoomEmbed('Already owner', 'You are already the owner of this voice channel.')],
        ephemeral: true,
      });
    }

    if (channel.members.has(tempChannel.ownerId)) {
      return interaction.reply({
        embeds: [buildRoomEmbed('Owner is still here', 'You can only claim this room after the current owner leaves.')],
        ephemeral: true,
      });
    }

    tempChannel.ownerId = interaction.user.id;
    await tempChannel.save();
    await interaction.update(await freshControlPanel(member, interaction.guildId!));
    await interaction.followUp({
      embeds: [buildRoomEmbed('✅ Ownership claimed', `<@${interaction.user.id}> is now the owner of this room.`)],
      ephemeral: true,
    });
    return;
  }

  if (tempChannel.ownerId !== interaction.user.id) {
    return interaction.reply({
      embeds: [buildRoomEmbed('Owner only', 'Only the current room owner can use these controls.')],
      ephemeral: true,
    });
  }

  switch (value) {
    case 'opt_rename':
      return showTextModal(interaction, 'modal_rename', 'Rename Channel', 'input_name', 'New channel name');

    case 'opt_status':
      return showTextModal(interaction, 'modal_status', 'Set Voice Status', 'input_status', 'Status text (shown under channel name)', 'e.g. Chilling 🎮');

    case 'opt_limit':
      return showTextModal(interaction, 'modal_limit', 'Set User Limit', 'input_limit', 'Max users', '0 for unlimited');

    case 'opt_bitrate':
      return showTextModal(interaction, 'modal_bitrate', 'Change Bitrate', 'input_bitrate', 'Bitrate in kbps', '8 - 384');

    case 'opt_game': {
      const gameName = getCurrentGameName(member);
      if (!gameName) {
        await interaction.update(await freshControlPanel(member, interaction.guildId!));
        await interaction.followUp({
          embeds: [buildRoomEmbed('No game detected', 'I could not see a current game activity for you.')],
          ephemeral: true,
        });
        return;
      }

      await channel.setName(gameName);
      await interaction.update(await freshControlPanel(member, interaction.guildId!));
      await interaction.followUp({
        embeds: [buildRoomEmbed('✅ Channel renamed', `Name: ${gameName}`)],
        ephemeral: true,
      });
      return;
    }

    case 'opt_text': {
      await interaction.deferUpdate();
      const ownerName = getDisplayNameParts(member);
      const textCh = await ensureRoomTextChannel(channel, tempChannel, 'Temporary voice room chat', ownerName);
      await interaction.editReply(await freshControlPanel(member, interaction.guildId!));
      await interaction.followUp({
        embeds: [buildRoomEmbed('💬 Text channel created', `Your private text channel ${textCh} has been created!\nOnly members in your voice channel can see it.`)],
        ephemeral: true,
      });
      return;
    }

    case 'opt_lfm': {
      const settings = await GuildSettings.findOne({ guildId: interaction.guildId });
      const textTarget = tempChannel.textChannelId
        ? interaction.guild?.channels.cache.get(tempChannel.textChannelId)
        : null;
      const roomText = textTarget?.isTextBased() ? textTarget : null;

      if (!roomText) {
        await interaction.update(await freshControlPanel(member, interaction.guildId!));
        await interaction.followUp({
          embeds: [buildRoomEmbed('Text channel required', 'Create a text channel first using the **Text** option, then post an LFM message.')],
          ephemeral: true,
        });
        return;
      }

      await sendWebhookMessage(
        roomText as any,
        { embeds: [buildLookingForMembersEmbed(member, channel.name, channel.members.size, channel.userLimit)] },
        { serverAvatar: settings?.serverAvatar, serverNickname: settings?.serverNickname }
      );

      if (settings?.voiceControlChannelId) {
        const controlChannel = interaction.guild?.channels.cache.get(settings.voiceControlChannelId);
        if (controlChannel?.isTextBased()) {
          await sendWebhookMessage(
            controlChannel as any,
            { embeds: [buildLookingForMembersEmbed(member, channel.name, channel.members.size, channel.userLimit)] },
            { serverAvatar: settings?.serverAvatar, serverNickname: settings?.serverNickname }
          ).catch(() => null);
        }
      }

      await interaction.update(await freshControlPanel(member, interaction.guildId!));
      await interaction.followUp({
        embeds: [buildRoomEmbed('✅ LFM posted', `Posted a looking-for-members message in ${roomText}.`)],
        ephemeral: true,
      });
      return;
    }

    case 'opt_nsfw': {
      const nextValue = !tempChannel.isNsfw;
      tempChannel.isNsfw = nextValue;
      await tempChannel.save();
      await channel.setNSFW(nextValue).catch(() => null);

      if (tempChannel.textChannelId) {
        const textChannel = interaction.guild?.channels.cache.get(tempChannel.textChannelId);
        if (textChannel?.type === ChannelType.GuildText) {
          await textChannel.setNSFW(nextValue).catch(() => null);
        }
      }

      await interaction.update(await freshControlPanel(member, interaction.guildId!));
      await interaction.followUp({
        embeds: [buildRoomEmbed(nextValue ? '🔞 NSFW enabled' : '✅ NSFW disabled')],
        ephemeral: true,
      });
      return;
    }

    case 'opt_lock':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: false });
      tempChannel.isLocked = true;
      await tempChannel.save();
      await interaction.update(await freshControlPanel(member, interaction.guildId!));
      await interaction.followUp({ embeds: [buildRoomEmbed('🔒 Channel locked', 'No new users can join.')], ephemeral: true });
      return;

    case 'opt_unlock':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: null });
      tempChannel.isLocked = false;
      await tempChannel.save();
      await interaction.update(await freshControlPanel(member, interaction.guildId!));
      await interaction.followUp({ embeds: [buildRoomEmbed('🔓 Channel unlocked', 'Users can freely join.')], ephemeral: true });
      return;

    case 'opt_hide':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { ViewChannel: false });
      tempChannel.isHidden = true;
      await tempChannel.save();
      await interaction.update(await freshControlPanel(member, interaction.guildId!));
      await interaction.followUp({ embeds: [buildRoomEmbed('👻 Channel hidden', 'Your channel is now invisible.')], ephemeral: true });
      return;

    case 'opt_unhide':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { ViewChannel: null });
      tempChannel.isHidden = false;
      await tempChannel.save();
      await interaction.update(await freshControlPanel(member, interaction.guildId!));
      await interaction.followUp({ embeds: [buildRoomEmbed('👁️ Channel visible', 'Your channel is now visible to everyone.')], ephemeral: true });
      return;

    case 'opt_permit':
    case 'opt_reject':
    case 'opt_invite':
    case 'opt_transfer': {
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
      return interaction.reply({
        embeds: [buildRoomEmbed(label)],
        components: [row],
        ephemeral: true,
      });
    }

    default:
      return interaction.reply({ embeds: [buildRoomEmbed('Unknown option')], ephemeral: true });
  }
};
