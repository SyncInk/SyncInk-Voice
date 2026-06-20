import { ChannelType, TextChannel, VoiceChannel, VoiceState } from 'discord.js';
import { SyncinkBot } from '../bot';
import { GuildSettings } from '../../database/models/GuildSettings';
import { GuildSetup } from '../../database/models/GuildSetup';
import { TempChannel } from '../../database/models/TempChannel';
import { UserProfile } from '../../database/models/UserProfile';
import {
  buildControlPanelEmbed,
  ensureRoomTextChannel,
  formatRoomName,
  getDisplayNameParts,
} from '../utils/tempRoom';
import { getPanelButtons, getPanelDropdowns } from '../utils/components';
import { sendWebhookMessage } from '../utils/webhook';
import { logEvent } from '../utils/logger';
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

  // Look up GuildSetup first (supports multiple setups)
  const setup = newState.channelId
    ? await GuildSetup.findOne({ guildId, generatorChannelId: newState.channelId })
    : null;

  // Fetch settings for server branding (avatar/banner) and legacy fallback
  const settings = await GuildSettings.findOne({ guildId });

  const isGeneratorChannel = setup
    ? newState.channelId === setup.generatorChannelId
    : newState.channelId === settings?.setupChannelId;

  if (newState.channelId && isGeneratorChannel) {
    try {
      const profile = await UserProfile.findOne({ userId: member.id });

      // Resolve name template: user profile > setup template > settings template > default
      const rawTemplate = profile?.defaultName?.trim()
        || setup?.channelNameTemplate
        || settings?.defaultName
        || "{user}'s Room";

      const userLimit = profile?.defaultLimit ?? setup?.defaultUserLimit ?? settings?.defaultLimit ?? 0;

      const defaultBitrateKbps = setup?.defaultBitrate ?? 64;
      const bitrate = profile?.defaultBitrate
        ? Math.min(newState.guild.maximumBitrate, Math.max(8_000, profile.defaultBitrate * 1_000))
        : Math.min(newState.guild.maximumBitrate, Math.max(8_000, defaultBitrateKbps * 1_000));

      const categoryId = setup?.categoryId ?? settings?.setupCategoryId ?? newState.channel?.parentId ?? undefined;
      const rtcRegion = setup?.defaultRegion ?? null;

      const newChannel = await newState.guild.channels.create({
        name: formatRoomName(rawTemplate, member),
        type: ChannelType.GuildVoice,
        parent: categoryId || undefined,
        userLimit,
        bitrate,
        rtcRegion: rtcRegion ?? undefined,
        permissionOverwrites: [
          {
            id: member.id,
            allow: ['ViewChannel', 'Connect', 'ManageChannels', 'MoveMembers', 'DeafenMembers', 'MuteMembers'],
          },
        ],
      });

      await newState.setChannel(newChannel);

      const tempDoc = await TempChannel.create({
        guildId,
        channelId: newChannel.id,
        ownerId: member.id,
        userLimit: newChannel.userLimit || 0,
        bitrate: newChannel.bitrate,
        status: setup?.defaultStatus || null,
      });

      // Set initial voice channel status if configured
      if (setup?.defaultStatus) {
        await _client.rest.put(`/channels/${newChannel.id}/voice-status`, {
          body: { status: setup.defaultStatus },
        }).catch(() => null);
      }

      // Send control panel embed in the new voice channel itself
      const embed = buildControlPanelEmbed(member, ENV.DASHBOARD_URL || undefined, settings);
      const components = [...getPanelButtons(), ...getPanelDropdowns()];
      await sendWebhookMessage(
        newChannel,
        { content: `<@${member.id}>`, embeds: [embed], components },
        { serverAvatar: settings?.serverAvatar, serverNickname: settings?.serverNickname }
      );

      // Auto text channel if configured in setup
      if (setup?.autoTextChannel) {
        const ownerName = getDisplayNameParts(member);
        await ensureRoomTextChannel(newChannel, tempDoc, 'Auto temporary text channel', ownerName);
      }

      // Welcome message
      if (setup?.welcomeMessage) {
        const ownerName = getDisplayNameParts(member);
        const msg = setup.welcomeMessage
          .replace(/{mention}/g, `<@${member.id}>`)
          .replace(/{user}/g, ownerName)
          .replace(/{username}/g, member.user.username)
          .replace(/{channel}/g, newChannel.name)
          .replace(/{server}/g, newState.guild.name);
        await sendWebhookMessage(
          newChannel,
          { content: msg },
          { serverAvatar: settings?.serverAvatar, serverNickname: settings?.serverNickname }
        );
      }
      // Audit log: channel created
      await logEvent({
        guild: newState.guild,
        type: 'channelCreated',
        title: 'Temporary Voice Channel Created',
        description: `${member} created \`${newChannel.name}\``,
        color: 0x57f287,
        executor: { id: member.id, tag: member.user.tag, avatarUrl: member.user.displayAvatarURL() },
      });

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

    if (oldState.channelId !== newState.channelId) {
      await logEvent({
        guild: newState.guild,
        type: 'userMovement',
        title: 'User Joined Voice',
        description: `${member} joined \`${voiceChannel?.name || 'Voice Channel'}\``,
        color: 0x3498db,
        executor: { id: member.id, tag: member.user.tag, avatarUrl: member.user.displayAvatarURL() },
      });
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

          await logEvent({
            guild: oldState.guild,
            type: 'channelDeleted',
            title: 'Temporary Voice Channel Deleted',
            description: `\`${channel.name}\` was automatically deleted.`,
            color: 0xed4245,
          });
        } catch (error) {
          console.error('[VoiceState] Error deleting empty temp channel:', error);
        }
      }
    }

    if (oldState.channelId !== newState.channelId) {
      const oldChannel = oldState.guild.channels.cache.get(oldState.channelId);
      await logEvent({
        guild: oldState.guild,
        type: 'userMovement',
        title: 'User Left Voice',
        description: `${member} left \`${oldChannel?.name || 'Voice Channel'}\``,
        color: 0x95a5a6,
        executor: { id: member.id, tag: member.user.tag, avatarUrl: member.user.displayAvatarURL() },
      });
    }
  }
};
