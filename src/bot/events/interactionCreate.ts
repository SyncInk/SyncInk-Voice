import { Interaction } from 'discord.js';
import { SyncinkBot } from '../bot';
import { handleButtonInteraction } from './buttonInteraction';
import { handleSelectMenuInteraction } from './selectMenuInteraction';
import { handleModalSubmit } from './modalSubmit';

export const handleInteractionCreate = async (client: SyncinkBot, interaction: Interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('[Interaction] Command error:', error);
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  } else if (interaction.isButton()) {
    try {
      await handleButtonInteraction(interaction);
    } catch (error) {
      console.error('[Interaction] Button error:', error);
      await interaction.reply({ content: 'There was an error handling this button!', ephemeral: true });
    }
  } else if (interaction.isStringSelectMenu()) {
    try {
      await handleSelectMenuInteraction(interaction);
    } catch (error) {
      console.error('[Interaction] Select Menu error:', error);
      await interaction.reply({ content: 'There was an error handling this menu!', ephemeral: true });
    }
  } else if (interaction.isModalSubmit()) {
    try {
      await handleModalSubmit(interaction);
    } catch (error) {
      console.error('[Interaction] Modal Submit error:', error);
      await interaction.reply({ content: 'There was an error handling this form!', ephemeral: true });
    }
  } else if (interaction.isMentionableSelectMenu()) {
    const { handleMentionableSelectMenuInteraction } = require('./mentionableSelectInteraction');
    try {
      await handleMentionableSelectMenuInteraction(interaction);
    } catch (error) {
      console.error('[Interaction] Mentionable Select Menu error:', error);
      await interaction.reply({ content: 'There was an error handling this selection!', ephemeral: true });
    }
  }
};
