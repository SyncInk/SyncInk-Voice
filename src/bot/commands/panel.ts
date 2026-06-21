import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { buildRoomEmbed } from '../utils/tempRoom';

export const data = new SlashCommandBuilder()
  .setName('panel')
  .setDescription('Explains how to access the temporary room control panel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply({
    embeds: [
      buildRoomEmbed(
        'Temporary room controls',
        'Join a Join-to-Create voice channel to open your linked room, then use the panel inside the room text chat to manage it.',
      ),
    ],
    ephemeral: true,
  });
};
