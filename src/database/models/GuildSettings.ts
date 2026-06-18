import { Schema, model, Document } from 'mongoose';

export interface IGuildSettings extends Document {
  guildId: string;
  setupChannelId: string | null;
  setupCategoryId: string | null;
  voiceControlChannelId: string | null;
  defaultLimit: number;
  defaultName: string;
}

const GuildSettingsSchema = new Schema<IGuildSettings>({
  guildId: { type: String, required: true, unique: true },
  setupChannelId: { type: String, default: null },
  setupCategoryId: { type: String, default: null },
  voiceControlChannelId: { type: String, default: null },
  defaultLimit: { type: Number, default: 0 },
  defaultName: { type: String, default: '{name}' },
});

export const GuildSettings = model<IGuildSettings>('GuildSettings', GuildSettingsSchema);
