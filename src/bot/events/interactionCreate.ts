import { Interaction } from 'discord.js';
import { SyncinkBot } from '../bot';
import { handleButtonInteraction } from './buttonInteraction';
import { handleSelectMenuInteraction } from './selectMenuInteraction';
import { handleModalSubmit } from './modalSubmit';
import { logEvent } from '../utils/logger';

const OPTION_LABELS: Record<string, string> = {
  opt_rename: 'Name',
  opt_limit: 'Limit',
  opt_status: 'Status',
  opt_game: 'Game',
  opt_lfm: 'LFM',
  opt_bitrate: 'Bitrate',
  opt_region: 'Region',
  opt_text: 'Text',
  opt_nsfw: 'NSFW',
  opt_claim: 'Claim',
  opt_lock: 'Lock',
  opt_unlock: 'Unlock',
  opt_permit: 'Permit',
  opt_reject: 'Reject',
  opt_invite: 'Invite',
  opt_hide: 'Ghost',
  opt_unhide: 'Unghost',
  opt_transfer: 'Transfer',
};

const MODAL_LABELS: Record<string, string> = {
  modal_lfm: 'Looking For Members',
  modal_rename: 'Rename Room',
  modal_status: 'Change Status',
  modal_limit: 'Change Limit',
  modal_bitrate: 'Change Bitrate',
  modal_opt_transfer: 'Transfer Ownership',
};

const MENTION_LABELS: Record<string, string> = {
  mentionable_opt_permit: 'Permitted',
  mentionable_opt_reject: 'Rejected',
  mentionable_opt_invite: 'Invited',
  mentionable_opt_kick: 'Kicked',
  mentionable_opt_transfer: 'Transferred ownership to',
};

const safeErrorReply = async (interaction: any, message: string) => {
  try {
    if (interaction.isRepliable && interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: message, ephemeral: true }).catch(() => null);
      } else {
        await interaction.reply({ content: message, ephemeral: true }).catch(() => null);
      }
    }
  } catch {
    // Suppress interaction acknowledgment errors (e.g. 10062 Unknown interaction or 40060 Already acknowledged)
  }
};

export const handleInteractionCreate = async (client: SyncinkBot, interaction: Interaction) => {
  try {
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
          }).catch(() => null);
        }
        await command.execute(interaction);
      } catch (error) {
        console.error('[Interaction] Command error:', error);
        await safeErrorReply(interaction, 'There was an error while executing this command!');
      }
    } else if (interaction.isButton()) {
      try {
        if (interaction.guild && !interaction.customId.startsWith('btn_lfm_join_vc_')) {
          await logEvent({
            guild: interaction.guild,
            type: 'interfaceUsage',
            title: 'Control Panel Used (Button)',
            description: `${interaction.user} clicked button \`${interaction.customId}\``,
            color: 0xf1c40f,
          }).catch(() => null);
        }
        await handleButtonInteraction(interaction);
      } catch (error) {
        console.error('[Interaction] Button error:', error);
        await safeErrorReply(interaction, 'There was an error handling this button!');
      }
    } else if (interaction.isStringSelectMenu()) {
      try {
        if (interaction.guild) {
          const selectedValue = interaction.values[0];
          const label = OPTION_LABELS[selectedValue] || selectedValue;
          await logEvent({
            guild: interaction.guild,
            type: 'interfaceUsage',
            title: 'Control Panel Used (Menu)',
            description: `${interaction.user} used select menu \`${label}\``,
            color: 0xf1c40f,
          }).catch(() => null);
        }
        await handleSelectMenuInteraction(interaction);
      } catch (error) {
        console.error('[Interaction] Select Menu error:', error);
        await safeErrorReply(interaction, 'There was an error handling this menu!');
      }
    } else if (interaction.isModalSubmit()) {
      try {
        if (interaction.guild) {
          const label = MODAL_LABELS[interaction.customId] || interaction.customId;
          await logEvent({
            guild: interaction.guild,
            type: 'interfaceUsage',
            title: 'Control Panel Used (Modal)',
            description: `${interaction.user} submitted form \`${label}\``,
            color: 0xf1c40f,
          }).catch(() => null);
        }
        await handleModalSubmit(interaction);
      } catch (error) {
        console.error('[Interaction] Modal Submit error:', error);
        await safeErrorReply(interaction, 'There was an error handling this form!');
      }
    } else if (interaction.isMentionableSelectMenu()) {
      const { handleMentionableSelectMenuInteraction } = require('./mentionableSelectInteraction');
      try {
        if (interaction.guild) {
          const targetId = interaction.values[0];
          const actionLabel = MENTION_LABELS[interaction.customId] || interaction.customId;
          
          let targetName = targetId;
          const targetMember = interaction.guild.members.cache.get(targetId);
          if (targetMember) {
            targetName = targetMember.user.tag;
          } else {
            const targetRole = interaction.guild.roles.cache.get(targetId);
            if (targetRole) targetName = `Role: ${targetRole.name}`;
          }

          await logEvent({
            guild: interaction.guild,
            type: 'interfaceUsage',
            title: 'Control Panel Used (Mention Menu)',
            description: `${interaction.user} ${actionLabel} \`${targetName}\``,
            color: 0xf1c40f,
          }).catch(() => null);
        }
        await handleMentionableSelectMenuInteraction(interaction);
      } catch (error) {
        console.error('[Interaction] Mentionable Select Menu error:', error);
        await safeErrorReply(interaction, 'There was an error handling this selection!');
      }
    }
  } catch (globalInteractionError) {
    console.error('[Interaction] Unhandled global interaction error:', globalInteractionError);
  }
};
