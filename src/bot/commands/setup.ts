import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, PermissionFlagsBits, TextChannel, CategoryChannel } from 'discord.js';
import { GuildSettings } from '../../database/models/GuildSettings';
import { buildEmbed } from '../utils/embed';
import { getPanelButtons, getPanelDropdowns } from '../utils/components';
import { ENV } from '../../config/config';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Sets up the Syncink Voice system for this server')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption(opt => 
    opt.setName('category')
      .setDescription('The category to place the Join to Create channel in')
      .addChannelTypes(ChannelType.GuildCategory)
  )
  .addChannelOption(opt => 
    opt.setName('control_channel')
      .setDescription('The text channel to post the control panel in')
      .addChannelTypes(ChannelType.GuildText)
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  try {
    const guild = interaction.guild;
    if (!guild) return;

    let category = interaction.options.getChannel('category') as CategoryChannel | null;
    let controlChannel = interaction.options.getChannel('control_channel') as TextChannel | null;

    if (!category) {
      category = await guild.channels.create({
        name: 'Syncink Voice',
        type: ChannelType.GuildCategory,
      });
    }

    const createChannel = await guild.channels.create({
      name: '➕ Join to Create',
      type: ChannelType.GuildVoice,
      parent: category.id,
    });

    if (!controlChannel) {
      controlChannel = await guild.channels.create({
        name: '💬 voice-control',
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
      { upsert: true, new: true }
    );

    const embed = buildEmbed()
      .setTitle('⚙️ Welcome to your own temporary voice channel')
      .setDescription(`Control your channel using the menus below\n• Use the dropdowns to manage settings and permissions\n• Alternatively use \`/voice\` commands\n• Use \`/toggle set\` to disable this interface\n\nCreate a **user profile** on the dashboard, then use **Load Settings** below to apply your saved settings to this channel. Read the [user profiles guide](${ENV.DASHBOARD_URL}).\n**Gold options require Syncink+ or voting**`);

    const components = [...getPanelButtons(), ...getPanelDropdowns()];

    await controlChannel.send({ embeds: [embed], components });

    await interaction.editReply({ content: `Syncink Voice has been successfully set up! The Join VC is in <#${category.id}> and the panel is in <#${controlChannel.id}>.` });
  } catch (error) {
    console.error('[Setup] Error:', error);
    await interaction.editReply({ content: 'Failed to set up Syncink Voice.' });
  }
};
