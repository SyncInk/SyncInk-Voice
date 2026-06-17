import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { buildEmbed } from '../utils/embed';

export const data = new SlashCommandBuilder()
  .setName('panel')
  .setDescription('Sends the control panel for temporary voice channels')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const embed = buildEmbed()
    .setTitle('🟣 Syncink Voice Control Panel')
    .setDescription('Use the buttons below to manage your temporary voice channel.\n\n🔒 **Lock**: Lock the channel\n🔓 **Unlock**: Unlock the channel\n👻 **Hide**: Hide the channel\n👁️ **Unhide**: Make the channel visible');

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder().setCustomId('btn_lock').setLabel('Lock').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
      new ButtonBuilder().setCustomId('btn_unlock').setLabel('Unlock').setStyle(ButtonStyle.Secondary).setEmoji('🔓'),
      new ButtonBuilder().setCustomId('btn_hide').setLabel('Hide').setStyle(ButtonStyle.Secondary).setEmoji('👻'),
      new ButtonBuilder().setCustomId('btn_unhide').setLabel('Unhide').setStyle(ButtonStyle.Secondary).setEmoji('👁️')
    );

  await interaction.reply({ embeds: [embed], components: [row] });
};
