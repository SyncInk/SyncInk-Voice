import {
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildMember,
  Message,
  PermissionFlagsBits,
  TextChannel,
  VoiceChannel,
} from 'discord.js';
import { ITempChannel } from '../../database/models/TempChannel';
import { GuildSettings, IGuildSettings } from '../../database/models/GuildSettings';
import { ENV } from '../../config/config';
import { sendWebhookMessage } from './webhook';
import { getPanelButtons, getPanelDropdowns } from './components';

const PANEL_FOOTER_PREFIX = 'SyncInk Panel';
const ignoredPanelDeletes = new Set<string>();

export const markPanelDeletionIgnored = (messageId: string) => {
  ignoredPanelDeletes.add(messageId);
};

export const shouldIgnorePanelDeletion = (messageId: string) => {
  if (!ignoredPanelDeletes.has(messageId)) {
    return false;
  }

  ignoredPanelDeletes.delete(messageId);
  return true;
};

export const getDisplayNameParts = (member: GuildMember) => {
  const sourceName = member.displayName || member.user.globalName || member.user.username;
  const parts = sourceName
    .replace(/[^\p{L}\p{N}\s._-]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.length ? parts.join(' ') : member.user.username;
};

export const formatRoomName = (template: string, member: GuildMember) => {
  const ownerName = getDisplayNameParts(member);
  return template
    .replaceAll('{user}', ownerName)
    .replaceAll('{name}', ownerName)
    .slice(0, 100);
};

export const toTextChannelName = (roomName: string) => {
  const normalized = roomName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);

  return `${normalized || 'room'}-chat`;
};

export const getRoomStatusLabel = (tempChannel: Pick<ITempChannel, 'isLocked' | 'isPrivate' | 'isHidden'>) => {
  if (tempChannel.isLocked) return 'Locked';
  if (tempChannel.isPrivate || tempChannel.isHidden) return 'Private';
  return 'Public';
};

export const buildRoomEmbed = (title: string, description?: string) => {
  const embed = new EmbedBuilder().setColor(ENV.BRAND_COLOR).setTitle(title).setTimestamp();
  if (description) {
    embed.setDescription(description);
  }

  return embed;
};

export const getCurrentGameName = (member: GuildMember) => {
  const activity = member.presence?.activities.find((item) => item.type === 0 && item.name);
  return activity?.name?.slice(0, 80) || null;
};

const buildRoomInfoLines = (tempChannel?: ITempChannel | null, voiceChannel?: VoiceChannel | null) => {
  if (!tempChannel || !voiceChannel) {
    return ['Use the menus below to manage this temporary room.'];
  }

  const memberCount = voiceChannel.members.size;
  const limitText = voiceChannel.userLimit ? `${memberCount} / ${voiceChannel.userLimit}` : `${memberCount}`;

  return [
    'Use the menus below to manage this temporary room.',
    '',
    `Room owner: <@${tempChannel.ownerId}>`,
    `Members: **${limitText}**`,
    `Status: **${getRoomStatusLabel(tempChannel)}**`,
    tempChannel.isNsfw ? 'NSFW: **Enabled**' : 'NSFW: **Disabled**',
  ];
};

