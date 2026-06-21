import crypto from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { ChannelType, Guild, GuildBasedChannel, PermissionFlagsBits } from 'discord.js';
import { ENV } from '../config/config';
import { UserProfile } from '../database/models/UserProfile';
import { GuildSettings } from '../database/models/GuildSettings';
import { TempChannel } from '../database/models/TempChannel';
import { GuildSetup } from '../database/models/GuildSetup';
import { DashboardAccess } from '../database/models/DashboardAccess';
import { SyncinkBot } from '../bot/bot';


const SESSION_COOKIE_NAME = 'syncink_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const MANAGE_GUILD_MASK = PermissionFlagsBits.ManageGuild;
const ADMIN_MASK = PermissionFlagsBits.Administrator;

type SessionRecord = {
  accessToken: string;
  createdAt: number;
  user: DiscordUser;
};

type OAuthStateRecord = {
  createdAt: number;
  dashboardUrl: string;
  redirectUri: string;
};

type DiscordUser = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  permissions?: string;
  permissions_new?: string;
  owner?: boolean;
};

type AuthenticatedRequest = Request & {
  session?: SessionRecord;
};

const sessions = new Map<string, SessionRecord>();
const oauthStates = new Map<string, OAuthStateRecord>();

const getRequestOrigin = (req: Request) => {
  const forwardedProtoHeader = req.headers['x-forwarded-proto'];
  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : forwardedProtoHeader?.split(',')[0];
  const protocol = forwardedProto?.trim() || req.protocol || 'http';
  const host = req.headers.host;

  if (!host) {
    return ENV.API_BASE_URL || ENV.DASHBOARD_URL || `http://localhost:${ENV.PORT}`;
  }

  return `${protocol}://${host}`;
};

const cleanExpiredRecords = () => {
  const now = Date.now();

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(sessionId);
    }
  }

  for (const [state, record] of oauthStates.entries()) {
    if (now - record.createdAt > OAUTH_STATE_TTL_MS) {
      oauthStates.delete(state);
    }
  }
};

const getCookieValue = (req: Request, name: string) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const [rawKey, ...rawValue] = pair.trim().split('=');
    if (rawKey === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return null;
};

const buildAvatarUrl = (user: DiscordUser) =>
  user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) % 5n)}.png`;

const isHttpsUrl = (url: string) => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeOptionalString = (value: unknown, maxLength = 100) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
};

const normalizeLimit = (value: unknown, fallback: number | null) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clamp(Math.round(parsed), 0, 99);
};

const normalizeBitrate = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return clamp(Math.round(parsed), 8, 384);
};

const userHasManageGuild = (guild: DiscordGuild) => {
  if (guild.owner) {
    return true;
  }

  const rawPermissions = guild.permissions_new || guild.permissions;
  if (!rawPermissions) {
    return false;
  }

  try {
    const bits = BigInt(rawPermissions);
    return (bits & MANAGE_GUILD_MASK) === MANAGE_GUILD_MASK || (bits & ADMIN_MASK) === ADMIN_MASK;
  } catch {
    return false;
  }
};

const getPermissionLevel = (guild: DiscordGuild): 'Owner' | 'Administrator' | 'Moderator' | 'Member' => {
  if (guild.owner) return 'Owner';
  const rawPermissions = guild.permissions_new || guild.permissions;
  if (!rawPermissions) return 'Member';
  try {
    const bits = BigInt(rawPermissions);
    if ((bits & ADMIN_MASK) === ADMIN_MASK) return 'Administrator';
    if ((bits & MANAGE_GUILD_MASK) === MANAGE_GUILD_MASK) return 'Moderator';
  } catch { /* ignore */ }
  return 'Member';
};

const createOAuthUrl = (state: string, redirectUri: string) => {
  const params = new URLSearchParams({
    client_id: ENV.CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    prompt: 'consent',
    state,
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}&scope=identify%20guilds`;
};

const exchangeDiscordCode = async (code: string, redirectUri: string) => {
  const body = new URLSearchParams({
    client_id: ENV.CLIENT_ID,
    client_secret: ENV.CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Discord token exchange failed: ${errorBody}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
};

const fetchDiscordUser = async (accessToken: string) => {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Unable to fetch Discord user: ${response.status} ${errorBody}`);
  }

  return (await response.json()) as DiscordUser;
};

const fetchDiscordGuilds = async (accessToken: string) => {
  const response = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Unable to fetch Discord guilds: ${response.status} ${errorBody}`);
  }

  return (await response.json()) as DiscordGuild[];
};

const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  cleanExpiredRecords();

  const sessionId = getCookieValue(req, SESSION_COOKIE_NAME);
  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Session expired' });
  }

  req.session = session;
  next();
};

