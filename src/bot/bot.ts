import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { ENV } from '../config/config';
import { handleVoiceStateUpdate } from './events/voiceStateUpdate';
import { handleInteractionCreate } from './events/interactionCreate';
import { handleGuildCreate } from './events/guildCreate';
import { handleReady } from './events/ready';

export class SyncinkBot extends Client {
  public commands: Collection<string, any>;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
      ],
    });
    this.commands = new Collection();
  }

  public async start() {
    // Register events
    this.once('ready', () => handleReady(this));
    this.on('voiceStateUpdate', (oldState, newState) => handleVoiceStateUpdate(this, oldState, newState));
    this.on('interactionCreate', (interaction) => handleInteractionCreate(this, interaction));
    this.on('guildCreate', (guild) => handleGuildCreate(this, guild));

    // Login
    await this.login(ENV.TOKEN);
  }
}
