import {
  ChannelType,
  TextChannel,
  VoiceChannel,
  VoiceState,
  ActionRowBuilder,
  ButtonBuilder,
  PermissionFlagsBits,
  OverwriteType,
} from 'discord.js';
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
  ensureRoomTextChannel,
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

  const settings = await GuildSettings.findOne({ guildId }).catch(() => null);
  let setup: any = null;

  if (newState.channelId) {
    // 1. Direct match on GuildSetup generatorChannelId
    setup = await GuildSetup.findOne({ guildId, generatorChannelId: newState.channelId }).catch(() => null);

    // 2. Match on GuildSettings setupChannelId
    if (!setup && settings?.setupChannelId === newState.channelId) {
      setup = (await GuildSetup.findOne({ guildId, isDefault: true }).catch(() => null))
        || (await GuildSetup.findOne({ guildId }).catch(() => null));
    }

    // 3. Fallback: auto-detect by common generator names in registered categories
    if (!setup && newState.channel) {
      const channelNameLower = newState.channel.name.toLowerCase().trim();
      const isNamedJoinToCreate =
        channelNameLower.includes('join to create') ||
        channelNameLower.includes('create your own') ||
        channelNameLower.includes('create-vc') ||
        channelNameLower.includes('custom vc');

      if (isNamedJoinToCreate) {
        const isUnderKnownCategory = Boolean(
          (settings?.setupCategoryId && newState.channel.parentId === settings.setupCategoryId) ||
          (await GuildSetup.exists({ guildId, categoryId: newState.channel.parentId }).catch(() => false))
        );

        if (isUnderKnownCategory) {
          console.log(`[Join to Create] Auto-detected generator channel by name in guild ${guildId}: "${newState.channel.name}" (${newState.channelId})`);
          setup = (await GuildSetup.findOne({ guildId, isDefault: true }).catch(() => null))
            || (await GuildSetup.findOne({ guildId }).catch(() => null));

          // Link it in DB so future lookups are immediate
          await GuildSettings.updateOne({ guildId }, { setupChannelId: newState.channelId }).catch(() => null);
          if (setup) {
            await GuildSetup.updateOne({ _id: setup._id }, { generatorChannelId: newState.channelId }).catch(() => null);
          }
        }
      }
    }
  }

  const isGeneratorChannel = Boolean(
    newState.channelId && (setup || (settings?.setupChannelId === newState.channelId))
  );

  if (newState.channelId && isGeneratorChannel) {
    console.log(`[Join to Create] Triggered by ${member.user.tag} (${member.id}) in channel ${newState.channelId} (guild: "${guild.name}")`);

    try {
      const profile = await UserProfile.findOne({ userId: member.id }).catch(() => null);
      const rawTemplate = profile?.defaultName?.trim()
        || setup?.channelNameTemplate?.trim()
        || settings?.defaultName?.trim()
        || "{user}'s Room";

      const formattedName = formatRoomName(rawTemplate, member).trim();
      const channelName = (formattedName.length > 0 ? formattedName : `${member.displayName}'s Room`).slice(0, 100);

      const userLimit = profile?.defaultLimit ?? setup?.defaultUserLimit ?? settings?.defaultLimit ?? 0;
      const defaultBitrateKbps = setup?.defaultBitrate ?? 64;
      const bitrate = profile?.defaultBitrate
        ? Math.min(guild.maximumBitrate, Math.max(8_000, profile.defaultBitrate * 1_000))
        : Math.min(guild.maximumBitrate, Math.max(8_000, defaultBitrateKbps * 1_000));
      const rtcRegion = setup?.defaultRegion ?? null;

      // Validate target category
      let targetCategoryId: string | undefined = undefined;
      const preferredCatId = setup?.categoryId || settings?.setupCategoryId || newState.channel?.parentId;
      if (preferredCatId) {
        const cat = guild.channels.cache.get(preferredCatId);
        if (cat && cat.type === ChannelType.GuildCategory) {
          targetCategoryId = cat.id;
        }
      }

      const permissionOverwrites = [
        {
          id: member.id,
          type: OverwriteType.Member,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.Stream,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.UseExternalEmojis,
          ],
        },
        {
          id: guild.client.user!.id,
          type: OverwriteType.Member,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageRoles,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.UseExternalEmojis,
          ],
        },
      ];

      let newChannel: VoiceChannel;
      try {
        newChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildVoice,
          parent: targetCategoryId,
          userLimit,
          bitrate,
          rtcRegion: rtcRegion ?? undefined,
          permissionOverwrites,
        });
      } catch (catErr: any) {
        console.warn(`[Join to Create] Failed creating in category ${targetCategoryId}, retrying without parent:`, catErr?.message);
        try {
          newChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            userLimit,
            bitrate,
            rtcRegion: rtcRegion ?? undefined,
            permissionOverwrites,
          });
        } catch (fatalErr) {
          console.error(`[Join to Create] Fatal: failed to create voice channel in guild ${guild.id}:`, fatalErr);
          return;
        }
      }

      // Move member to the newly created channel
      try {
        await newState.setChannel(newChannel);
      } catch (moveErr) {
        console.error(`[Join to Create] Failed to move member ${member.id} into ${newChannel.id}:`, moveErr);
        await newChannel.delete().catch(() => null);
        return;
      }

      const tempDoc = await TempChannel.create({
        guildId,
        channelId: newChannel.id,
        ownerId: member.id,
        userLimit: newChannel.userLimit || 0,
        bitrate: newChannel.bitrate,
        status: setup?.defaultStatus || null,
        setupId: setup?._id ? String(setup._id) : (settings?.setupChannelId === newState.channelId ? `legacy_${guildId}` : null),
      });

      if (setup?.defaultStatus) {
        await client.rest.put(`/channels/${newChannel.id}/voice-status`, {
          body: { status: setup.defaultStatus },
        }).catch(() => null);
      }

      // If autoTextChannel is enabled, automatically provision the companion text channel
      if (setup?.autoTextChannel) {
        await ensureRoomTextChannel(newChannel, tempDoc, 'Automatic temporary voice room chat', getDisplayNameParts(member)).catch(() => null);
      }

      await refreshRoomPanel(newChannel, tempDoc, member, settings, ENV.DASHBOARD_URL || undefined).catch((panelErr) => {
        console.error(`[Join to Create] Non-fatal: failed to refresh room panel:`, panelErr);
      });

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
      }).catch(() => null);

      console.log(`[Join to Create] Successfully created "${newChannel.name}" (${newChannel.id}) for ${member.user.tag}`);
    } catch (error) {
      console.error('[VoiceState] Error creating temp channel:', error);
    }
  }

  if (newState.channelId) {
    const tempChannel = await TempChannel.findOne({ channelId: newState.channelId }).catch(() => null);
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

    if (oldState.channelId !== newState.channelId && !isGeneratorChannel) {
      await logEvent({
        guild,
        type: 'userMovement',
        title: 'User Joined Voice',
        description: `${member} joined \`${voiceChannel?.name || 'Voice Channel'}\``,
        color: 0x3498db,
        executor: { id: member.id, tag: member.user.tag, avatarUrl: member.user.displayAvatarURL() },
      }).catch(() => null);
    }
  }

  if (oldState.channelId) {
    const tempChannelData = await TempChannel.findOne({ channelId: oldState.channelId }).catch(() => null);
    const oldChannel = guild.channels.cache.get(oldState.channelId);

    if (tempChannelData && (!oldChannel || (oldChannel.isVoiceBased() && oldChannel.members.size === 0))) {
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

        await TempChannel.deleteOne({ channelId: oldState.channelId }).catch(() => null);
        if (oldChannel) {
          await oldChannel.delete().catch(() => null);
        }

        if (oldChannel) {
          await logEvent({
            guild,
            type: 'channelDeleted',
            title: 'Temporary Voice Channel Deleted',
            description: `\`${oldChannel.name}\` was automatically deleted.`,
            color: 0xed4245,
          }).catch(() => null);
        }
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
      const oldSetup = await GuildSetup.findOne({ guildId, generatorChannelId: oldState.channelId }).catch(() => null);
      const isLeavingGeneratorChannel = Boolean(
        (oldSetup && oldState.channelId === oldSetup.generatorChannelId) ||
        (!oldSetup && settings?.setupChannelId === oldState.channelId)
      );

      if (isLeavingGeneratorChannel) {
        await logEvent({
          guild,
          type: 'userMovement',
          title: 'Moved to Temp VC',
          description: `${member} was moved to their new temporary channel.`,
          color: 0x95a5a6,
          executor: { id: member.id, tag: member.user.tag, avatarUrl: member.user.displayAvatarURL() },
        }).catch(() => null);
      } else {
        await logEvent({
          guild,
          type: 'userMovement',
          title: 'User Left Voice',
          description: `${member} left \`${oldChannel?.name || 'Voice Channel'}\``,
          color: 0x95a5a6,
          executor: { id: member.id, tag: member.user.tag, avatarUrl: member.user.displayAvatarURL() },
        }).catch(() => null);
      }
    }
  }
};
