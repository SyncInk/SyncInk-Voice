import { Interaction } from 'discord.js';
import { SyncinkBot } from '../bot';
import { handleButtonInteraction } from './buttonInteraction';
import { handleSelectMenuInteraction } from './selectMenuInteraction';
import { handleModalSubmit } from './modalSubmit';
import { logEvent } from '../utils/logger';

export const handleInteractionCreate = async (client: SyncinkBot, interaction: Interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      if (interaction.guild) {
        await logEvent({
          guild: interaction.guild,
          type: 'commandUsage',
          title: 'Command Executed',
          description: `${interaction.user} executed \`/${interaction.commandName}\``,
          color: 0x9b59b6,
          executor: { id: interaction.user.id, tag: interaction.user.tag, avatarUrl: interaction.user.displayAvatarURL() },
        });
      }
      await command.execute(interaction);
    } catch (error) {
      console.error('[Interaction] Command error:', error);
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  } else if (interaction.isButton()) {
    try {
      if (interaction.guild) {
        await logEvent({
          guild: interaction.guild,
          type: 'interfaceUsage',
          title: 'Control Panel Used (Button)',
          description: `${interaction.user} clicked button \`${interaction.customId}\``,
          color: 0xf1c40f,
        });
      }
      await handleButtonInteraction(interaction);
    } catch (error) {
      console.error('[Interaction] Button error:', error);
      await interaction.reply({ content: 'There was an error handling this button!', ephemeral: true });
    }
  } else if (interaction.isStringSelectMenu()) {
    try {
      if (interaction.guild) {
        await logEvent({
          guild: interaction.guild,
          type: 'interfaceUsage',
          title: 'Control Panel Used (Menu)',
          description: `${interaction.user} used select menu \`${interaction.customId}\``,
          color: 0xf1c40f,
        });
      }
      await handleSelectMenuInteraction(interaction);
    } catch (error) {
      console.error('[Interaction] Select Menu error:', error);
      await interaction.reply({ content: 'There was an error handling this menu!', ephemeral: true });
    }
  } else if (interaction.isModalSubmit()) {
    try {
      if (interaction.guild) {
        await logEvent({
          guild: interaction.guild,
          type: 'interfaceUsage',
          title: 'Control Panel Used (Modal)',
          description: `${interaction.user} submitted form \`${interaction.customId}\``,
          color: 0xf1c40f,
        });
      }
      await handleModalSubmit(interaction);
    } catch (error) {
      console.error('[Interaction] Modal Submit error:', error);
      await interaction.reply({ content: 'There was an error handling this form!', ephemeral: true });
    }
  } else if (interaction.isMentionableSelectMenu()) {
    const { handleMentionableSelectMenuInteraction } = require('./mentionableSelectInteraction');
    try {
      if (interaction.guild) {
        await logEvent({
          guild: interaction.guild,
          type: 'interfaceUsage',
          title: 'Control Panel Used (Mention Menu)',
          description: `${interaction.user} used mention menu \`${interaction.customId}\``,
          color: 0xf1c40f,
        });
      }
      await handleMentionableSelectMenuInteraction(interaction);
    } catch (error) {
      console.error('[Interaction] Mentionable Select Menu error:', error);
      await interaction.reply({ content: 'There was an error handling this selection!', ephemeral: true });
    }
  }
};