export const buildControlPanelEmbed = (
  member: GuildMember,
  dashboardUrl?: string,
  settings?: IGuildSettings | null,
  tempChannel?: ITempChannel | null,
  voiceChannel?: VoiceChannel | null,
) => {
  const roomOwner = tempChannel ? member.guild.members.cache.get(tempChannel.ownerId) ?? null : null;
  const panelTitle = voiceChannel?.name || 'Temporary Voice Control Panel';
  const description = buildRoomInfoLines(tempChannel, voiceChannel).join('\n');

  const embed = new EmbedBuilder()
    .setColor(ENV.BRAND_COLOR)
    .setAuthor({
      name: member.guild.name,
      iconURL:
        settings?.serverAvatar ||
        member.guild.iconURL({ size: 256 }) ||
        roomOwner?.displayAvatarURL({ size: 256 }) ||
        member.user.displayAvatarURL({ size: 256 }),
    })
    .setTitle(panelTitle)
    .setThumbnail(
      settings?.serverAvatar ||
        roomOwner?.displayAvatarURL({ size: 256 }) ||
        member.user.displayAvatarURL({ size: 256 }),
    )
    .setDescription(description)
    .addFields(
      {
        name: 'Room Management',
        value: 'Rename, set the user limit, change bitrate, switch region, set game/activity, toggle NSFW, and manage the linked text chat.',
      },
      {
        name: 'Permissions',
        value: 'Lock, unlock, permit, reject, ghost, reveal, transfer ownership, kick users, and ban users.',
      },
    )
    .setFooter({
      text: `${PANEL_FOOTER_PREFIX} | ${voiceChannel?.id || tempChannel?.channelId || 'unknown'}${dashboardUrl ? ` | ${dashboardUrl}` : ''}`,
    });

  if (settings?.serverBanner) {
    embed.setImage(settings.serverBanner);
  }

  return embed;
};

export const buildLookingForMembersEmbed = (
  member: GuildMember,
  channelName: string,
  memberCount: number,
  limit: number,
) =>
  new EmbedBuilder()
    .setColor(ENV.BRAND_COLOR)
    .setAuthor({
      name: member.displayName,
      iconURL: member.user.displayAvatarURL({ size: 64 }),
    })
    .setTitle('Looking for members')
    .setDescription(`**${channelName}** is looking for more members.`)
    .addFields(
      {
        name: 'Channel',
        value: channelName,
        inline: true,
      },
      {
        name: 'Members',
        value: `${memberCount}${limit ? ` / ${limit}` : ''}`,
        inline: true,
      },
    )
    .setFooter({ text: 'Looking for members' })
    .setTimestamp();

const getPanelMarker = (voiceChannelId: string) => `${PANEL_FOOTER_PREFIX} | ${voiceChannelId}`;

const syncTextChannelAccess = async (textChannel: TextChannel, voiceChannel: VoiceChannel, tempChannel: ITempChannel) => {
  const allowedIds = new Set<string>([tempChannel.ownerId]);
  for (const [memberId] of voiceChannel.members) {
    allowedIds.add(memberId);
  }
  for (const permittedId of tempChannel.permittedUsers) {
    allowedIds.add(permittedId);
  }

  for (const [memberId] of voiceChannel.members) {
    await textChannel.permissionOverwrites.edit(memberId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    }).catch(() => null);
  }

  const overwrites = textChannel.permissionOverwrites.cache.filter((overwrite) => overwrite.type === 1);
  for (const [targetId] of overwrites) {
    if (targetId === tempChannel.ownerId) {
      continue;
    }

    if (voiceChannel.members.has(targetId)) {
      continue;
    }

    if (allowedIds.has(targetId)) {
      continue;
    }

    await textChannel.permissionOverwrites.delete(targetId).catch(() => null);
  }

  if (tempChannel.isNsfw) {
    await textChannel.setNSFW(true).catch(() => null);
  }
};

export const ensureRoomTextChannel = async (
  voiceChannel: VoiceChannel,
  tempChannel: ITempChannel,
  reason = 'Temporary voice room chat',
  ownerName?: string,
) => {
  const guild = voiceChannel.guild;
  const existing = tempChannel.textChannelId
    ? guild.channels.cache.get(tempChannel.textChannelId)
    : null;

  if (existing?.type === ChannelType.GuildText) {
    const textChannel = existing as TextChannel;
    await syncTextChannelAccess(textChannel, voiceChannel, tempChannel);
    return textChannel;
  }

  const channelName = toTextChannelName(ownerName || voiceChannel.name);

  const textChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: voiceChannel.parentId,
    reason,
    nsfw: Boolean(tempChannel.isNsfw),
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      ...voiceChannel.members.map((voiceMember) => ({
        id: voiceMember.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      })),
    ],
  });

  if (tempChannel.isNsfw) {
    await textChannel.setNSFW(true).catch(() => null);
  }

  tempChannel.textChannelId = textChannel.id;
  await tempChannel.save();

  return textChannel;
};

