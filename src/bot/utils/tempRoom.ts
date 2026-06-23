import {
  ChannelType,
  EmbedBuilder,
  Guild,
  GuildMember,
  Message,
  PermissionFlagsBits,
  TextChannel,
  VoiceChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { TempChannel, ITempChannel } from '../../database/models/TempChannel';
import { GuildSettings, IGuildSettings } from '../../database/models/GuildSettings';
import { ENV } from '../../config/config';
import { sendWebhookMessage } from './webhook';
import { getPanelButtons, getPanelDropdowns } from './components';

const PANEL_FOOTER_PREFIX = 'SyncInk Panel';
const ignoredPanelDeletes = new Set<string>();
const panelLocks = new Set<string>();
const OWNER_WARNING_DURATION_MS = 3 * 60 * 1000;
const ownershipWarningTimers = new Map<string, ReturnType<typeof setTimeout>>();

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

const getOwnershipWarningKey = (guildId: string, channelId: string) => `${guildId}:${channelId}`;

const clearOwnershipWarningTimer = (guildId: string, channelId: string) => {
  const key = getOwnershipWarningKey(guildId, channelId);
  const timer = ownershipWarningTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    ownershipWarningTimers.delete(key);
  }
};

export const formatRoomName = (template: string, member: GuildMember) => {
  const ownerName = getDisplayNameParts(member);
  return template
    .replaceAll('{user}', ownerName)
    .replaceAll('{name}', ownerName)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{displayname}', member.displayName)
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
  const isValidUrl = (url?: string | null) => url && (url.startsWith('http://') || url.startsWith('https://'));

  const validServerAvatar = isValidUrl(settings?.serverAvatar) ? settings!.serverAvatar : null;
  const validServerBanner = isValidUrl(settings?.serverBanner) ? settings!.serverBanner : null;
  const currentMembers = voiceChannel?.members.size ?? 0;
  const currentLimit = voiceChannel?.userLimit ?? tempChannel?.userLimit ?? 0;
  const statusText = tempChannel ? getRoomStatusLabel(tempChannel) : 'Public';
  const accessText = tempChannel?.isNsfw ? 'NSFW enabled' : 'NSFW disabled';

  const embed = new EmbedBuilder()
    .setColor(ENV.BRAND_COLOR)
    .setTitle('Your Custom Audio Space')
    .setDescription(
      [
        'Pick what you need and change it instantly through the menus below.',
        '',
        '━━━━━━━━━━━━━━━━━━━━',
        '',
        '**Room Overview**',
        `Owner: <@${roomOwner?.id || member.id}>`,
        `Members: **${currentMembers}${currentLimit ? ` / ${currentLimit}` : ''}**`,
        `Status: **${statusText}**`,
        accessText,
        '',
        '━━━━━━━━━━━━━━━━━━━━',
        '',
        '**Controls**',
        'Use the first menu for room settings, and the second menu for permissions and access.',
        'This panel stays synced with the dashboard, so changes show up everywhere.',
        '',
        '━━━━━━━━━━━━━━━━━━━━',
        '',
        '**Quick Setup**',
        'Use `/setup` once in each server to set the join-to-create channel, then manage everything here.',
      ].join('\n'),
    )
    .setThumbnail(
      validServerAvatar ||
        roomOwner?.displayAvatarURL({ size: 256 }) ||
        member.user.displayAvatarURL({ size: 256 }),
    );

  if (validServerBanner) {
    embed.setImage(validServerBanner);
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

const getPanelTargetChannel = async (voiceChannel: VoiceChannel, tempChannel: ITempChannel) => {
  const guild = voiceChannel.guild;
  if (tempChannel.textChannelId) {
    const textChannel = guild.channels.cache.get(tempChannel.textChannelId);
    if (textChannel?.type === ChannelType.GuildText) {
      return textChannel as TextChannel;
    }
  }

  return voiceChannel;
};

const buildOwnerLeftWarningEmbed = (roomName: string, expiresAt: Date) => {
  const timestamp = Math.floor(expiresAt.getTime() / 1000);
  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle('<a:sync_alert:1513822294831534220> Owner Left Voice Channel')
    .setDescription(
      [
        'The current room owner has left the voice channel.',
        '',
        `Ownership protection will expire **<t:${timestamp}:R>**.`,
        'After that time, anyone can claim the room using the button below.',
      ].join('\n'),
    )
    .addFields({
      name: 'Room',
      value: roomName,
      inline: true,
    })
    .setFooter({ text: 'Ownership protection timer active.', iconURL: 'https://cdn.discordapp.com/emojis/1518314359024124016.webp?size=40&animated=true' })
    .setTimestamp();
};

const buildOwnerReturnedEmbed = (roomName: string) =>
  new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle('Ownership protection restored')
    .setDescription('The room owner returned in time, so ownership protection has been cancelled.')
    .addFields({
      name: 'Room',
      value: roomName,
      inline: true,
    })
    .setTimestamp();

const buildOwnershipExpiredEmbed = (roomName: string) =>
  new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle('<a:syncink_voice_alert:1518903037257846874> Ownership transfer available')
    .setDescription('The 3-minute protection window expired. Ownership can now be transferred if needed.')
    .addFields({
      name: 'Room',
      value: roomName,
      inline: true,
    })
    .setTimestamp();

const buildOwnershipTransferredEmbed = (roomName: string) =>
  new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('Ownership transferred')
    .setDescription('Room ownership has been handed over successfully.')
    .addFields({
      name: 'Room',
      value: roomName,
      inline: true,
    })
    .setTimestamp();

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
    if (targetId === textChannel.client.user?.id) {
      continue;
    }

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

const sendOwnershipWarningMessage = async (
  voiceChannel: VoiceChannel,
  tempChannel: ITempChannel,
  member: GuildMember,
  settings?: IGuildSettings | null,
) => {
  const textChannel = await getPanelTargetChannel(voiceChannel, tempChannel);

  if (!textChannel) return null;

  const warningEmbed = buildOwnerLeftWarningEmbed(voiceChannel.name, tempChannel.ownerWarningExpiresAt!);
  
  const claimButton = new ButtonBuilder()
    .setCustomId('btn_claim_room')
    .setLabel('Claim Room')
    .setEmoji({ name: 'syncinkvoiceclaimtransfer', id: '1517253606686986323' })
    .setStyle(ButtonStyle.Success)
    .setDisabled(true);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(claimButton);

  const sent = await sendWebhookMessage(
    textChannel,
    { embeds: [warningEmbed], components: [row] },
    {
      serverAvatar: settings?.serverAvatar || null,
      serverNickname: settings?.serverNickname || null,
      defaultName: voiceChannel.guild.client.user?.username,
    },
  );

  if (sent instanceof Message) {
    tempChannel.ownerWarningMessageId = sent.id;
    await tempChannel.save();
  }

  return textChannel;
};

const scheduleOwnershipWarningExpiry = (
  guild: Guild,
  tempChannel: ITempChannel,
  dashboardUrl?: string,
) => {
  clearOwnershipWarningTimer(guild.id, tempChannel.channelId);

  if (!tempChannel.ownerWarningExpiresAt) {
    return;
  }

  const delay = tempChannel.ownerWarningExpiresAt.getTime() - Date.now();
  if (delay <= 0) {
    void expireOwnershipWarning(guild, tempChannel.channelId, dashboardUrl);
    return;
  }

  const key = getOwnershipWarningKey(guild.id, tempChannel.channelId);
  ownershipWarningTimers.set(
    key,
    setTimeout(() => {
      void expireOwnershipWarning(guild, tempChannel.channelId, dashboardUrl);
    }, delay),
  );
};

const expireOwnershipWarning = async (guild: Guild, channelId: string, dashboardUrl?: string) => {
  const tempChannel = await TempChannel.findOne({ guildId: guild.id, channelId }).catch(() => null);

  if (!tempChannel) {
    clearOwnershipWarningTimer(guild.id, channelId);
    return;
  }

  clearOwnershipWarningTimer(guild.id, channelId);

  const voiceChannel = guild.channels.cache.get(channelId);
  if (!voiceChannel || !voiceChannel.isVoiceBased()) {
    tempChannel.ownerWarningMessageId = null;
    tempChannel.ownerWarningExpiresAt = null;
    await tempChannel.save().catch(() => null);
    return;
  }

  if (voiceChannel.members.has(tempChannel.ownerId)) {
    tempChannel.ownerWarningMessageId = null;
    tempChannel.ownerWarningExpiresAt = null;
    await tempChannel.save().catch(() => null);
    return;
  }

  const textChannel = await getPanelTargetChannel(voiceChannel as VoiceChannel, tempChannel);
  const roomTextChannel = textChannel || await ensureRoomTextChannel(
    voiceChannel as VoiceChannel,
    tempChannel,
    'Temporary voice room chat',
  ).catch(() => null);

  const claimButton = new ButtonBuilder()
    .setCustomId('btn_claim_room')
    .setLabel('Claim Room')
    .setEmoji({ name: 'syncinkvoiceclaimtransfer', id: '1517253606686986323' })
    .setStyle(ButtonStyle.Success)
    .setDisabled(false);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(claimButton);

  if (roomTextChannel && tempChannel.ownerWarningMessageId) {
    const warningMessage = await roomTextChannel.messages.fetch(tempChannel.ownerWarningMessageId).catch(() => null);
    if (warningMessage) {
      await warningMessage.edit({
        embeds: [buildOwnershipExpiredEmbed(voiceChannel.name)],
        components: [row as any],
        allowedMentions: { parse: [] },
      }).catch(() => null);
    }
  } else if (roomTextChannel) {
    await sendWebhookMessage(
      roomTextChannel,
      { embeds: [buildOwnershipExpiredEmbed(voiceChannel.name)], components: [row as any] },
      {
        defaultName: guild.client.user?.username,
      },
    ).catch(() => null);
  }

  tempChannel.ownerWarningMessageId = null;
  tempChannel.ownerWarningExpiresAt = null;
  await tempChannel.save().catch(() => null);
};

export const ensureOwnershipWarning = async (
  voiceChannel: VoiceChannel,
  tempChannel: ITempChannel,
  member: GuildMember,
  settings?: IGuildSettings | null,
  dashboardUrl?: string,
) => {
  const existingExpiresAt = tempChannel.ownerWarningExpiresAt?.getTime() ?? 0;
  const now = Date.now();

  if (existingExpiresAt && existingExpiresAt > now) {
    const textChannel = await getPanelTargetChannel(voiceChannel, tempChannel);
    const roomTextChannel = textChannel || await ensureRoomTextChannel(
      voiceChannel,
      tempChannel,
      'Temporary voice room chat',
      getDisplayNameParts(member),
    ).catch(() => null);

    if (roomTextChannel && tempChannel.ownerWarningMessageId) {
      const existingWarning = await roomTextChannel.messages.fetch(tempChannel.ownerWarningMessageId).catch(() => null);
      if (existingWarning) {
        scheduleOwnershipWarningExpiry(voiceChannel.guild, tempChannel, dashboardUrl);
        return tempChannel;
      }
    }

    if (roomTextChannel) {
      await sendOwnershipWarningMessage(voiceChannel, tempChannel, member, settings).catch(() => null);
    }

    scheduleOwnershipWarningExpiry(voiceChannel.guild, tempChannel, dashboardUrl);
    return tempChannel;
  }

  tempChannel.ownerWarningExpiresAt = new Date(now + OWNER_WARNING_DURATION_MS);
  await tempChannel.save();

  await sendOwnershipWarningMessage(voiceChannel, tempChannel, member, settings).catch(async () => {
    // Keep the warning active even if Discord briefly fails so it can be restored later.
    await tempChannel.save().catch(() => null);
  });

  scheduleOwnershipWarningExpiry(voiceChannel.guild, tempChannel, dashboardUrl);
  return tempChannel;
};

export const clearOwnershipWarning = async (
  guild: Guild,
  tempChannel: ITempChannel,
  reason: 'returned' | 'transferred' = 'returned',
) => {
  clearOwnershipWarningTimer(guild.id, tempChannel.channelId);

  const voiceChannel = guild.channels.cache.get(tempChannel.channelId) as VoiceChannel | undefined;
  const textChannel = voiceChannel ? await getPanelTargetChannel(voiceChannel, tempChannel) : null;

  if (textChannel && tempChannel.ownerWarningMessageId) {
    const warningMessage = await textChannel.messages.fetch(tempChannel.ownerWarningMessageId).catch(() => null);
    if (warningMessage) {
      const embed = reason === 'returned'
        ? buildOwnerReturnedEmbed(voiceChannel?.name || 'Temporary Voice Channel')
        : buildOwnershipTransferredEmbed(voiceChannel?.name || 'Temporary Voice Channel');

      await warningMessage.edit({
        embeds: [embed],
        components: [],
        allowedMentions: { parse: [] },
      }).catch(() => null);
    }
  }

  tempChannel.ownerWarningMessageId = null;
  tempChannel.ownerWarningExpiresAt = null;
  await tempChannel.save().catch(() => null);
};

export const restoreOwnershipWarnings = async (guild: Guild, tempChannels: ITempChannel[], dashboardUrl?: string) => {
  for (const tempChannel of tempChannels) {
    if (!tempChannel.ownerWarningExpiresAt) {
      clearOwnershipWarningTimer(guild.id, tempChannel.channelId);
      continue;
    }

    const voiceChannel = guild.channels.cache.get(tempChannel.channelId);
    if (!voiceChannel || !voiceChannel.isVoiceBased()) {
      clearOwnershipWarningTimer(guild.id, tempChannel.channelId);
      continue;
    }

    const owner = await guild.members.fetch(tempChannel.ownerId).catch(() => null);
    if (owner && voiceChannel.members.has(owner.id)) {
      await clearOwnershipWarning(guild, tempChannel, 'returned');
      continue;
    }

    if (owner) {
      await ensureOwnershipWarning(voiceChannel as VoiceChannel, tempChannel, owner, null, dashboardUrl).catch(() => null);
    } else {
      scheduleOwnershipWarningExpiry(guild, tempChannel, dashboardUrl);
    }
  }
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
  if (panelLocks.has(tempChannel.channelId)) {
    return null;
  }
  panelLocks.add(tempChannel.channelId);

  try {
    let textChannel = await getPanelTargetChannel(voiceChannel, tempChannel);

    if (!textChannel) {
      return null;
    }

    if (textChannel.id !== voiceChannel.id) {
      await syncTextChannelAccess(textChannel as TextChannel, voiceChannel, tempChannel);
    }

  if (tempChannel.panelMessageId && tempChannel.panelChannelId && tempChannel.panelChannelId !== textChannel.id) {
    const previousChannel = voiceChannel.guild.channels.cache.get(tempChannel.panelChannelId);
    const previousMessage = previousChannel?.isTextBased()
      ? await previousChannel.messages.fetch(tempChannel.panelMessageId).catch(() => null)
      : null;

    if (previousMessage) {
      markPanelDeletionIgnored(previousMessage.id);
      await previousMessage.delete().catch(() => null);
    }
  }

  const marker = getPanelMarker(voiceChannel.id);
  const recent = await textChannel.messages.fetch({ limit: 50 }).catch(() => null);
  if (recent) {
    const duplicates = recent.filter((message) => {
      const footer = message.embeds[0]?.footer?.text || '';
      return footer.includes(marker);
    });

    let first = true;
    for (const message of duplicates.values()) {
      if (first && tempChannel.panelMessageId === message.id) {
        first = false;
        continue;
      }

      markPanelDeletionIgnored(message.id);
      await message.delete().catch(() => null);
      first = false;
    }
  }

  const panelEmbed = buildControlPanelEmbed(panelOwner, dashboardUrl, guildSettings, tempChannel, voiceChannel);
  const payload = {
    content: `<@${panelOwner.id}>`,
    embeds: [panelEmbed],
    components: [...getPanelDropdowns(), ...getPanelButtons()],
    allowedMentions: { users: [panelOwner.id] },
  };

  const existingPanel = tempChannel.panelMessageId
    ? await textChannel.messages.fetch(tempChannel.panelMessageId).catch(() => null)
    : null;

  if (existingPanel) {
    try {
      await existingPanel.edit(payload);
      tempChannel.panelChannelId = textChannel.id;
      await tempChannel.save();
      return existingPanel;
    } catch {
      const sent = await sendWebhookMessage(
        textChannel,
        payload,
        {
          serverAvatar: guildSettings?.serverAvatar || null,
          serverNickname: guildSettings?.serverNickname || null,
          defaultName: panelOwner.guild.client.user?.username,
        },
      );

      if (sent instanceof Message) {
        tempChannel.panelMessageId = sent.id;
        tempChannel.panelChannelId = textChannel.id;
        await tempChannel.save();
        return sent;
      }
    }
  }

  const sent = await sendWebhookMessage(
    textChannel,
    payload,
    {
      serverAvatar: guildSettings?.serverAvatar || null,
      serverNickname: guildSettings?.serverNickname || null,
      defaultName: panelOwner.guild.client.user?.username,
    },
  );

  if (sent instanceof Message) {
    const isNewRoom = !tempChannel.panelMessageId;
    tempChannel.panelMessageId = sent.id;
    tempChannel.panelChannelId = textChannel.id;
    await tempChannel.save();

    if (isNewRoom) {
      const pingMsg = await textChannel.send(`<@${panelOwner.id}>`).catch(() => null);
      if (pingMsg) {
        await pingMsg.delete().catch(() => null);
      }
    }

    return sent;
  }

  return null;
  } finally {
    panelLocks.delete(tempChannel.channelId);
  }
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
