import { EmbedBuilder } from 'discord.js';
import { ENV } from '../../config/config';

export const buildEmbed = () => {
  return new EmbedBuilder()
    .setColor(ENV.BRAND_COLOR)
    .setFooter({
      text: 'Syncink Voice v1.0.0',
    })
    .setTimestamp();
};
