import crypto from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { ChannelType, Guild, GuildBasedChannel, PermissionFlagsBits } from 'discord.js';
import { ENV } from '../config/config';
import { UserProfile } from '../database/models/UserProfile';
import { GuildSettings } from '../database/models/GuildSettings';
import { TempChannel } from '../database/models/TempChannel';
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

const getManageableGuilds = async (bot: SyncinkBot, accessToken: string) => {
  const guilds = await fetchDiscordGuilds(accessToken);

  return guilds
    .filter(userHasManageGuild)
    .map((guild) => {
      const botGuild = bot.guilds.cache.get(guild.id);
      return {
        id: guild.id,
        name: guild.name,
        iconUrl: guild.icon
          ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
          : null,
        botConnected: Boolean(botGuild),
      };
    })
    .filter((guild) => guild.botConnected)
    .sort((a, b) => a.name.localeCompare(b.name));
};

const getManageableGuildsSafely = async (bot: SyncinkBot, accessToken: string) => {
  try {
    return {
      guilds: await getManageableGuilds(bot, accessToken),
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
  const guilds = await getManageableGuilds(bot, session.accessToken);
  const permittedGuild = guilds.find((guild) => guild.id === guildId);
  if (!permittedGuild) {
    return null;
  }

  return bot.guilds.cache.get(guildId) ?? null;
};

const mapChannelsByType = (guild: Guild) => {
  const categories: { id: string; name: string }[] = [];
  const voice: { id: string; name: string }[] = [];
  const text: { id: string; name: string }[] = [];

  for (const channel of guild.channels.cache.values()) {
    if (channel.type === ChannelType.GuildCategory) {
      categories.push({ id: channel.id, name: channel.name });
      continue;
    }

    if (channel.type === ChannelType.GuildVoice) {
      voice.push({ id: channel.id, name: channel.name });
      continue;
    }

    if (channel.type === ChannelType.GuildText) {
      text.push({ id: channel.id, name: channel.name });
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
  app.use(express.json());

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

      const manageableGuildsResult = await getManageableGuildsSafely(bot, session.accessToken);
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

  app.get('/api/guilds', requireAuth, async (req: AuthenticatedRequest, res) => {
    const session = req.session!;

    try {
      const result = await getManageableGuildsSafely(bot, session.accessToken);
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

  app.use(express.static(path.join(__dirname, '../../dashboard/dist')));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../dashboard/dist/index.html'));
  });

  app.listen(Number(ENV.PORT), '0.0.0.0', () => {
    console.log(`[API] Dashboard API running on port ${ENV.PORT}`);
  });
};
