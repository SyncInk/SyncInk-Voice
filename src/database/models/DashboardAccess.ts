import { Schema, model, Document } from 'mongoose';

export type AccessLevel = 'low' | 'medium' | 'high' | 'critical';

export interface IAccessRole {
  roleId: string;
  level: AccessLevel;
}

export interface IDashboardAccess extends Document {
  guildId: string;
  allowedRoles: IAccessRole[];
}

const AccessRoleSchema = new Schema<IAccessRole>({
  roleId: { type: String, required: true },
  level: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
}, { _id: false });

const DashboardAccessSchema = new Schema<IDashboardAccess>({
  guildId: { type: String, required: true, unique: true },
  allowedRoles: { type: [AccessRoleSchema], default: [] },
});

export const DashboardAccess = model<IDashboardAccess>('DashboardAccess', DashboardAccessSchema);
