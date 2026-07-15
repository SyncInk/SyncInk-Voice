import { Guild, PermissionFlagsBits, TextChannel } from 'discord.js';
import { SyncinkBot } from '../bot';
import { buildEmbed } from '../utils/embed';
import { ENV } from '../../config/config';

export const handleGuildCreate = async (client: SyncinkBot, guild: Guild) => {
  // Welcome message disabled as per user request
};
