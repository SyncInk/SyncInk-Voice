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

// Produces: 💬-ownername-chat  (e.g. 💬-syncink-chat)
export const toTextChannelName = (ownerName: string) => {
  const normalized = ownerName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
  return `💬-${normalized || 'room'}-chat`;
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
      name: `${member.displayName}'s Room`,
      iconURL: member.user.displayAvatarURL({ size: 64 }),
    })
    .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
    .setTitle('🎙️ Your Temporary Voice Channel')
    .setDescription(
      [
        'Welcome! Use the menus below to control your channel.',
        '',
        '**Room Settings** — Name, limit, status, game, bitrate, region, text, NSFW',
        '**Permissions** — Lock, permit, reject, ghost, transfer ownership',
      ].join('\n'),
    )
    .setFooter({
      text: dashboardUrl ? `Dashboard: ${dashboardUrl}` : 'Syncink Voice • Temporary Voice Channels',
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
  ownerName?: string,
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
