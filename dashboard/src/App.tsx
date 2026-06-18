import { useEffect, useEffectEvent, useMemo, useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import './index.css';

type User = {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string;
};

type ProfileSettings = {
  defaultName: string;
  defaultLimit: number | '';
  defaultBitrate: number | '';
};

type Overview = {
  managedGuilds: number;
  activeRoomsOwned: number;
  activeRoomsGlobal: number;
};

type GuildSummary = {
  id: string;
  name: string;
  iconUrl: string | null;
  botConnected: boolean;
};

type GuildSettings = {
  setupChannelId: string;
  setupCategoryId: string;
  voiceControlChannelId: string;
  defaultName: string;
  defaultLimit: number;
};

type GuildChannels = {
  categories: Array<{ id: string; name: string }>;
  voice: Array<{ id: string; name: string }>;
  text: Array<{ id: string; name: string }>;
};

type ActiveRoom = {
  channelId: string;
  name: string;
  ownerId: string;
  ownerName: string;
  memberCount: number;
  userLimit: number;
  bitrate: number;
};

type GuildDetails = {
  guild: {
    id: string;
    name: string;
    iconUrl: string | null;
    memberCount: number;
  };
  settings: GuildSettings;
  channels: GuildChannels;
  activeRooms: ActiveRoom[];
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

const apiUrl = (path: string) => `${apiBaseUrl}${path}`;

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(apiUrl(path), {
    credentials: 'include',
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

const formatGuildInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

function App() {
  const [bootLoading, setBootLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuildPending, startGuildTransition] = useTransition();
  const [isGuildLoading, setIsGuildLoading] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [overview, setOverview] = useState<Overview>({
    managedGuilds: 0,
    activeRoomsOwned: 0,
    activeRoomsGlobal: 0,
  });
  const [guilds, setGuilds] = useState<GuildSummary[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [guildDetails, setGuildDetails] = useState<GuildDetails | null>(null);

  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({
    defaultName: '',
    defaultLimit: '',
    defaultBitrate: '',
  });
  const [guildSettings, setGuildSettings] = useState<GuildSettings>({
    setupChannelId: '',
    setupCategoryId: '',
    voiceControlChannelId: '',
    defaultName: "{user}'s Room",
    defaultLimit: 0,
  });

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingGuild, setSavingGuild] = useState(false);

  const selectedGuildSummary = useMemo(
    () => guilds.find((guild) => guild.id === selectedGuildId) || null,
    [guilds, selectedGuildId],
  );

  const loadGuildDetails = async (guildId: string) => {
    if (!guildId) {
      setGuildDetails(null);
      return;
    }

    setIsGuildLoading(true);
    setErrorMessage('');

    try {
      const data = await requestJson<GuildDetails>(`/api/guilds/${guildId}/settings`);
      setGuildDetails(data);
      setGuildSettings(data.settings);
    } catch (error) {
      setGuildDetails(null);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load this server.');
    } finally {
      setIsGuildLoading(false);
    }
  };

  const loadDashboard = useEffectEvent(async () => {
    setBootLoading(true);
    setErrorMessage('');

    try {
      const sessionResponse = await fetch(apiUrl('/api/auth/session'), {
        credentials: 'include',
      });

      if (sessionResponse.status === 401) {
        setIsAuthenticated(false);
        setUser(null);
        setGuilds([]);
        setGuildDetails(null);
        return;
      }

      if (!sessionResponse.ok) {
        throw new Error('Unable to restore your dashboard session.');
      }

      const sessionData = (await sessionResponse.json()) as { user: User };
      const [meData, guildData] = await Promise.all([
        requestJson<{ settings: ProfileSettings; overview: Overview }>('/api/users/me'),
        requestJson<{ guilds: GuildSummary[] }>('/api/guilds'),
      ]);

      setIsAuthenticated(true);
      setUser(sessionData.user);
      setProfileSettings({
        defaultName: meData.settings.defaultName || '',
        defaultLimit: meData.settings.defaultLimit ?? '',
        defaultBitrate: meData.settings.defaultBitrate ?? '',
      });
      setOverview(meData.overview);
      setGuilds(guildData.guilds);

      const nextGuildId = guildData.guilds[0]?.id || '';
      setSelectedGuildId(nextGuildId);
      if (nextGuildId) {
        await loadGuildDetails(nextGuildId);
      } else {
        setGuildDetails(null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load the dashboard.');
    } finally {
      setBootLoading(false);
    }
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loginState = params.get('login');
    if (!loginState) {
      return;
    }

    params.delete('login');
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    window.history.replaceState({}, '', nextUrl);

    const timeoutId = window.setTimeout(() => {
      if (loginState === 'success') {
        setStatusMessage('Discord login complete. Your dashboard is now synced.');
        void loadDashboard();
      } else if (loginState === 'failed') {
        setErrorMessage('Discord login failed. Please try again.');
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleDiscordLogin = () => {
    window.location.href = apiUrl('/api/auth/discord/login');
  };

  const handleLogout = async () => {
    try {
      await requestJson('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setUser(null);
      setGuilds([]);
      setGuildDetails(null);
      setStatusMessage('You have been logged out.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to log out.');
    }
  };

  const handleSelectGuild = (guildId: string) => {
    startGuildTransition(() => {
      setSelectedGuildId(guildId);
    });
    void loadGuildDetails(guildId);
  };

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const response = await requestJson<{ settings: ProfileSettings }>('/api/users/settings', {
        method: 'POST',
        body: JSON.stringify(profileSettings),
      });

      setProfileSettings({
        defaultName: response.settings.defaultName || '',
        defaultLimit: response.settings.defaultLimit ?? '',
        defaultBitrate: response.settings.defaultBitrate ?? '',
      });
      setStatusMessage('Your personal room defaults are now synced with the bot.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save your defaults.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleGuildSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedGuildId) {
      return;
    }

    setSavingGuild(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const response = await requestJson<{ settings: GuildSettings }>(`/api/guilds/${selectedGuildId}/settings`, {
        method: 'POST',
        body: JSON.stringify(guildSettings),
      });

      setGuildSettings(response.settings);
      setStatusMessage('Server settings saved. The bot will use these changes right away.');
      await loadGuildDetails(selectedGuildId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save server settings.');
    } finally {
      setSavingGuild(false);
    }
  };

  if (bootLoading) {
    return (
      <div className="app-shell app-shell--centered">
        <div className="glass-panel glass-panel--loading">
          <div className="spinner" />
          <p>Loading your SyncInk Voice dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="app-shell">
        <div className="aurora aurora--left" />
        <div className="aurora aurora--right" />

        <header className="topbar topbar--landing">
          <div className="brand">
            <div className="brand__mark">SV</div>
            <div>
              <div className="brand__name">SyncInk Voice</div>
              <div className="brand__tag">Temporary voice channels without paywalls</div>
            </div>
          </div>
          <button className="button button--ghost" onClick={handleDiscordLogin}>
            Login with Discord
          </button>
        </header>

        <main className="landing-grid">
          <section className="hero-card glass-panel">
            <span className="pill">Free forever</span>
            <h1>Manage your temp VC bot with a real Discord-synced dashboard.</h1>
            <p>
              Let members create rooms instantly, keep server defaults tidy, and sign in with Discord to manage only
              the servers you actually control.
            </p>

            <div className="hero-actions">
              <button className="button" onClick={handleDiscordLogin}>
                Connect Discord
              </button>
              <a className="button button--ghost" href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
                Discord Developer Portal
              </a>
            </div>

            <div className="feature-grid">
              <div className="feature-card">
                <strong>Live bot sync</strong>
                <span>Personal defaults and guild settings are applied directly to created voice rooms.</span>
              </div>
              <div className="feature-card">
                <strong>Discord login</strong>
                <span>Only server managers can open guild settings, with no fake demo accounts.</span>
              </div>
              <div className="feature-card">
                <strong>Glassy purple UI</strong>
                <span>A cleaner look that fits a Discord utility product without the premium clutter.</span>
              </div>
            </div>
          </section>

          <aside className="glass-panel side-note">
            <h2>Before you launch</h2>
            <ul className="check-list">
              <li>Set your Discord OAuth redirect URL to <code>/api/auth/discord/callback</code>.</li>
              <li>Invite the bot with <code>Manage Channels</code>, <code>Move Members</code>, and <code>View Channels</code>.</li>
              <li>Run <code>/setup</code> once in each server, then fine-tune everything from the dashboard.</li>
            </ul>
          </aside>
        </main>

        {errorMessage ? <div className="toast toast--error">{errorMessage}</div> : null}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="aurora aurora--left" />
      <div className="aurora aurora--right" />

      <header className="topbar">
        <div className="brand">
          <div className="brand__mark">SV</div>
          <div>
            <div className="brand__name">SyncInk Voice</div>
            <div className="brand__tag">Free dashboard for your temporary VC bot</div>
          </div>
        </div>

        <div className="topbar__actions">
          <div className="user-chip glass-chip">
            <img src={user.avatarUrl} alt={user.username} />
            <div>
              <strong>{user.globalName || user.username}</strong>
              <span>@{user.username}</span>
            </div>
          </div>
          <button className="button button--ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {statusMessage ? <div className="toast toast--success">{statusMessage}</div> : null}
      {errorMessage ? <div className="toast toast--error">{errorMessage}</div> : null}

      <main className="dashboard-grid">
        <aside className="dashboard-sidebar">
          <section className="glass-panel overview-panel">
            <span className="pill">Connected</span>
            <h1>{user.globalName || user.username}</h1>
            <p>Your dashboard is linked to Discord and ready to control your bot settings.</p>

            <div className="stat-grid">
              <div className="stat-card">
                <strong>{overview.managedGuilds}</strong>
                <span>Servers</span>
              </div>
              <div className="stat-card">
                <strong>{overview.activeRoomsOwned}</strong>
                <span>Your live rooms</span>
              </div>
              <div className="stat-card">
                <strong>{overview.activeRoomsGlobal}</strong>
                <span>Total active rooms</span>
              </div>
            </div>
          </section>

          <section className="glass-panel server-panel">
            <div className="section-heading">
              <div>
                <h2>Servers</h2>
                <p>Pick a guild where the bot is already installed.</p>
              </div>
            </div>

            <div className="server-list">
              {guilds.length === 0 ? (
                <div className="empty-state">
                  <strong>No supported servers yet</strong>
                  <span>Add the bot to a server where you have Manage Server permission.</span>
                </div>
              ) : null}

              {guilds.map((guild) => (
                <button
                  key={guild.id}
                  className={`server-button ${guild.id === selectedGuildId ? 'server-button--active' : ''}`}
                  onClick={() => handleSelectGuild(guild.id)}
                >
                  {guild.iconUrl ? (
                    <img src={guild.iconUrl} alt={guild.name} />
                  ) : (
                    <div className="server-fallback">{formatGuildInitials(guild.name)}</div>
                  )}
                  <div>
                    <strong>{guild.name}</strong>
                    <span>{guild.botConnected ? 'Bot connected' : 'Bot missing'}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="dashboard-main">
          <section className="glass-panel banner-panel">
            <span className="pill">No premium tab</span>
            <h2>Everything here is free and synced with your bot.</h2>
            <p>
              Personal defaults affect the rooms you create. Server defaults affect the guild-wide join-to-create
              behavior. Run <code>/setup</code> in Discord once if your server has not been configured yet.
            </p>
          </section>

          <div className="forms-grid">
            <section className="glass-panel form-panel">
              <div className="section-heading">
                <div>
                  <h2>Personal defaults</h2>
                  <p>These apply automatically when you create a temporary voice channel.</p>
                </div>
              </div>

              <form className="settings-form" onSubmit={handleProfileSave}>
                <label>
                  <span>Room name template</span>
                  <input
                    type="text"
                    placeholder="{user}'s Room"
                    value={profileSettings.defaultName}
                    onChange={(event) =>
                      setProfileSettings((current) => ({ ...current, defaultName: event.target.value }))
                    }
                  />
                </label>

                <label>
                  <span>User limit</span>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    placeholder="0"
                    value={profileSettings.defaultLimit}
                    onChange={(event) =>
                      setProfileSettings((current) => ({
                        ...current,
                        defaultLimit: event.target.value ? Number(event.target.value) : '',
                      }))
                    }
                  />
                </label>

                <label>
                  <span>Bitrate in kbps</span>
                  <input
                    type="number"
                    min="8"
                    max="384"
                    placeholder="64"
                    value={profileSettings.defaultBitrate}
                    onChange={(event) =>
                      setProfileSettings((current) => ({
                        ...current,
                        defaultBitrate: event.target.value ? Number(event.target.value) : '',
                      }))
                    }
                  />
                </label>

                <button className="button" type="submit" disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Save personal defaults'}
                </button>
              </form>
            </section>

            <section className="glass-panel form-panel">
              <div className="section-heading">
                <div>
                  <h2>Server settings</h2>
                  <p>
                    {selectedGuildSummary
                      ? `Manage the join-to-create configuration for ${selectedGuildSummary.name}.`
                      : 'Select a server to edit its settings.'}
                  </p>
                </div>
              </div>

              {!selectedGuildSummary ? (
                <div className="empty-state empty-state--large">
                  <strong>No server selected</strong>
                  <span>Pick a server from the sidebar to load its synced bot settings.</span>
                </div>
              ) : (
                <form className="settings-form" onSubmit={handleGuildSave}>
                  <label>
                    <span>Join to Create voice channel</span>
                    <select
                      value={guildSettings.setupChannelId}
                      onChange={(event) =>
                        setGuildSettings((current) => ({ ...current, setupChannelId: event.target.value }))
                      }
                    >
                      <option value="">Select a voice channel</option>
                      {guildDetails?.channels.voice.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Voice category</span>
                    <select
                      value={guildSettings.setupCategoryId}
                      onChange={(event) =>
                        setGuildSettings((current) => ({ ...current, setupCategoryId: event.target.value }))
                      }
                    >
                      <option value="">Select a category</option>
                      {guildDetails?.channels.categories.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Control text channel</span>
                    <select
                      value={guildSettings.voiceControlChannelId}
                      onChange={(event) =>
                        setGuildSettings((current) => ({ ...current, voiceControlChannelId: event.target.value }))
                      }
                    >
                      <option value="">Select a text channel</option>
                      {guildDetails?.channels.text.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Default room name</span>
                    <input
                      type="text"
                      placeholder="{user}'s Room"
                      value={guildSettings.defaultName}
                      onChange={(event) =>
                        setGuildSettings((current) => ({ ...current, defaultName: event.target.value }))
                      }
                    />
                  </label>

                  <label>
                    <span>Default room limit</span>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={guildSettings.defaultLimit}
                      onChange={(event) =>
                        setGuildSettings((current) => ({
                          ...current,
                          defaultLimit: Number(event.target.value || 0),
                        }))
                      }
                    />
                  </label>

                  <button className="button" type="submit" disabled={savingGuild || isGuildLoading}>
                    {savingGuild ? 'Saving...' : 'Save server settings'}
                  </button>
                </form>
              )}
            </section>
          </div>

          <section className="glass-panel rooms-panel">
            <div className="section-heading">
              <div>
                <h2>Active temporary rooms</h2>
                <p>
                  {guildDetails?.guild
                    ? `${guildDetails.guild.memberCount} members in ${guildDetails.guild.name}`
                    : 'Select a server to view active voice rooms.'}
                </p>
              </div>
            </div>

            {isGuildLoading || isGuildPending ? (
              <div className="empty-state empty-state--large">
                <strong>Loading server details...</strong>
                <span>Pulling the latest synced bot state for this guild.</span>
              </div>
            ) : guildDetails?.activeRooms.length ? (
              <div className="room-grid">
                {guildDetails.activeRooms.map((room) => (
                  <article key={room.channelId} className="room-card">
                    <div className="room-card__top">
                      <strong>{room.name}</strong>
                      <span>{room.memberCount} connected</span>
                    </div>
                    <p>Owner: {room.ownerName}</p>
                    <div className="room-card__meta">
                      <span>Limit {room.userLimit || 'Unlimited'}</span>
                      <span>{room.bitrate} kbps</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state--large">
                <strong>No active temp rooms</strong>
                <span>When members join the create channel, their rooms will appear here.</span>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
