import { ChannelType, TextChannel, VoiceChannel, VoiceState } from 'discord.js';
import { SyncinkBot } from '../bot';
import { GuildSettings } from '../../database/models/GuildSettings';
import { TempChannel } from '../../database/models/TempChannel';
import { UserProfile } from '../../database/models/UserProfile';
import { buildControlPanelEmbed, formatRoomName } from '../utils/tempRoom';
import { getPanelButtons, getPanelDropdowns } from '../utils/components';
import { ENV } from '../../config/config';

export const handleVoiceStateUpdate = async (
  _client: SyncinkBot,
  oldState: VoiceState,
  newState: VoiceState,
) => {
  if (oldState.channelId === newState.channelId) {
    return;
  }

  const guildId = newState.guild.id || oldState.guild.id;
  const member = newState.member || oldState.member;

  if (!member || member.user.bot) {
    return;
  }

  const settings = await GuildSettings.findOne({ guildId });
  if (!settings?.setupChannelId) {
    return;
  }

  if (newState.channelId === settings.setupChannelId) {
    try {
      const profile = await UserProfile.findOne({ userId: member.id });
      const savedTemplate = profile?.defaultName?.trim() || settings.defaultName || '{name}';
      const nameTemplate = savedTemplate === "{user}'s Room" ? '{name}' : savedTemplate;
      const userLimit = profile?.defaultLimit ?? settings.defaultLimit ?? 0;
      const bitrate = profile?.defaultBitrate
        ? Math.min(newState.guild.maximumBitrate, Math.max(8_000, profile.defaultBitrate * 1_000))
        : undefined;

      const newChannel = await newState.guild.channels.create({
        name: formatRoomName(nameTemplate, member),
        type: ChannelType.GuildVoice,
        parent: settings.setupCategoryId || newState.channel?.parentId || undefined,
        userLimit,
        bitrate,
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
        userLimit: newChannel.userLimit || 0,
        bitrate: newChannel.bitrate,
      });

      const embed = buildControlPanelEmbed(member, ENV.DASHBOARD_URL || undefined);
      const components = [...getPanelButtons(), ...getPanelDropdowns()];
      await newChannel.send({ content: `<@${member.id}>`, embeds: [embed], components });
    } catch (error) {
      console.error('[VoiceState] Error creating temp channel:', error);
    }
  }

  if (newState.channelId) {
    const tempChannel = await TempChannel.findOne({ channelId: newState.channelId });
    const voiceChannel = newState.guild.channels.cache.get(newState.channelId) as VoiceChannel | undefined;

    if (tempChannel && voiceChannel?.isVoiceBased() && tempChannel.textChannelId) {
      const textChannel = newState.guild.channels.cache.get(tempChannel.textChannelId) as TextChannel | undefined;
      if (textChannel) {
        await textChannel.permissionOverwrites.edit(member.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        }).catch(() => null);
      }
    }
  }

  if (oldState.channelId) {
    const tempChannelData = await TempChannel.findOne({ channelId: oldState.channelId });
    if (tempChannelData?.textChannelId) {
      const textChannel = oldState.guild.channels.cache.get(tempChannelData.textChannelId) as TextChannel | undefined;
      if (textChannel) {
        await textChannel.permissionOverwrites.delete(member.id).catch(() => null);
      }
    }

    if (tempChannelData) {
      const channel = oldState.guild.channels.cache.get(oldState.channelId);
      if (channel && channel.isVoiceBased() && channel.members.size === 0) {
        try {
          if (tempChannelData.textChannelId) {
            const textChannel = oldState.guild.channels.cache.get(tempChannelData.textChannelId);
            if (textChannel) {
              await textChannel.delete().catch(() => null);
            }
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