const getManageableGuilds = async (bot: SyncinkBot, sessionUser: DiscordUser, accessToken: string) => {
  const guilds = await fetchDiscordGuilds(accessToken);
  const botGuildIds = guilds.filter(g => bot.guilds.cache.has(g.id)).map(g => g.id);
  const accessDocs = await DashboardAccess.find({ guildId: { $in: botGuildIds } });

  const manageable = [];
  for (const guild of guilds) {
    const botGuild = bot.guilds.cache.get(guild.id);
    if (!botGuild) continue;

    let hasAccess = false;
    let permLevel = getPermissionLevel(guild);

    if (userHasManageGuild(guild)) {
      hasAccess = true;
    } else {
      const accessDoc = accessDocs.find(d => d.guildId === guild.id);
      if (accessDoc && accessDoc.allowedRoles.length > 0) {
        try {
          const member = await botGuild.members.fetch(sessionUser.id).catch(() => null);
          if (member) {
            const hasRole = accessDoc.allowedRoles.some(ar => member.roles.cache.has(ar.roleId));
            if (hasRole) {
              hasAccess = true;
            }
          }
        } catch {}
      }
    }

    if (hasAccess) {
      manageable.push({
        id: guild.id,
        name: guild.name,
        iconUrl: guild.icon
          ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
          : null,
        botConnected: true,
        permissionLevel: permLevel,
      });
    }
  }

  return manageable.sort((a, b) => a.name.localeCompare(b.name));
};

