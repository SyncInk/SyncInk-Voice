import { Schema, model, Document } from 'mongoose';

export interface ITempChannel extends Document {
  guildId: string;
  channelId: string;
  textChannelId?: string;
  ownerId: string;
  permittedUsers: string[];
  deniedUsers: string[];
  isLocked: boolean;
  isHidden: boolean;
  isPrivate: boolean;
  userLimit: number;
  bitrate: number;
}

const TempChannelSchema = new Schema<ITempChannel>({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true, unique: true },
  textChannelId: { type: String, default: null },
  ownerId: { type: String, required: true },
  permittedUsers: { type: [String], default: [] },
  deniedUsers: { type: [String], default: [] },
  isLocked: { type: Boolean, default: false },
  isHidden: { type: Boolean, default: false },
  isPrivate: { type: Boolean, default: false },
  userLimit: { type: Number, default: 0 },
  bitrate: { type: Number, default: 64000 },
});

export const TempChannel = model<ITempChannel>('TempChannel', TempChannelSchema);