export const refreshRoomPanel = async (
  voiceChannel: VoiceChannel,
  tempChannel: ITempChannel,
  member: GuildMember,
  settings?: IGuildSettings | null,
  dashboardUrl?: string,
) => {
  const guildSettings = settings ?? (await GuildSettings.findOne({ guildId: voiceChannel.guild.id }).catch(() => null));
  const panelOwner =
    voiceChannel.guild.members.cache.get(tempChannel.ownerId)
    ?? (await voiceChannel.guild.members.fetch(tempChannel.ownerId).catch(() => null))
    ?? member;
  const textChannel = await ensureRoomTextChannel(
    voiceChannel,
    tempChannel,
    'Temporary room control panel',
    getDisplayNameParts(panelOwner),
  );

  await syncTextChannelAccess(textChannel, voiceChannel, tempChannel);

  const marker = getPanelMarker(voiceChannel.id);
  const recent = await textChannel.messages.fetch({ limit: 50 }).catch(() => null);
  if (recent) {
    const duplicates = recent.filter((message) => {
      const footer = message.embeds[0]?.footer?.text || '';
      return footer.includes(marker);
    });

    for (const message of duplicates.values()) {
      if (tempChannel.panelMessageId === message.id) {
        continue;
      }

      markPanelDeletionIgnored(message.id);
      await message.delete().catch(() => null);
    }
  }

  if (tempChannel.panelMessageId) {
    const existingPanel = await textChannel.messages.fetch(tempChannel.panelMessageId).catch(() => null);
    if (existingPanel) {
      markPanelDeletionIgnored(existingPanel.id);
      await existingPanel.delete().catch(() => null);
    }
  }

  const panelEmbed = buildControlPanelEmbed(panelOwner, dashboardUrl, guildSettings, tempChannel, voiceChannel);
  const sent = await sendWebhookMessage(
    textChannel,
    {
      embeds: [panelEmbed],
      components: [...getPanelButtons(), ...getPanelDropdowns()],
      allowedMentions: { parse: [] },
    },
    {
      serverAvatar: guildSettings?.serverAvatar || null,
      serverNickname: guildSettings?.serverNickname || null,
      defaultName: panelOwner.guild.client.user?.username,
    },
  );

  if (sent instanceof Message) {
    await sent.pin().catch(() => null);
    tempChannel.panelMessageId = sent.id;
    tempChannel.panelChannelId = textChannel.id;
    await tempChannel.save();
    return sent;
  }

  return null;
};

export const restoreRoomPanel = async (
  guild: Guild,
  tempChannel: ITempChannel,
  dashboardUrl?: string,
) => {
  const voiceChannel = guild.channels.cache.get(tempChannel.channelId);
  if (!voiceChannel || !voiceChannel.isVoiceBased()) {
    return null;
  }

  const owner = await guild.members.fetch(tempChannel.ownerId).catch(() => null);
  if (!owner) {
    return null;
  }

  const settings = await GuildSettings.findOne({ guildId: guild.id }).catch(() => null);
  return refreshRoomPanel(voiceChannel as VoiceChannel, tempChannel, owner, settings, dashboardUrl);
};

export const refreshGuildPanels = async (
  guild: Guild,
  tempChannels: ITempChannel[],
  dashboardUrl?: string,
) => {
  const settings = await GuildSettings.findOne({ guildId: guild.id }).catch(() => null);

  for (const tempChannel of tempChannels) {
    const voiceChannel = guild.channels.cache.get(tempChannel.channelId);
    if (!voiceChannel || !voiceChannel.isVoiceBased()) {
      continue;
    }

    const owner = await guild.members.fetch(tempChannel.ownerId).catch(() => null);
    if (!owner) {
      continue;
    }

    await refreshRoomPanel(voiceChannel as VoiceChannel, tempChannel, owner, settings, dashboardUrl).catch(() => null);
  }
};
