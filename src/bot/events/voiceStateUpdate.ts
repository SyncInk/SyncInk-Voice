import { VoiceState, ChannelType, TextChannel } from 'discord.js';
import { SyncinkBot } from '../bot';
import { GuildSettings } from '../../database/models/GuildSettings';
import { TempChannel } from '../../database/models/TempChannel';
import { buildEmbed } from '../utils/embed';
import { getPanelButtons, getPanelDropdowns } from '../utils/components';
import { ENV } from '../../config/config';

export const handleVoiceStateUpdate = async (client: SyncinkBot, oldState: VoiceState, newState: VoiceState) => {
  if (oldState.channelId === newState.channelId) return;

  const guildId = newState.guild.id || oldState.guild.id;
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const settings = await GuildSettings.findOne({ guildId });
  if (!settings || !settings.setupChannelId) return;

  // User joined the 'Create VC' channel
  if (newState.channelId === settings.setupChannelId) {
    try {
      const channelName = settings.defaultName.replace('{user}', member.displayName);
      
      const newChannel = await newState.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: settings.setupCategoryId || newState.channel?.parentId || undefined,
        userLimit: settings.defaultLimit || 0,
        permissionOverwrites: [
          {
            id: member.id,
            allow: ['ViewChannel', 'Connect', 'ManageChannels', 'MoveMembers', 'DeafenMembers', 'MuteMembers'],
          },
        ],
      });

      await newState.setChannel(newChannel);

      await TempChannel.create({
        guildId,
        channelId: newChannel.id,
        ownerId: member.id,
      });

      // Send Premium Embed to the Voice Channel's native text chat
      const embed = buildEmbed()
        .setTitle('⚙️ Welcome to your own temporary voice channel')
        .setDescription(`Control your channel using the menus below\n• Use the dropdowns to manage settings and permissions\n• Alternatively use \`/voice\` commands\n• Use \`/toggle set\` to disable this interface\n\nCreate a **user profile** on the dashboard, then use **Load Settings** below to apply your saved settings to this channel. Read the [user profiles guide](${ENV.DASHBOARD_URL}).\n**Gold options require Syncink+ or voting**`);
        
      const components = [...getPanelButtons(), ...getPanelDropdowns()];

      await newChannel.send({ content: `<@${member.id}>`, embeds: [embed], components });

    } catch (error) {
      console.error('[VoiceState] Error creating temp channel:', error);
    }
  }

  // Handle Text-in-Voice visibility for /temptext if applicable
  if (newState.channelId) {
    const tempChanData = await TempChannel.findOne({ channelId: newState.channelId });
    if (tempChanData && tempChanData.textChannelId) {
      const txtChan = newState.guild.channels.cache.get(tempChanData.textChannelId) as TextChannel;
      if (txtChan) {
        await txtChan.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true });
      }
    }
  }

  // User left a channel - check if it's a Temp VC and empty
  if (oldState.channelId) {
    const tempChannelData = await TempChannel.findOne({ channelId: oldState.channelId });
    
    // Revoke text channel access if leaving
    if (tempChannelData && tempChannelData.textChannelId) {
      const txtChan = oldState.guild.channels.cache.get(tempChannelData.textChannelId) as TextChannel;
      if (txtChan && member) {
        await txtChan.permissionOverwrites.delete(member.id);
      }
    }

    if (tempChannelData) {
      const channel = oldState.guild.channels.cache.get(oldState.channelId);
      if (channel && channel.isVoiceBased() && channel.members.size === 0) {
        try {
          // Delete bound text channel if exists
          if (tempChannelData.textChannelId) {
            const txtChan = oldState.guild.channels.cache.get(tempChannelData.textChannelId);
            if (txtChan) await txtChan.delete();
          }

          await channel.delete();
          await TempChannel.deleteOne({ channelId: oldState.channelId });
        } catch (error) {
          console.error('[VoiceState] Error deleting empty temp channel:', error);
        }
      }
    }
  }
};