const getManageableGuildsSafely = async (bot: SyncinkBot, sessionUser: DiscordUser, accessToken: string) => {
  try {
    return {
      guilds: await getManageableGuilds(bot, sessionUser, accessToken),
      unavailable: false,
      error: null as string | null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch Discord guilds';
    console.error('[API] Discord guild fetch failed:', message);

    return {
      guilds: [],
      unavailable: true,
      error: message,
    };
  }
};

const ensureGuildAccess = async (bot: SyncinkBot, session: SessionRecord, guildId: string) => {
  const guilds = await getManageableGuilds(bot, session.user, session.accessToken);
  const permittedGuild = guilds.find((guild) => guild.id === guildId);
  if (!permittedGuild) {
    return null;
  }

  const botGuild = bot.guilds.cache.get(guildId);
  if (!botGuild) return null;

  try {
    if (botGuild.channels.cache.size <= 2) {
      await botGuild.channels.fetch();
    }
    if (botGuild.roles.cache.size <= 2) {
      await botGuild.roles.fetch();
    }
  } catch (err) {
    console.error(`[API] Failed to fetch channels/roles for guild ${guildId}:`, err);
  }

  return botGuild;
};

const mapChannelsByType = (guild: Guild) => {
  const categories: { id: string; name: string }[] = [];
  const voice: { id: string; name: string; parentId: string | null }[] = [];
  const text: { id: string; name: string; parentId: string | null }[] = [];

  for (const channel of guild.channels.cache.values()) {
    if (channel.type === ChannelType.GuildCategory) {
      categories.push({ id: channel.id, name: channel.name });
      continue;
    }

    if (channel.type === ChannelType.GuildVoice) {
      voice.push({ id: channel.id, name: channel.name, parentId: channel.parentId });
      continue;
    }

    if (channel.type === ChannelType.GuildText) {
      text.push({ id: channel.id, name: channel.name, parentId: channel.parentId });
    }
  }

  const sortByName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  categories.sort(sortByName);
  voice.sort(sortByName);
  text.sort(sortByName);

  return { categories, voice, text };
};

const validateGuildChannel = async (
  guild: Guild,
  channelId: string | null | undefined,
  allowedTypes: ChannelType[],
) => {
  if (!channelId) {
    return null;
  }

  const channel = (await guild.channels.fetch(channelId).catch(() => null)) as GuildBasedChannel | null;
  if (!channel || !allowedTypes.includes(channel.type)) {
    throw new Error('One or more selected channels are invalid for this server.');
  }

  return channel.id;
};

const getActiveRooms = async (guild: Guild) => {
  const tempRooms = await TempChannel.find({ guildId: guild.id }).sort({ _id: -1 }).lean();

  return Promise.all(
    tempRooms.map(async (room) => {
      const channel = guild.channels.cache.get(room.channelId);
      const owner =
        guild.members.cache.get(room.ownerId) ??
        (await guild.members.fetch(room.ownerId).catch(() => null));

      return {
        channelId: room.channelId,
        name: channel?.name || 'Deleted room',
        ownerId: room.ownerId,
        ownerName: owner?.displayName || 'Unknown user',
        memberCount: channel?.isVoiceBased() ? channel.members.size : 0,
        userLimit: room.userLimit,
        bitrate: Math.round(room.bitrate / 1000),
      };
    }),
  );
};

export const startApi = (bot: SyncinkBot) => {
  const app = express();
  const allowedOrigins = new Set<string>(['http://localhost:5173', 'http://127.0.0.1:5173']);
  if (ENV.DASHBOARD_URL) {
    allowedOrigins.add(ENV.DASHBOARD_URL);
  }
  if (ENV.API_BASE_URL) {
    allowedOrigins.add(ENV.API_BASE_URL);
  }

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin) || (!ENV.DASHBOARD_URL && !ENV.API_BASE_URL)) {
          return callback(null, true);
        }

        return callback(new Error('Origin not allowed by CORS'));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

  app.get('/api/auth/discord/login', (req, res) => {
    if (!ENV.CLIENT_ID || !ENV.CLIENT_SECRET) {
      return res.status(500).json({ error: 'Discord OAuth is not configured.' });
    }

    cleanExpiredRecords();
    const state = crypto.randomBytes(24).toString('hex');
    const requestOrigin = getRequestOrigin(req);
    const dashboardUrl = ENV.DASHBOARD_URL || requestOrigin;
    const redirectUri = `${ENV.API_BASE_URL || requestOrigin}/api/auth/discord/callback`;

    oauthStates.set(state, {
      createdAt: Date.now(),
      dashboardUrl,
      redirectUri,
    });

    res.redirect(createOAuthUrl(state, redirectUri));
  });

  app.get('/api/auth/discord/callback', async (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code : null;
    const state = typeof req.query.state === 'string' ? req.query.state : null;

    const stateRecord = state ? oauthStates.get(state) : null;
    const fallbackDashboardUrl = ENV.DASHBOARD_URL || getRequestOrigin(req);

    if (!code || !state || !stateRecord) {
      return res.redirect(`${fallbackDashboardUrl}?login=failed`);
    }

    oauthStates.delete(state);

    try {
      const accessToken = await exchangeDiscordCode(code, stateRecord.redirectUri);
      const user = await fetchDiscordUser(accessToken);
      const sessionId = crypto.randomBytes(32).toString('hex');

      sessions.set(sessionId, {
        accessToken,
        createdAt: Date.now(),
        user,
      });

      res.cookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isHttpsUrl(stateRecord.dashboardUrl),
        maxAge: SESSION_TTL_MS,
        path: '/',
      });

      return res.redirect(`${stateRecord.dashboardUrl}?login=success`);
    } catch (error) {
      console.error('[API] Discord OAuth callback failed:', error);
      return res.redirect(`${fallbackDashboardUrl}?login=failed`);
    }
  });

  app.get('/api/auth/session', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    res.json({
      authenticated: true,
      user: {
        id: session.user.id,
        username: session.user.username,
        globalName: session.user.global_name,
        avatarUrl: buildAvatarUrl(session.user),
      },
    });
  });

  app.post('/api/auth/logout', requireAuth, async (req: AuthenticatedRequest, res) => {
    const sessionId = getCookieValue(req, SESSION_COOKIE_NAME);
    if (sessionId) {
      sessions.delete(sessionId);
    }

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttpsUrl(ENV.DASHBOARD_URL || ENV.API_BASE_URL),
      path: '/',
    });

    res.json({ success: true });
  });

  app.get('/api/users/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;

    try {
      let profile = await UserProfile.findOne({ userId: session.user.id });
      if (!profile) {
        profile = await UserProfile.create({ userId: session.user.id });
      }

      const manageableGuildsResult = await getManageableGuildsSafely(bot, session.user, session.accessToken);
      const activeRoomsOwned = await TempChannel.countDocuments({ ownerId: session.user.id });
      const activeRoomsGlobal = await TempChannel.countDocuments();

      res.json({
        user: {
          id: session.user.id,
          username: session.user.username,
          globalName: session.user.global_name,
          avatarUrl: buildAvatarUrl(session.user),
        },
        settings: {
          defaultName: profile.defaultName,
          defaultLimit: profile.defaultLimit,
          defaultBitrate: profile.defaultBitrate,
        },
        overview: {
          managedGuilds: manageableGuildsResult.guilds.length,
          activeRoomsOwned,
          activeRoomsGlobal,
        },
        guildsUnavailable: manageableGuildsResult.unavailable,
      });
    } catch (error) {
      console.error('[API] Failed to fetch user profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  app.post('/api/users/settings', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const defaultName = normalizeOptionalString(req.body.defaultName, 80);
    const defaultLimit = normalizeLimit(req.body.defaultLimit, null);
    const defaultBitrate = normalizeBitrate(req.body.defaultBitrate);

    try {
      const profile = await UserProfile.findOneAndUpdate(
        { userId: session.user.id },
        {
          userId: session.user.id,
          defaultName,
          defaultLimit,
          defaultBitrate,
          isPremium: false,
        },
        { new: true, upsert: true },
      );

      res.json({
        success: true,
        settings: {
          defaultName: profile.defaultName,
          defaultLimit: profile.defaultLimit,
          defaultBitrate: profile.defaultBitrate,
        },
      });
    } catch (error) {
      console.error('[API] Failed to save user settings:', error);
      res.status(500).json({ error: 'Failed to save user settings' });
    }
  });

  app.get('/api/users/@me', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const result = await getManageableGuildsSafely(bot, session.user, session.accessToken);
    res.json({
      guilds: result.guilds,
      unavailable: result.unavailable,
      message: result.unavailable ? 'Discord did not return your server list. Log out and sign in again.' : null,
    });
  });

  app.get('/api/guilds', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;

    try {
      const result = await getManageableGuildsSafely(bot, session.user, session.accessToken);
      res.json({
        guilds: result.guilds,
        unavailable: result.unavailable,
        message: result.unavailable ? 'Discord did not return your server list. Log out and sign in again.' : null,
      });
    } catch (error) {
      console.error('[API] Failed to fetch guild list:', error);
      res.status(500).json({ error: 'Failed to fetch your servers' });
    }
  });


  // ── GET /api/guilds/:guildId/bot-profile ──────────────────────────────────
  app.get('/api/guilds/:guildId/bot-profile', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });

      const botMember = guild.members.cache.get(bot.user!.id);
      const settings = await GuildSettings.findOne({ guildId });

      return res.json({
        nickname: botMember?.nickname ?? bot.user?.username ?? 'Syncink Voice',
        defaultName: bot.user?.username ?? 'Syncink Voice',
        avatarUrl: bot.user?.displayAvatarURL({ size: 128 }) ?? null,
        serverAvatarUrl: settings?.serverAvatar || botMember?.displayAvatarURL({ size: 128 }) || null,
        serverBannerUrl: settings?.serverBanner || null,
        bio: settings?.serverBio ?? '',
      });
    } catch (error) {
      console.error('[API] Failed to fetch bot profile:', error);
      return res.status(500).json({ error: 'Failed to fetch bot profile' });
    }
  });

  // ── PUT /api/guilds/:guildId/bot-profile ──────────────────────────────────
  app.put('/api/guilds/:guildId/bot-profile', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });

      const { nickname, bio } = req.body;

      // Set bot nickname for this specific server
      const botMember = guild.members.cache.get(bot.user!.id)
        ?? await guild.members.fetch(bot.user!.id).catch(() => null);

      if (botMember) {
        const nick = (nickname ?? '').slice(0, 32).trim() || null;
        await botMember.setNickname(nick, 'Updated via dashboard').catch((e) => {
          console.error('[API] Failed to set bot nickname:', e);
        });
      }

      // Store bio in GuildSettings (reuse model, extend at runtime)
      await GuildSettings.findOneAndUpdate(
        { guildId },
        { $set: { serverBio: (bio ?? '').slice(0, 400) } },
        { upsert: true, new: true },
      );

      return res.json({ success: true });
    } catch (error) {
      console.error('[API] Failed to update bot profile:', error);
      const message = error instanceof Error ? error.message : 'Failed to update bot profile';
      return res.status(500).json({ error: message });
    }
  });

  // ── PUT /api/guilds/:guildId/branding ──────────────────────────────────────
  app.put('/api/guilds/:guildId/branding', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });

      if (getPermissionLevel(guild) !== 'Owner' && getPermissionLevel(guild) !== 'Administrator') {
        return res.status(403).json({ error: 'You need Administrator or Owner permissions to change branding.' });
      }

      const { serverAvatar, serverBanner } = req.body;
      const updatePayload: Partial<Record<string, string>> = {};

      if (serverAvatar !== undefined) {
        if (serverAvatar && !serverAvatar.startsWith('data:image/')) {
          return res.status(400).json({ error: 'Invalid avatar format.' });
        }
        updatePayload.serverAvatar = serverAvatar;
      }

      if (serverBanner !== undefined) {
        if (serverBanner && !serverBanner.startsWith('data:image/')) {
          return res.status(400).json({ error: 'Invalid banner format.' });
        }
        updatePayload.serverBanner = serverBanner;
      }

      await GuildSettings.findOneAndUpdate(
        { guildId },
        { $set: updatePayload },
        { upsert: true, new: true },
      );

      return res.json({ success: true });
    } catch (error) {
      console.error('[API] Failed to update branding:', error);
      const message = error instanceof Error ? error.message : 'Failed to update branding';
      return res.status(500).json({ error: message });
    }
  });

  app.get('/api/guilds/:guildId/settings', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId } = req.params;

    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) {
        return res.status(403).json({ error: 'You do not have access to this server.' });
      }

      const settings = await GuildSettings.findOne({ guildId });
      const activeRooms = await getActiveRooms(guild);

      return res.json({
        guild: {
          id: guild.id,
          name: guild.name,
          iconUrl: guild.iconURL({ size: 128 }),
          memberCount: guild.memberCount,
        },
        settings: {
          setupChannelId: settings?.setupChannelId || '',
          setupCategoryId: settings?.setupCategoryId || '',
          voiceControlChannelId: settings?.voiceControlChannelId || '',
          defaultName: settings?.defaultName || "{user}'s Room",
          defaultLimit: settings?.defaultLimit ?? 0,
        },
        channels: mapChannelsByType(guild),
        activeRooms,
      });
    } catch (error) {
      console.error('[API] Failed to fetch guild settings:', error);
      return res.status(500).json({ error: 'Failed to fetch guild settings' });
    }
  });

  app.post('/api/guilds/:guildId/settings', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId } = req.params;

    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) {
        return res.status(403).json({ error: 'You do not have access to this server.' });
      }

      const setupCategoryId = await validateGuildChannel(
        guild,
        normalizeOptionalString(req.body.setupCategoryId, 50),
        [ChannelType.GuildCategory],
      );
      const setupChannelId = await validateGuildChannel(
        guild,
        normalizeOptionalString(req.body.setupChannelId, 50),
        [ChannelType.GuildVoice],
      );
      const voiceControlChannelId = await validateGuildChannel(
        guild,
        normalizeOptionalString(req.body.voiceControlChannelId, 50),
        [ChannelType.GuildText],
      );
      const defaultName = normalizeOptionalString(req.body.defaultName, 80) || "{user}'s Room";
      const defaultLimit = normalizeLimit(req.body.defaultLimit, 0) ?? 0;

      const settings = await GuildSettings.findOneAndUpdate(
        { guildId },
        {
          guildId,
          setupCategoryId,
          setupChannelId,
          voiceControlChannelId,
          defaultName,
          defaultLimit,
        },
        { new: true, upsert: true },
      );

      return res.json({
        success: true,
        settings: {
          setupChannelId: settings.setupChannelId || '',
          setupCategoryId: settings.setupCategoryId || '',
          voiceControlChannelId: settings.voiceControlChannelId || '',
          defaultName: settings.defaultName,
          defaultLimit: settings.defaultLimit,
        },
      });
    } catch (error) {
      console.error('[API] Failed to save guild settings:', error);
      const message = error instanceof Error ? error.message : 'Failed to save guild settings';
      return res.status(500).json({ error: message });
    }
  });

  // ── GET /api/guilds/:guildId/channels ─────────────────────────────────────
  app.get('/api/guilds/:guildId/channels', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });

      // Force explicit fetch from Discord API to guarantee no missing channels
      await guild.channels.fetch().catch(() => null);

      const { categories, voice, text } = mapChannelsByType(guild);
      return res.json({ categories, voice, text });
    } catch (error) {
      console.error('[API] Failed to fetch channels:', error);
      return res.status(500).json({ error: 'Failed to fetch channels' });
    }
  });

  // ── GET /api/guilds/:guildId/roles ────────────────────────────────────────
  app.get('/api/guilds/:guildId/roles', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });

      // Force explicit fetch from Discord API to guarantee no missing roles
      await guild.roles.fetch().catch(() => null);
      
      const roles = guild.roles.cache
        .filter(r => r.id !== guild.id)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position, isOrphaned: false }))
        .sort((a, b) => b.position - a.position);
        
      // include @everyone at the bottom
      const everyone = guild.roles.cache.get(guild.id);
      if (everyone) roles.push({ id: everyone.id, name: everyone.name, color: everyone.hexColor, position: -1, isOrphaned: false });

      // Fetch saved roles to detect orphans
      const settings = await GuildSettings.findOne({ guildId }).lean();
      if (settings?.roleToggles) {
        for (const roleId of Object.keys(settings.roleToggles)) {
          if (!guild.roles.cache.has(roleId)) {
            roles.push({ id: roleId, name: 'Orphaned Role (Missing)', color: '#808080', position: -2, isOrphaned: true });
          }
        }
      }

      return res.json({ roles });
    } catch (error) {
      console.error('[API] Failed to fetch roles:', error);
      return res.status(500).json({ error: 'Failed to fetch roles' });
    }
  });

  // ── GET /api/guilds/:guildId/role-toggles ──────────────────────────────────
  app.get('/api/guilds/:guildId/role-toggles', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });
      const settings = await GuildSettings.findOne({ guildId }).lean();
      const roleToggles = settings?.roleToggles || {};
      return res.json({ roleToggles });
    } catch (error) {
      console.error('[API] Failed to fetch role toggles:', error);
      return res.status(500).json({ error: 'Failed to fetch role toggles' });
    }
  });

  // ── PUT /api/guilds/:guildId/role-toggles ──────────────────────────────────
  app.put('/api/guilds/:guildId/role-toggles', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });

      if (getPermissionLevel(guild) !== 'Owner' && getPermissionLevel(guild) !== 'Administrator') {
        return res.status(403).json({ error: 'Administrator permissions required to edit role toggles.' });
      }

      const { roleToggles } = req.body;
      if (typeof roleToggles !== 'object' || roleToggles === null) {
        return res.status(400).json({ error: 'Invalid payload format for roleToggles' });
      }

      const updated = await GuildSettings.findOneAndUpdate(
        { guildId },
        { $set: { roleToggles } },
        { new: true, upsert: true },
      );
      if (!updated) throw new Error('Database save returned falsey');
      return res.json({ success: true });
    } catch (error) {
      console.error('[API] Failed to save role toggles:', error);
      return res.status(500).json({ error: 'Failed to save role toggles' });
    }
  });

  // ── GET /api/guilds/:guildId/access ───────────────────────────────────────
  app.get('/api/guilds/:guildId/access', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });
      const accessDoc = await DashboardAccess.findOne({ guildId });
      return res.json({ allowedRoles: accessDoc?.allowedRoles || [] });
    } catch (error) {
      console.error('[API] Failed to fetch access:', error);
      return res.status(500).json({ error: 'Failed to fetch access rules' });
    }
  });

  // ── PUT /api/guilds/:guildId/access ───────────────────────────────────────
  app.put('/api/guilds/:guildId/access', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });

      if (getPermissionLevel(guild) !== 'Owner' && getPermissionLevel(guild) !== 'Administrator') {
        return res.status(403).json({ error: 'Administrator permissions required to edit Dashboard Access.' });
      }

      const { allowedRoles } = req.body;
      if (!Array.isArray(allowedRoles)) {
        return res.status(400).json({ error: 'Invalid payload format for allowedRoles' });
      }

      const updated = await DashboardAccess.findOneAndUpdate(
        { guildId },
        { $set: { allowedRoles } },
        { new: true, upsert: true }
      );
      if (!updated) throw new Error('Database save returned falsey');
      return res.json({ success: true });
    } catch (error) {
      console.error('[API] Failed to save access:', error);
      return res.status(500).json({ error: 'Failed to save access rules' });
    }
  });

  // ── GET /api/guilds/:guildId/logging ──────────────────────────────────────
  app.get('/api/guilds/:guildId/logging', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });
      const settings = await GuildSettings.findOne({ guildId });
      return res.json({ 
        loggingChannelId: settings?.loggingChannelId || '',
        loggingEvents: settings?.loggingEvents || {}
      });
    } catch (error) {
      console.error('[API] Failed to fetch logging settings:', error);
      return res.status(500).json({ error: 'Failed to fetch logging settings' });
    }
  });

  // ── PUT /api/guilds/:guildId/logging ──────────────────────────────────────
  app.put('/api/guilds/:guildId/logging', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });

      const { loggingChannelId, loggingEvents } = req.body;
      
      const updated = await GuildSettings.findOneAndUpdate(
        { guildId },
        { $set: { loggingChannelId, loggingEvents } },
        { new: true, upsert: true }
      );
      if (!updated) throw new Error('Database save returned falsey');
      return res.json({ success: true });
    } catch (error) {
      console.error('[API] Failed to save logging settings:', error);
      return res.status(500).json({ error: 'Failed to save logging settings' });
    }
  });

  // ── GET /api/guilds/:guildId/setups ───────────────────────────────────────
  app.get('/api/guilds/:guildId/setups', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });

      const [setups, legacySettings] = await Promise.all([
        GuildSetup.find({ guildId }).sort({ createdAt: 1 }).lean(),
        GuildSettings.findOne({ guildId }).lean(),
      ]);

      let allSetups = setups.map(s => {
        const genCh = s.generatorChannelId ? guild.channels.cache.get(s.generatorChannelId) : null;
        const cat = s.categoryId ? guild.channels.cache.get(s.categoryId) : null;
        return {
          ...s,
          _channelName: genCh?.name ?? undefined,
          _categoryName: cat?.name ?? undefined,
        };
      });
      if (legacySettings?.setupChannelId) {
        const alreadyTracked = setups.some(s => s.generatorChannelId === legacySettings.setupChannelId);
        if (!alreadyTracked) {
          const legacyGenCh = guild.channels.cache.get(legacySettings.setupChannelId);
          const legacyCat  = legacySettings.setupCategoryId ? guild.channels.cache.get(legacySettings.setupCategoryId) : null;
          const synthetic = {
            _id: `legacy_${guildId}`,
            guildId,
            name: 'Join to Create (via /setup)',
            generatorChannelId: legacySettings.setupChannelId,
            categoryId: legacySettings.setupCategoryId ?? null,
            channelNameTemplate: legacySettings.defaultName || "{user}'s Room",
            defaultUserLimit: legacySettings.defaultLimit ?? 0,
            defaultBitrate: 64,
            defaultRegion: null,
            defaultStatus: '',
            autoTextChannel: false,
            welcomeMessage: '',
            isDefault: setups.every(s => !s.isDefault),
            features: { rename:true, userLimit:true, status:true, lock:true, claim:true, ghost:true, transfer:true, permit:true, reject:true, invite:true, bitrate:true, region:true, nsfw:false, textChannel:true, requestToJoin:false },
            createdAt: new Date(0).toISOString(),
            isLegacy: true,
            _channelName: legacyGenCh?.name ?? legacySettings.setupChannelId,
            _categoryName: legacyCat?.name ?? legacySettings.setupCategoryId ?? '',
          };
          allSetups = [synthetic as unknown as typeof allSetups[0], ...allSetups];
        }
      }

      return res.json({ setups: allSetups });

    } catch (error) {
      console.error('[API] Failed to fetch setups:', error);
      return res.status(500).json({ error: 'Failed to fetch setups' });
    }
  });

  // ── POST /api/guilds/:guildId/setups ──────────────────────────────────────
  app.post('/api/guilds/:guildId/setups', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });
      const { name, generatorChannelId, categoryId, channelNameTemplate,
        defaultUserLimit, defaultBitrate, defaultRegion, defaultStatus,
        autoTextChannel, welcomeMessage, isDefault, features } = req.body;
      if (generatorChannelId) {
        const ch = guild.channels.cache.get(generatorChannelId);
        if (!ch || ch.type !== ChannelType.GuildVoice)
          return res.status(400).json({ error: 'Generator channel must be a voice channel.' });
        const existing = await GuildSetup.findOne({ guildId, generatorChannelId });
        if (existing)
          return res.status(400).json({ error: 'That channel is already used by another setup.' });
      }
      if (categoryId) {
        const cat = guild.channels.cache.get(categoryId);
        if (!cat || cat.type !== ChannelType.GuildCategory)
          return res.status(400).json({ error: 'Invalid category selected.' });
      }
      const bitrate = Number(defaultBitrate ?? 64);
      if (bitrate < 8 || bitrate > 384)
        return res.status(400).json({ error: 'Bitrate must be between 8 and 384 kbps.' });
      const userLimit = Number(defaultUserLimit ?? 0);
      if (userLimit < 0 || userLimit > 99)
        return res.status(400).json({ error: 'User limit must be between 0 and 99.' });
      if (isDefault) {
        await GuildSetup.updateMany({ guildId }, { isDefault: false });
        if (generatorChannelId && categoryId) {
          await GuildSettings.findOneAndUpdate(
            { guildId },
            { guildId, setupChannelId: generatorChannelId, setupCategoryId: categoryId,
              defaultName: channelNameTemplate || "{user}'s Room", defaultLimit: userLimit },
            { upsert: true, new: true },
          );
        }
      }
      const setup = await GuildSetup.create({
        guildId, name: (name || 'Join to Create').slice(0, 50),
        generatorChannelId: generatorChannelId || null,
        categoryId: categoryId || null,
        channelNameTemplate: (channelNameTemplate || "{user}'s Room").slice(0, 80),
        defaultUserLimit: userLimit, defaultBitrate: bitrate,
        defaultRegion: defaultRegion || null,
        defaultStatus: (defaultStatus || '').slice(0, 200),
        autoTextChannel: Boolean(autoTextChannel),
        welcomeMessage: (welcomeMessage || '').slice(0, 500),
        isDefault: Boolean(isDefault),
        features: features || undefined,
      });
      return res.json({ success: true, setup });
    } catch (error) {
      console.error('[API] Failed to create setup:', error);
      const message = error instanceof Error ? error.message : 'Failed to create setup';
      return res.status(500).json({ error: message });
    }
  });

  // ── PUT /api/guilds/:guildId/setups/:setupId ──────────────────────────────
  app.put('/api/guilds/:guildId/setups/:setupId', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId, setupId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });
      const setup = await GuildSetup.findOne({ _id: setupId, guildId });
      if (!setup) return res.status(404).json({ error: 'Setup not found.' });
      const { name, generatorChannelId, categoryId, channelNameTemplate,
        defaultUserLimit, defaultBitrate, defaultRegion, defaultStatus,
        autoTextChannel, welcomeMessage, isDefault, features } = req.body;
      if (generatorChannelId && generatorChannelId !== setup.generatorChannelId) {
        const ch = guild.channels.cache.get(generatorChannelId);
        if (!ch || ch.type !== ChannelType.GuildVoice)
          return res.status(400).json({ error: 'Generator channel must be a voice channel.' });
        const conflict = await GuildSetup.findOne({ guildId, generatorChannelId, _id: { $ne: setupId } });
        if (conflict)
          return res.status(400).json({ error: 'That channel is already used by another setup.' });
      }
      const bitrate = Number(defaultBitrate ?? setup.defaultBitrate);
      if (bitrate < 8 || bitrate > 384)
        return res.status(400).json({ error: 'Bitrate must be between 8 and 384 kbps.' });
      const userLimit = Number(defaultUserLimit ?? setup.defaultUserLimit);
      if (userLimit < 0 || userLimit > 99)
        return res.status(400).json({ error: 'User limit must be between 0 and 99.' });
      if (isDefault) {
        await GuildSetup.updateMany({ guildId, _id: { $ne: setupId } }, { isDefault: false });
        const genId = generatorChannelId ?? setup.generatorChannelId;
        const catId = categoryId ?? setup.categoryId;
        if (genId && catId) {
          await GuildSettings.findOneAndUpdate(
            { guildId },
            { guildId, setupChannelId: genId, setupCategoryId: catId,
              defaultName: channelNameTemplate || setup.channelNameTemplate, defaultLimit: userLimit },
            { upsert: true, new: true },
          );
        }
      }
      if (name !== undefined) setup.name = name.slice(0, 50);
      if (generatorChannelId !== undefined) setup.generatorChannelId = generatorChannelId;
      if (categoryId !== undefined) setup.categoryId = categoryId;
      if (channelNameTemplate !== undefined) setup.channelNameTemplate = channelNameTemplate.slice(0, 80);
      setup.defaultUserLimit = userLimit;
      setup.defaultBitrate = bitrate;
      if (defaultRegion !== undefined) setup.defaultRegion = defaultRegion || null;
      if (defaultStatus !== undefined) setup.defaultStatus = defaultStatus.slice(0, 200);
      if (autoTextChannel !== undefined) setup.autoTextChannel = Boolean(autoTextChannel);
      if (welcomeMessage !== undefined) setup.welcomeMessage = welcomeMessage.slice(0, 500);
      if (isDefault !== undefined) setup.isDefault = Boolean(isDefault);
      if (features) {
        const cur = (setup.features as unknown as Record<string, boolean>);
        setup.features = { ...cur, ...features } as typeof setup.features;
      }
      await setup.save();
      return res.json({ success: true, setup });
    } catch (error) {
      console.error('[API] Failed to update setup:', error);
      return res.status(500).json({ error: 'Failed to update setup' });
    }
  });

  // ── DELETE /api/guilds/:guildId/setups/:setupId ───────────────────────────
  app.delete('/api/guilds/:guildId/setups/:setupId', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId, setupId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });
      await GuildSetup.deleteOne({ _id: setupId, guildId });
      return res.json({ success: true });
    } catch (error) {
      console.error('[API] Failed to delete setup:', error);
      return res.status(500).json({ error: 'Failed to delete setup' });
    }
  });

  // ── POST /api/guilds/:guildId/setups/:id/duplicate ───────────────────────
  app.post('/api/guilds/:guildId/setups/:setupId/duplicate', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const { guildId, setupId } = req.params;
    try {
      const guild = await ensureGuildAccess(bot, session, guildId);
      if (!guild) return res.status(403).json({ error: 'No access to this server.' });
      const source = await GuildSetup.findOne({ _id: setupId, guildId }).lean();
      if (!source) return res.status(404).json({ error: 'Setup not found.' });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, createdAt, updatedAt, ...rest } = source as typeof source & { createdAt: unknown; updatedAt: unknown };
      const copy = await GuildSetup.create({
        ...rest, name: `${source.name} (Copy)`.slice(0, 50),
        generatorChannelId: null, isDefault: false,
      });
      return res.json({ success: true, setup: copy });
    } catch (error) {
      console.error('[API] Failed to duplicate setup:', error);
      return res.status(500).json({ error: 'Failed to duplicate setup' });
    }
  });

  app.use(express.static(path.join(__dirname, '../../dashboard/dist')));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../dashboard/dist/index.html'));
  });

  app.listen(Number(ENV.PORT), '0.0.0.0', () => {
    console.log(`[API] Dashboard API running on port ${ENV.PORT}`);
  });
};
