import {
  ChannelType,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
  VoiceChannel,
} from 'discord.js';
import { ITempChannel } from '../../database/models/TempChannel';
import { ENV } from '../../config/config';

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
    .slice(0, 80);

  return `chat-${normalized || 'room'}`;
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

export const buildControlPanelEmbed = (member: GuildMember, dashboardUrl?: string) =>
  new EmbedBuilder()
    .setColor(ENV.BRAND_COLOR)
    .setAuthor({
      name: `${member.displayName} APP`,
      iconURL: member.user.displayAvatarURL({ size: 64 }),
    })
    .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
    .setTitle('Welcome to your own temporary voice channel')
    .setDescription(
      [
        'Control your channel using the menus below.',
        '• Use the dropdowns to manage settings and permissions',
        '• Alternatively use `/voice` commands',
        '• Use `/toggle set` to disable this interface',
        '',
        'Create a user profile on the dashboard, then use Load Settings below to apply your saved settings to this channel.',
      ].join('\n'),
    )
    .addFields(
      {
        name: 'Channel Settings',
        value: 'Change the channel name, limit, status, game, bitrate, region, text, and NSFW.',
      },
      {
        name: 'Channel Permissions',
        value: 'Lock, unlock, permit, reject, invite, ghost, unghost, and transfer ownership.',
      },
    )
    .setFooter({
      text: dashboardUrl ? `Dashboard: ${dashboardUrl}` : 'Use Load Settings to apply your saved preferences.',
    });

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

export const ensureRoomTextChannel = async (
  voiceChannel: VoiceChannel,
  tempChannel: ITempChannel,
  reason = 'Temporary voice room chat',
) => {
  const guild = voiceChannel.guild;
  const existing = tempChannel.textChannelId
    ? guild.channels.cache.get(tempChannel.textChannelId)
    : null;

  if (existing?.type === ChannelType.GuildText) {
    const textChannel = existing as TextChannel;
    for (const [, voiceMember] of voiceChannel.members) {
      await textChannel.permissionOverwrites
        .edit(voiceMember.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        })
        .catch(() => null);
    }

    if (tempChannel.isNsfw) {
      await textChannel.setNSFW(true).catch(() => null);
    }

    return textChannel;
  }

  const textChannel = await guild.channels.create({
    name: toTextChannelName(voiceChannel.name),
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
