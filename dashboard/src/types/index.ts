// All shared TypeScript interfaces for the SyncInk Voice Dashboard

export interface User {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  guilds: Guild[];
}

export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  permissionLevel: 'Owner' | 'Administrator' | 'Moderator' | 'Staff' | 'Member';
  botPresent: boolean;
}

export interface GuildSettings {
  guildId: string;
  logChannelId: string | null;
  lfmChannelId: string | null;
  staffRoleId: string | null;
  memberRoleId: string | null;
  textChannelRoleId: string | null;
  joinRoleId: string | null;
  language: string;
  welcomeMessage: string;
  loggingEnabled: boolean;
  loggingEvents: LoggingEvents;
  automationSettings: AutomationSettings;
}

export interface LoggingEvents {
  channelCreated: boolean;
  channelDeleted: boolean;
  ownershipTransfer: boolean;
  userMovement: boolean;
  commandUsage: boolean;
  interfaceUsage: boolean;
  permissionChanges: boolean;
  channelRenamed: boolean;
  channelLocked: boolean;
  channelUnlocked: boolean;
}

export interface AutomationSettings {
  autoTextChannel: boolean;
  autoDeleteEmpty: boolean;
  syncVoicePermissions: boolean;
  sendWelcomeMessage: boolean;
}

export type ToggleState = 'disabled' | 'inherit' | 'enabled';

export interface ServerToggles {
  channelName: ToggleState;
  userLimit: ToggleState;
  channelStatus: ToggleState;
  channelLock: ToggleState;
  channelClaim: ToggleState;
  rejectUsers: ToggleState;
  permitUsers: ToggleState;
  ghostMode: ToggleState;
  lfmSystem: ToggleState;
  textChannel: ToggleState;
  bitrateControl: ToggleState;
  inviteControl: ToggleState;
  nsfwToggle: ToggleState;
  regionControl: ToggleState;
  channelTransfer: ToggleState;
  channelRequest: ToggleState;
}

export interface RoleProfile {
  id: string;
  roleId: string;
  roleName: string;
  roleColor: string;
  toggles: ServerToggles;
}

export interface Setup {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  generatorChannelId: string;
  generatorChannelName: string;
  isDefault: boolean;
  channelNameTemplate: string;
  userLimit: number;
  bitrate: number;
  region: string;
  defaultStatus: string;
}

export interface GlobalProfile {
  channelName: string;
  channelStatus: string;
  channelLimit: number;
  channelBitrate: number;
  channelRegion: string;
  channelNsfw: boolean;
  channelLock: boolean;
  channelGhost: boolean;
  textChannel: boolean;
}

export interface BotProfile {
  nickname: string;
  bio: string;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}
