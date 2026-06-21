import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { ENV } from '../config/config';
import { handleVoiceStateUpdate } from './events/voiceStateUpdate';
import { handleInteractionCreate } from './events/interactionCreate';
import { handleGuildCreate } from './events/guildCreate';
import { handleReady } from './events/ready';
import { handleMessageDelete } from './events/messageDelete';

export class SyncinkBot extends Client {
  public commands: Collection<string, any>;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
      ],
      partials: [Partials.Message, Partials.Channel],
    });
    this.commands = new Collection();
  }

  public async start() {
    // Register events
    this.once('ready', () => handleReady(this));
    this.on('voiceStateUpdate', (oldState, newState) => handleVoiceStateUpdate(this, oldState, newState));
    this.on('interactionCreate', (interaction) => handleInteractionCreate(this, interaction));
    this.on('guildCreate', (guild) => handleGuildCreate(this, guild));
    this.on('messageDelete', (message) => handleMessageDelete(message));

    // Login
    await this.login(ENV.TOKEN);
  }
}
