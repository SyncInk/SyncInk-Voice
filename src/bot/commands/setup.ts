import {
  CategoryChannel,
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
  VoiceChannel,
} from 'discord.js';
import { GuildSettings } from '../../database/models/GuildSettings';
import { buildControlPanelEmbed } from '../utils/tempRoom';
import { getPanelButtons, getPanelDropdowns } from '../utils/components';
import { ENV } from '../../config/config';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Sets up the Syncink Voice system for this server')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((option) =>
    option
      .setName('join_channel')
      .setDescription('Use an existing voice channel as the Join to Create channel')
      .addChannelTypes(ChannelType.GuildVoice),
  )
  .addChannelOption((option) =>
    option
      .setName('category')
      .setDescription('The category to place the Join to Create channel in')
      .addChannelTypes(ChannelType.GuildCategory),
  )
  .addChannelOption((option) =>
    option
      .setName('control_channel')
      .setDescription('The text channel to post the control panel in')
      .addChannelTypes(ChannelType.GuildText),
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  try {
    const guild = interaction.guild;
    if (!guild) {
      return;
    }

    let category = interaction.options.getChannel('category') as CategoryChannel | null;
    let controlChannel = interaction.options.getChannel('control_channel') as TextChannel | null;
    let createChannel = interaction.options.getChannel('join_channel') as VoiceChannel | null;

    if (!category && createChannel?.parent && createChannel.parent.type === ChannelType.GuildCategory) {
      category = createChannel.parent;
    }

    if (!category) {
      category = await guild.channels.create({
        name: 'Syncink Voice',
        type: ChannelType.GuildCategory,
      });
    }

    if (!createChannel) {
      createChannel = await guild.channels.create({
        name: 'Join to Create',
        type: ChannelType.GuildVoice,
        parent: category.id,
      });
    }

    if (!controlChannel) {
      controlChannel = await guild.channels.create({
        name: 'voice-control',
        type: ChannelType.GuildText,
        parent: category.id,
      });
    }

    const settings = await GuildSettings.findOneAndUpdate(
      { guildId: guild.id },
      {
        guildId: guild.id,
        setupChannelId: createChannel.id,
        setupCategoryId: category.id,
        voiceControlChannelId: controlChannel.id,
      },
      { upsert: true, new: true },
    );

    const panelMember = interaction.guild.members.cache.get(interaction.user.id) as GuildMember | undefined;
    if (!panelMember) {
      await interaction.editReply({ content: 'Could not resolve your guild member data.' });
      return;
    }

    const embed = buildControlPanelEmbed(panelMember, ENV.DASHBOARD_URL || undefined, settings);

    const components = [...getPanelButtons(), ...getPanelDropdowns()];
    await controlChannel.send({ embeds: [embed], components });

    await interaction.editReply({
      content: `Syncink Voice is ready. The Join to Create voice channel is in ${category} and the control panel is in ${controlChannel}.`,
    });
  } catch (error) {
    console.error('[Setup] Error:', error);
    await interaction.editReply({ content: 'Failed to set up Syncink Voice.' });
  }
};
