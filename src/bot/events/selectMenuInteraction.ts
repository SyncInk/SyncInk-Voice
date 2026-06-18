import {
  ActionRowBuilder,
  MentionableSelectMenuBuilder,
  ModalBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
  VoiceChannel,
} from 'discord.js';
import { TempChannel } from '../../database/models/TempChannel';
import { GuildSettings } from '../../database/models/GuildSettings';
import {
  buildRoomEmbed,
  ensureRoomTextChannel,
  getCurrentGameName,
} from '../utils/tempRoom';

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

  const value = interaction.values[0];
  const channel = interaction.guild?.channels.cache.get(tempChannel.channelId) as VoiceChannel | undefined;
  if (!channel) {
    return interaction.reply({
      embeds: [buildRoomEmbed('Voice channel missing', 'I could not find the voice channel for this room.')],
      ephemeral: true,
    });
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
    return interaction.reply({
      embeds: [buildRoomEmbed('Ownership claimed', `<@${interaction.user.id}> is now the owner of this room.`)],
    });
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
      return showTextModal(interaction, 'modal_status', 'Set Channel Status', 'input_status', 'Status text');

    case 'opt_limit':
      return showTextModal(interaction, 'modal_limit', 'Set User Limit', 'input_limit', 'Max users', '0 for unlimited');

    case 'opt_bitrate':
      return showTextModal(interaction, 'modal_bitrate', 'Change Bitrate', 'input_bitrate', 'Bitrate in kbps', '8 - 384');

    case 'opt_region':
      return showTextModal(interaction, 'modal_region', 'Set Voice Region', 'input_region', 'Region or auto', 'auto, india, singapore, us-west');

    case 'opt_game': {
      const gameName = getCurrentGameName(member);
      if (!gameName) {
        return interaction.reply({
          embeds: [
            buildRoomEmbed(
              'No game detected',
              'I could not see a current game activity for you. Enable Presence Intent in the Discord Developer Portal and make sure your activity is visible.',
            ),
          ],
          ephemeral: true,
        });
      }

      await channel.setName(gameName);
      return interaction.reply({
        embeds: [buildRoomEmbed('Channel renamed', `Name: ${gameName}`)],
        ephemeral: true,
      });
    }

    case 'opt_text': {
      const textChannel = await ensureRoomTextChannel(channel, tempChannel);
      return interaction.reply({
        embeds: [buildRoomEmbed('Text channel ready', `Text channel: ${textChannel}`)],
        ephemeral: true,
      });
    }

    case 'opt_lfm': {
      const settings = await GuildSettings.findOne({ guildId: interaction.guildId });
      const targetChannel = settings?.voiceControlChannelId
        ? interaction.guild?.channels.cache.get(settings.voiceControlChannelId)
        : null;
      const textTarget = targetChannel?.isTextBased() ? targetChannel : await ensureRoomTextChannel(channel, tempChannel);
      await textTarget.send({
        embeds: [
          buildRoomEmbed(
            'Looking for members',
            `<@${interaction.user.id}> is looking for members in ${channel}.\nLimit: ${channel.userLimit || 'Unlimited'}\nConnected: ${channel.members.size}`,
          ),
        ],
      });

      return interaction.reply({
        embeds: [buildRoomEmbed('LFM posted', `Posted a looking-for-members message in ${textTarget}.`)],
        ephemeral: true,
      });
    }

    case 'opt_nsfw': {
      const textChannel = await ensureRoomTextChannel(channel, tempChannel);
      const nextValue = !textChannel.nsfw;
      await textChannel.setNSFW(nextValue, 'Temporary room NSFW toggle');
      tempChannel.isNsfw = nextValue;
      await tempChannel.save();
      return interaction.reply({
        embeds: [buildRoomEmbed(nextValue ? 'NSFW enabled' : 'NSFW disabled', `Updated ${textChannel}.`)],
        ephemeral: true,
      });
    }

    case 'opt_lock':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: false });
      tempChannel.isLocked = true;
      await tempChannel.save();
      return interaction.reply({ embeds: [buildRoomEmbed('Room locked')], ephemeral: true });

    case 'opt_unlock':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: null });
      tempChannel.isLocked = false;
      await tempChannel.save();
      return interaction.reply({ embeds: [buildRoomEmbed('Room unlocked')], ephemeral: true });

    case 'opt_hide':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { ViewChannel: false });
      tempChannel.isHidden = true;
      await tempChannel.save();
      return interaction.reply({ embeds: [buildRoomEmbed('Room hidden')], ephemeral: true });

    case 'opt_unhide':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { ViewChannel: null });
      tempChannel.isHidden = false;
      await tempChannel.save();
      return interaction.reply({ embeds: [buildRoomEmbed('Room visible')], ephemeral: true });

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
