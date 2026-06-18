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

    return textChannel;
  }

  const textChannel = await guild.channels.create({
    name: toTextChannelName(voiceChannel.name),
    type: ChannelType.GuildText,
    parent: voiceChannel.parentId,
    reason,
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

  tempChannel.textChannelId = textChannel.id;
  await tempChannel.save();

  return textChannel;
};
