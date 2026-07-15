import { ChannelType, TextChannel, VoiceChannel, VoiceState, ActionRowBuilder, ButtonBuilder } from 'discord.js';
import { SyncinkBot } from '../bot';
import { GuildSettings } from '../../database/models/GuildSettings';
import { GuildSetup } from '../../database/models/GuildSetup';
import { TempChannel } from '../../database/models/TempChannel';
import { UserProfile } from '../../database/models/UserProfile';
import {
  formatRoomName,
  getDisplayNameParts,
  clearOwnershipWarning,
  ensureOwnershipWarning,
  refreshRoomPanel,
  markPanelDeletionIgnored,
} from '../utils/tempRoom';
import { sendWebhookMessage } from '../utils/webhook';
import { logEvent } from '../utils/logger';
import { ENV } from '../../config/config';

const getOwnerMember = async (guild: VoiceState['guild'], ownerId: string, fallback: VoiceState['member']) => {
  const cachedOwner = guild.members.cache.get(ownerId);
  if (cachedOwner) {
    return cachedOwner;
  }

  return fallback ?? null;
};

export const handleVoiceStateUpdate = async (
  client: SyncinkBot,
  oldState: VoiceState,
  newState: VoiceState,
) => {
  if (oldState.channelId === newState.channelId) {
    return;
  }

  const guild = newState.guild || oldState.guild;
  const guildId = guild.id;
  const member = newState.member || oldState.member;

  if (!member || member.user.bot) {
    return;
  }

  const setup = newState.channelId
    ? await GuildSetup.findOne({ guildId, generatorChannelId: newState.channelId })
    : null;
  const settings = await GuildSettings.findOne({ guildId });

  const isGeneratorChannel = newState.channelId
    ? Boolean(
      (setup && newState.channelId === setup.generatorChannelId)
      || (!setup && settings?.setupChannelId === newState.channelId),
    )
    : false;

  if (newState.channelId && isGeneratorChannel) {
    try {
      const profile = await UserProfile.findOne({ userId: member.id });
      const rawTemplate = profile?.defaultName?.trim()
        || setup?.channelNameTemplate
        || settings?.defaultName
        || "{user}'s Room";

      const userLimit = profile?.defaultLimit ?? setup?.defaultUserLimit ?? settings?.defaultLimit ?? 0;
      const defaultBitrateKbps = setup?.defaultBitrate ?? 64;
      const bitrate = profile?.defaultBitrate
        ? Math.min(guild.maximumBitrate, Math.max(8_000, profile.defaultBitrate * 1_000))
        : Math.min(guild.maximumBitrate, Math.max(8_000, defaultBitrateKbps * 1_000));
      const categoryId = setup?.categoryId ?? settings?.setupCategoryId ?? newState.channel?.parentId ?? undefined;
      const rtcRegion = setup?.defaultRegion ?? null;

      let newChannel: VoiceChannel;
      try {
        newChannel = await guild.channels.create({
          name: formatRoomName(rawTemplate, member),
          type: ChannelType.GuildVoice,
          parent: categoryId || undefined,
          userLimit,
          bitrate,
          rtcRegion: rtcRegion ?? undefined,
          permissionOverwrites: [
            {
              id: member.id,
              allow: ['ViewChannel', 'Connect', 'ManageChannels', 'MoveMembers'],
            },
            {
              id: guild.client.user!.id,
              allow: ['ViewChannel', 'Connect', 'SendMessages', 'EmbedLinks', 'ReadMessageHistory', 'ManageChannels', 'ManageRoles', 'MoveMembers'],
            },
          ],
        });
      } catch (err) {
        console.error(`[Join to Create] Failed to create voice channel in guild ${guild.id}:`, err);
        return;
      }

      await newState.setChannel(newChannel);

      const tempDoc = await TempChannel.create({
        guildId,
        channelId: newChannel.id,
        ownerId: member.id,
        userLimit: newChannel.userLimit || 0,
        bitrate: newChannel.bitrate,
        status: setup?.defaultStatus || null,
      });

      if (setup?.defaultStatus) {
        await client.rest.put(`/channels/${newChannel.id}/voice-status`, {
          body: { status: setup.defaultStatus },
        }).catch(() => null);
      }

      await refreshRoomPanel(newChannel, tempDoc, member, settings, ENV.DASHBOARD_URL || undefined);

      if (setup?.welcomeMessage) {
        const ownerName = getDisplayNameParts(member);
        const msg = setup.welcomeMessage
          .replace(/{mention}/g, `<@${member.id}>`)
          .replace(/{user}/g, ownerName)
          .replace(/{username}/g, member.user.username)
          .replace(/{channel}/g, newChannel.name)
          .replace(/{server}/g, guild.name);

        const textChannel = tempDoc.textChannelId
          ? guild.channels.cache.get(tempDoc.textChannelId)
          : null;

        if (textChannel?.isTextBased()) {
          await sendWebhookMessage(
            textChannel as TextChannel,
            { content: msg },
            { serverAvatar: settings?.serverAvatar, serverNickname: settings?.serverNickname },
          ).catch(() => null);
        }
      }

      await logEvent({
        guild,
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
    const voiceChannel = guild.channels.cache.get(newState.channelId) as VoiceChannel | undefined;

    if (tempChannel && voiceChannel?.isVoiceBased()) {
      const owner = await getOwnerMember(guild, tempChannel.ownerId, member);
      if (owner) {
        if (tempChannel.ownerWarningExpiresAt) {
          await clearOwnershipWarning(guild, tempChannel, 'returned');
        }

        await refreshRoomPanel(voiceChannel, tempChannel, owner, settings, ENV.DASHBOARD_URL || undefined).catch(() => null);
      }

      if (tempChannel.lfmMessageId && tempChannel.lfmChannelId && member.id !== tempChannel.ownerId) {
        const lfmChannel = guild.channels.cache.get(tempChannel.lfmChannelId);
        if (lfmChannel?.isTextBased()) {
          const lfmMsg = await lfmChannel.messages.fetch(tempChannel.lfmMessageId).catch(() => null);
          if (lfmMsg && lfmMsg.components.length > 0) {
            const row = lfmMsg.components[0] as any;
            const disabledRow = new ActionRowBuilder<ButtonBuilder>();
            row.components.forEach((c: any) => {
              disabledRow.addComponents(ButtonBuilder.from(c as any).setDisabled(true).setLabel('Claimed'));
            });
            await lfmMsg.edit({ components: [disabledRow] }).catch(() => null);
          }
        }
        tempChannel.lfmMessageId = null;
        tempChannel.lfmChannelId = null;
        await tempChannel.save().catch(() => null);
      }
    }

    if (oldState.channelId !== newState.channelId) {
      await logEvent({
        guild,
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
      const oldChannel = guild.channels.cache.get(oldState.channelId);

    if (tempChannelData && oldChannel && oldChannel.isVoiceBased() && oldChannel.members.size === 0) {
      try {
        if (tempChannelData.panelMessageId) {
          const panelChannel = tempChannelData.panelChannelId
            ? guild.channels.cache.get(tempChannelData.panelChannelId)
            : null;
          const panelMessage = panelChannel?.isTextBased()
            ? await panelChannel.messages.fetch(tempChannelData.panelMessageId).catch(() => null)
            : null;

          if (panelMessage) {
            markPanelDeletionIgnored(panelMessage.id);
            await panelMessage.delete().catch(() => null);
          }
        }

        if (tempChannelData.textChannelId) {
          const textChannel = guild.channels.cache.get(tempChannelData.textChannelId);
          if (textChannel) {
            await textChannel.delete().catch(() => null);
          }
        }

        await TempChannel.deleteOne({ channelId: oldState.channelId });
        await oldChannel.delete();

        await logEvent({
          guild,
          type: 'channelDeleted',
          title: 'Temporary Voice Channel Deleted',
          description: `\`${oldChannel.name}\` was automatically deleted.`,
          color: 0xed4245,
        });
      } catch (error) {
        console.error('[VoiceState] Error deleting empty temp channel:', error);
      }
    } else if (tempChannelData && oldChannel && oldChannel.isVoiceBased() && oldState.channelId !== newState.channelId) {
      if (oldState.member && tempChannelData.ownerId === oldState.member.id && oldChannel.members.size > 0) {
        await ensureOwnershipWarning(oldChannel as VoiceChannel, tempChannelData, oldState.member, settings, ENV.DASHBOARD_URL || undefined).catch(() => null);
      }

      const owner = await getOwnerMember(guild, tempChannelData.ownerId, member);
      if (owner) {
        await refreshRoomPanel(oldChannel as VoiceChannel, tempChannelData, owner, settings, ENV.DASHBOARD_URL || undefined).catch(() => null);
      }

      if (tempChannelData.textChannelId) {
        const textChannel = guild.channels.cache.get(tempChannelData.textChannelId) as TextChannel | undefined;
        if (textChannel?.isTextBased()) {
          if (!tempChannelData.permittedUsers.includes(member.id) && tempChannelData.ownerId !== member.id) {
            await textChannel.permissionOverwrites.delete(member.id).catch(() => null);
          }
        }
      }
    }

    if (oldState.channelId !== newState.channelId) {
      await logEvent({
        guild,
        type: 'userMovement',
        title: 'User Left Voice',
        description: `${member} left \`${oldChannel?.name || 'Voice Channel'}\``,
        color: 0x95a5a6,
        executor: { id: member.id, tag: member.user.tag, avatarUrl: member.user.displayAvatarURL() },
      });
    }
  }
};
