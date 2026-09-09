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
    // Discord client error & connection resilience handlers
    this.on('error', (error) => {
      console.error('[Discord Error]', error);
    });

    this.on('warn', (warning) => {
      console.warn('[Discord Warning]', warning);
    });

    this.on('shardError', (error, shardId) => {
      console.error(`[Discord Shard ${shardId} Error]`, error);
    });

    this.on('shardDisconnect', (event, shardId) => {
      console.warn(`[Discord Shard ${shardId}] Disconnected (code: ${event.code}). Auto-reconnecting...`);
    });

    this.on('shardReconnecting', (shardId) => {
      console.log(`[Discord Shard ${shardId}] Reconnecting...`);
    });

    this.on('shardResume', (shardId, replayedEvents) => {
      console.log(`[Discord Shard ${shardId}] Resumed successfully (${replayedEvents} events replayed).`);
    });

    // Register lifecycle & feature events
    this.once('clientReady', () => handleReady(this));
    this.on('voiceStateUpdate', (oldState, newState) => handleVoiceStateUpdate(this, oldState, newState));
    this.on('interactionCreate', (interaction) => handleInteractionCreate(this, interaction));
    this.on('guildCreate', (guild) => handleGuildCreate(this, guild));
    this.on('messageDelete', (message) => handleMessageDelete(message));

    // Login
    await this.login(ENV.TOKEN);
  }
}
