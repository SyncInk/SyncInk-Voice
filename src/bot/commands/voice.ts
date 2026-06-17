import { SlashCommandBuilder, ChatInputCommandInteraction, VoiceChannel, ChannelType, PermissionFlagsBits } from 'discord.js';
import { TempChannel } from '../../database/models/TempChannel';

export const data = new SlashCommandBuilder()
  .setName('voice')
  .setDescription('VoiceMaster-like commands for managing your temporary voice channel')
  .addSubcommand(subcmd => 
    subcmd.setName('claim')
      .setDescription('Claim ownership of the voice channel if the owner has left')
  )
  .addSubcommand(subcmd => 
    subcmd.setName('private')
      .setDescription('Toggles your voice channel to private mode (kicks non-permitted users)')
  )
  .addSubcommand(subcmd => 
    subcmd.setName('permit')
      .setDescription('Permit a user/role to join your private room')
      .addUserOption(opt => opt.setName('user').setDescription('The user to permit'))
      .addRoleOption(opt => opt.setName('role').setDescription('The role to permit'))
  )
  .addSubcommand(subcmd => 
    subcmd.setName('reject')
      .setDescription('Reject a user/role from your voice room (Disconnects and blocks them)')
      .addUserOption(opt => opt.setName('user').setDescription('The user to reject'))
      .addRoleOption(opt => opt.setName('role').setDescription('The role to reject'))
  )
  .addSubcommand(subcmd => 
    subcmd.setName('text')
      .setDescription('Create a temporary text channel for your voice room')
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (!member || !member.voice.channelId) {
    return interaction.reply({ content: 'You are not in a voice channel.', ephemeral: true });
  }

  const tempChannel = await TempChannel.findOne({ channelId: member.voice.channelId });
  if (!tempChannel) {
    return interaction.reply({ content: 'You are not in a temporary voice channel.', ephemeral: true });
  }

  const subCommand = interaction.options.getSubcommand();
  const channel = interaction.guild?.channels.cache.get(tempChannel.channelId) as VoiceChannel;
  if (!channel) return;

  // Handle claim differently because it's for non-owners
  if (subCommand === 'claim') {
    if (tempChannel.ownerId === interaction.user.id) {
      return interaction.reply({ content: 'You are already the owner of this channel.', ephemeral: true });
    }
    const ownerInChannel = channel.members.has(tempChannel.ownerId);
    if (ownerInChannel) {
      return interaction.reply({ content: 'The current owner is still in the channel.', ephemeral: true });
    }
    tempChannel.ownerId = interaction.user.id;
    await tempChannel.save();
    return interaction.reply({ content: `👑 <@${interaction.user.id}> has successfully claimed ownership of this room!`, ephemeral: false });
  }

  // All other commands require ownership
  if (tempChannel.ownerId !== interaction.user.id) {
    return interaction.reply({ content: 'Only the channel owner can use this command.', ephemeral: true });
  }

  if (subCommand === 'private') {
    tempChannel.isPrivate = !tempChannel.isPrivate;
    if (tempChannel.isPrivate) {
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: false });
      for (const [memberId, chanMember] of channel.members) {
        if (memberId !== tempChannel.ownerId && !tempChannel.permittedUsers.includes(memberId)) {
          await chanMember.voice.disconnect('Channel turned private');
        }
      }
      await tempChannel.save();
      return interaction.reply({ content: '🔒 Room is now **Private**.', ephemeral: false });
    } else {
      await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { Connect: null });
      await tempChannel.save();
      return interaction.reply({ content: '🔓 Room is now **Public**.', ephemeral: false });
    }
  }

  if (subCommand === 'permit' || subCommand === 'reject') {
    const userTarget = interaction.options.getUser('user');
    const roleTarget = interaction.options.getRole('role');
    const targetId = userTarget?.id || roleTarget?.id;

    if (!targetId) {
      return interaction.reply({ content: 'You must provide a user or role.', ephemeral: true });
    }

    const isRole = !!roleTarget;

    if (subCommand === 'permit') {
      if (!isRole && !tempChannel.permittedUsers.includes(targetId)) {
        tempChannel.permittedUsers.push(targetId);
        await tempChannel.save();
      }
      await channel.permissionOverwrites.edit(targetId, { Connect: true, ViewChannel: true });
      return interaction.reply({ content: `✅ Permitted <@${isRole ? '&' : ''}${targetId}> to join the room.`, ephemeral: false });
    } else {
      if (!isRole) {
        tempChannel.permittedUsers = tempChannel.permittedUsers.filter(id => id !== targetId);
        if (!tempChannel.deniedUsers.includes(targetId)) tempChannel.deniedUsers.push(targetId);
        await tempChannel.save();
      }
      await channel.permissionOverwrites.edit(targetId, { Connect: false });
      
      if (!isRole) {
        const tMember = channel.members.get(targetId);
        if (tMember) await tMember.voice.disconnect('Rejected by owner');
      } else {
        for (const [memberId, chanMember] of channel.members) {
          if (chanMember.roles.cache.has(targetId) && memberId !== tempChannel.ownerId) {
            await chanMember.voice.disconnect('Role rejected by owner');
          }
        }
      }
      return interaction.reply({ content: `❌ Rejected <@${isRole ? '&' : ''}${targetId}> from the room.`, ephemeral: false });
    }
  }

  if (subCommand === 'text') {
    if (tempChannel.textChannelId) {
      const existing = interaction.guild?.channels.cache.get(tempChannel.textChannelId);
      if (existing) return interaction.reply({ content: `You already have a text channel: <#${tempChannel.textChannelId}>`, ephemeral: true });
    }
    try {
      const textChannel = await interaction.guild!.channels.create({
        name: '💬 room-chat',
        type: ChannelType.GuildText,
        parent: channel.parentId,
        permissionOverwrites: [
          { id: interaction.guild!.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          ...channel.members.map(m => ({ id: m.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }))
        ]
      });
      tempChannel.textChannelId = textChannel.id;
      await tempChannel.save();
      return interaction.reply({ content: `Temporary text channel created: <#${textChannel.id}>`, ephemeral: false });
    } catch (error) {
      console.error('[TempText] Error:', error);
      return interaction.reply({ content: 'Failed to create temporary text channel.', ephemeral: true });
    }
  }
};
