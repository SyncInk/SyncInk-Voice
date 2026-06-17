import mongoose, { Schema, Document } from 'mongoose';

export interface IUserProfile extends Document {
  userId: string;
  defaultName: string | null;
  defaultLimit: number | null;
  defaultBitrate: number | null;
  isPremium: boolean;
}

const UserProfileSchema = new Schema<IUserProfile>({
  userId: { type: String, required: true, unique: true },
  defaultName: { type: String, default: null },
  defaultLimit: { type: Number, default: null },
  defaultBitrate: { type: Number, default: null },
  isPremium: { type: Boolean, default: false },
});

export const UserProfile = mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);
