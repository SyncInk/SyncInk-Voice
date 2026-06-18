import {
  CategoryChannel,
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from 'discord.js';
import { GuildSettings } from '../../database/models/GuildSettings';
import { buildEmbed } from '../utils/embed';
import { getPanelButtons, getPanelDropdowns } from '../utils/components';
import { ENV } from '../../config/config';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Sets up the Syncink Voice system for this server')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
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

    if (!category) {
      category = await guild.channels.create({
        name: 'Syncink Voice',
        type: ChannelType.GuildCategory,
      });
    }

    const createChannel = await guild.channels.create({
      name: 'Join to Create',
      type: ChannelType.GuildVoice,
      parent: category.id,
    });

    if (!controlChannel) {
      controlChannel = await guild.channels.create({
        name: 'voice-control',
        type: ChannelType.GuildText,
        parent: category.id,
      });
    }

    await GuildSettings.findOneAndUpdate(
      { guildId: guild.id },
      {
        guildId: guild.id,
        setupChannelId: createChannel.id,
        setupCategoryId: category.id,
        voiceControlChannelId: controlChannel.id,
      },
      { upsert: true, new: true },
    );

    const embed = buildEmbed()
      .setTitle('Welcome to your temporary voice channel')
      .setDescription(
        `Control your channel using the menus below.\n` +
          `- Use the dropdowns to manage settings and permissions\n` +
          `- Alternatively use \`/voice\` commands\n` +
          `- Manage synced defaults in the dashboard: ${ENV.DASHBOARD_URL}`,
      );

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
