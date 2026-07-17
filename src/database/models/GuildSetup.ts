import { Schema, model, Document } from 'mongoose';

export interface ISetupFeatures {
  rename: boolean;
  userLimit: boolean;
  status: boolean;
  lock: boolean;
  claim: boolean;
  ghost: boolean;
  transfer: boolean;
  permit: boolean;
  reject: boolean;
  invite: boolean;
  bitrate: boolean;
  region: boolean;
  nsfw: boolean;
  textChannel: boolean;
  requestToJoin: boolean;
}

export interface IGuildSetup extends Document {
  guildId: string;
  name: string;
  generatorChannelId: string | null;
  categoryId: string | null;
  channelNameTemplate: string;
  defaultUserLimit: number;
  defaultBitrate: number;
  defaultRegion: string | null;
  defaultStatus: string;
  autoTextChannel: boolean;
  welcomeMessage: string;
  isDefault: boolean;
  features: ISetupFeatures;
  createdAt: Date;
}

export const featuresDefault: ISetupFeatures = {
  rename: true,
  userLimit: true,
  status: true,
  lock: true,
  claim: true,
  ghost: true,
  transfer: true,
  permit: true,
  reject: true,
  invite: true,
  bitrate: true,
  region: true,
  nsfw: false,
  textChannel: true,
  requestToJoin: false,
};

const GuildSetupSchema = new Schema<IGuildSetup>(
  {
    guildId: { type: String, required: true, index: true },
    name: { type: String, default: 'Join to Create' },
    generatorChannelId: { type: String, default: null },
    categoryId: { type: String, default: null },
    channelNameTemplate: { type: String, default: "{user}'s Room" },
    defaultUserLimit: { type: Number, default: 0 },
    defaultBitrate: { type: Number, default: 64 },
    defaultRegion: { type: String, default: null },
    defaultStatus: { type: String, default: '' },
    autoTextChannel: { type: Boolean, default: false },
    welcomeMessage: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
    features: {
      type: {
        rename: { type: Boolean, default: true },
        userLimit: { type: Boolean, default: true },
        status: { type: Boolean, default: true },
        lock: { type: Boolean, default: true },
        claim: { type: Boolean, default: true },
        ghost: { type: Boolean, default: true },
        transfer: { type: Boolean, default: true },
        permit: { type: Boolean, default: true },
        reject: { type: Boolean, default: true },
        invite: { type: Boolean, default: true },
        bitrate: { type: Boolean, default: true },
        region: { type: Boolean, default: true },
        nsfw: { type: Boolean, default: false },
        textChannel: { type: Boolean, default: true },
        requestToJoin: { type: Boolean, default: false },
      },
      default: featuresDefault,
    },
  },
  { timestamps: true },
);

export const GuildSetup = model<IGuildSetup>('GuildSetup', GuildSetupSchema);
