import { Schema, model, Document } from 'mongoose';

export interface IGuildSettings extends Document {
  guildId: string;
  setupChannelId: string | null;
  setupCategoryId: string | null;
  voiceControlChannelId: string | null;
  lfmChannelId: string | null;
  defaultLimit: number;
  defaultName: string;
  serverNickname?: string;
  serverBio?: string;
  serverAvatar?: string;
  serverBanner?: string;
  roleToggles?: any;
  loggingChannelId?: string;
  loggingEvents?: any;
}

const GuildSettingsSchema = new Schema<IGuildSettings>({
  guildId: { type: String, required: true, unique: true },
  setupChannelId: { type: String, default: null },
  setupCategoryId: { type: String, default: null },
  voiceControlChannelId: { type: String, default: null },
  lfmChannelId: { type: String, default: null },
  defaultLimit: { type: Number, default: 0 },
  defaultName: { type: String, default: '{name}' },
  serverNickname: { type: String, default: '' },
  serverBio: { type: String, default: '' },
  serverAvatar: { type: String, default: '' },
  serverBanner: { type: String, default: '' },
  roleToggles: { type: Schema.Types.Mixed, default: {} },
  loggingChannelId: { type: String, default: '' },
  loggingEvents: { type: Schema.Types.Mixed, default: {} },
});

export const GuildSettings = model<IGuildSettings>('GuildSettings', GuildSettingsSchema);
