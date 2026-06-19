import {
  ActionRowBuilder,
  ButtonInteraction,
  GuildMember,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  VoiceChannel,
} from 'discord.js';
import { TempChannel } from '../../database/models/TempChannel';
import { UserProfile } from '../../database/models/UserProfile';
import { buildControlPanelEmbed, buildRoomEmbed, formatRoomName, getDisplayNameParts, toTextChannelName } from '../utils/tempRoom';
import { getPanelButtons, getPanelDropdowns } from '../utils/components';
import { ENV } from '../../config/config';

// Refresh the control panel message in the voice channel so select menus reset
const refreshPanel = async (channel: VoiceChannel, member: GuildMember) => {
  try {
    const messages = await channel.messages.fetch({ limit: 15 });
    const panelMsg = messages.find(
      (m) => m.author.bot && m.embeds.length > 0 && m.components.length > 0,
    );
    if (panelMsg) {
      await panelMsg.edit({
        embeds: [buildControlPanelEmbed(member, ENV.DASHBOARD_URL || undefined)],
        components: [...getPanelButtons(), ...getPanelDropdowns()],
      });
    }
  } catch {
    // Best-effort — ignore failures silently
  }
};

export const handleButtonInteraction = async (interaction: ButtonInteraction) => {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (!member || !member.voice.channelId) {
    return interaction.reply({
      embeds: [buildRoomEmbed('Join a voice channel first', 'You must be in your temporary voice channel to use this control.')],
      ephemeral: true,
    });
  }

  const tempChannel = await TempChannel.findOne({ channelId: member.voice.channelId });
  if (!tempChannel) {
    return interaction.reply({
      embeds: [buildRoomEmbed('Temporary channel not found', 'This control only works inside a SyncInk temporary voice channel.')],
      ephemeral: true,
    });
  }

  if (tempChannel.ownerId !== interaction.user.id) {
    return interaction.reply({
      embeds: [buildRoomEmbed('Owner only', 'Only the current room owner can use these controls.')],
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

  switch (interaction.customId) {
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
        await channel.setName(newName);
        applied.push(`Name: ${newName}`);

        if (tempChannel.textChannelId) {
          const textChannel = interaction.guild?.channels.cache.get(tempChannel.textChannelId);
          if (textChannel?.isTextBased()) {
            const ownerName = getDisplayNameParts(member);
            await textChannel.setName(toTextChannelName(ownerName));
          }
        }
      }

      if (profile.defaultLimit !== null && profile.defaultLimit !== undefined) {
        await channel.setUserLimit(profile.defaultLimit);
        tempChannel.userLimit = profile.defaultLimit;
        applied.push(`Limit: ${profile.defaultLimit === 0 ? 'Unlimited' : profile.defaultLimit}`);
      }

      if (profile.defaultBitrate) {
        const bitrate = Math.min(channel.guild.maximumBitrate, Math.max(8_000, profile.defaultBitrate * 1_000));
        await channel.setBitrate(bitrate);
        tempChannel.bitrate = bitrate;
        applied.push(`Bitrate: ${Math.round(bitrate / 1000)} kbps`);
      }

      await tempChannel.save();
      await interaction.reply({
        embeds: [
          buildRoomEmbed(
            `✅ Applied ${applied.length} saved settings`,
            applied.join('\n'),
          ),
        ],
        ephemeral: true,
      });
      // Refresh panel so dropdowns reset
      refreshPanel(channel, member);
      return;
    }

    case 'btn_lock':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: false });
      tempChannel.isLocked = true;
      await tempChannel.save();
      await interaction.reply({ embeds: [buildRoomEmbed('🔒 Channel locked', 'No new users can join.')], ephemeral: true });
      refreshPanel(channel, member);
      return;

    case 'btn_unlock':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: null });
      tempChannel.isLocked = false;
      await tempChannel.save();
      await interaction.reply({ embeds: [buildRoomEmbed('🔓 Channel unlocked', 'Users can freely join now.')], ephemeral: true });
      refreshPanel(channel, member);
      return;

    case 'btn_hide':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { ViewChannel: false });
      tempChannel.isHidden = true;
      await tempChannel.save();
      await interaction.reply({ embeds: [buildRoomEmbed('👻 Channel hidden', 'Your channel is now invisible to others.')], ephemeral: true });
      refreshPanel(channel, member);
      return;

    case 'btn_unhide':
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { ViewChannel: null });
      tempChannel.isHidden = false;
      await tempChannel.save();
      await interaction.reply({ embeds: [buildRoomEmbed('👁️ Channel visible', 'Your channel is now visible to everyone.')], ephemeral: true });
      refreshPanel(channel, member);
      return;

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
      await interaction.reply({ embeds: [buildRoomEmbed('🗑️ Deleting channel...')], ephemeral: true });
      if (tempChannel.textChannelId) {
        const textChannel = interaction.guild!.channels.cache.get(tempChannel.textChannelId);
        if (textChannel) {
          await textChannel.delete().catch(() => null);
        }
      }
      await channel.delete();
      await TempChannel.deleteOne({ channelId: tempChannel.channelId });
      return;
    }

    default:
      return interaction.reply({ embeds: [buildRoomEmbed('Unknown action')], ephemeral: true });
  }
};
