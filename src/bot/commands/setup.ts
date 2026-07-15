import {
  CategoryChannel,
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
  VoiceChannel,
} from 'discord.js';
import { GuildSettings } from '../../database/models/GuildSettings';

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
  await interaction.deferReply({ ephemeral: true });

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

    try {
      await category.permissionOverwrites.edit(guild.client.user!.id, {
        ViewChannel: true,
        ManageChannels: true,
        ManageRoles: true,
        MoveMembers: true,
      });
    } catch (err) {
      console.warn(`[Setup] Could not enforce category permissions for ${guild.id}`);
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

    await interaction.editReply({
      content: `<a:approved:1520901996389990440> **Syncink Voice has been successfully configured.**\n\nUsers can now join <#${createChannel.id}> in the **${category.name}** category. Room controls will be automatically generated inside the linked text chat of each temporary room.`,
    });
  } catch (error) {
    console.error('[Setup] Error:', error);
    await interaction.editReply({ content: '<a:sync_alert:1518314359024124016> **Setup Failed:** Ensure the bot has `Manage Channels` and `Manage Roles` permissions.' });
  }
};
