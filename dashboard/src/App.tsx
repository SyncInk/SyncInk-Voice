import { useState, useEffect } from 'react';
import './index.css';

interface UserSettings {
  defaultName: string;
  defaultLimit: number | '';
  defaultBitrate: number | '';
  isPremium: boolean;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    defaultName: '',
    defaultLimit: '',
    defaultBitrate: '',
    isPremium: false,
  });

  useEffect(() => {
    // In a real app, we would check for a session token here.
    // For this demo, we will just simulate a loading state.
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  const handleLogin = async () => {
    // Simulate OAuth Login and fetch settings
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/users/me');
      const data = await res.json();
      setSettings({
        defaultName: data.settings.defaultName || '',
        defaultLimit: data.settings.defaultLimit || '',
        defaultBitrate: data.settings.defaultBitrate || '',
        isPremium: data.settings.isPremium || false,
      });
      setIsLoggedIn(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('http://localhost:3000/api/users/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      alert('Settings saved successfully! They will apply the next time you create a Voice Room.');
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2 className="animate-fade">Loading...</h2>
      </div>
    );
  }

  return (
    <div className="container">
      <nav className="nav animate-fade">
        <div className="nav-logo">Syncink Voice</div>
        {isLoggedIn ? (
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border-color)' }} onClick={() => setIsLoggedIn(false)}>
            Logout
          </button>
        ) : (
          <button className="btn" onClick={handleLogin}>Login with Discord</button>
        )}
      </nav>

      {!isLoggedIn ? (
        <main className="animate-fade" style={{ textAlign: 'center', marginTop: '10vh' }}>
          <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, #fff, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Elevate Your Discord Voice Experience
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
            The premium, automated temporary voice channel bot. Configure your personal room settings, manage servers, and experience true voice control.
          </p>
          <button className="btn" onClick={handleLogin} style={{ padding: '1rem 2.5rem', fontSize: '1.2rem' }}>
            Get Started
          </button>
        </main>
      ) : (
        <main className="animate-fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          
          <div className="glass-card">
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚙️ Default Room Settings
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>
              These settings will automatically apply whenever you create a temporary voice channel in any server using Syncink Voice.
            </p>
            
            <form onSubmit={handleSave}>
              <div className="input-group">
                <label>Default Room Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. {user}'s Lounge" 
                  value={settings.defaultName}
                  onChange={e => setSettings({...settings, defaultName: e.target.value})}
                />
              </div>

              <div className="input-group">
                <label>Default User Limit</label>
                <input 
                  type="number" 
                  placeholder="0 for unlimited" 
                  value={settings.defaultLimit}
                  onChange={e => setSettings({...settings, defaultLimit: e.target.value ? Number(e.target.value) : ''})}
                />
              </div>

              <div className="input-group" style={{ opacity: settings.isPremium ? 1 : 0.6 }}>
                <label>Bitrate (kbps) {settings.isPremium ? '👑 Premium' : '🔒 Requires Premium'}</label>
                <input 
                  type="number" 
                  disabled={!settings.isPremium}
                  placeholder={settings.isPremium ? "e.g. 96" : "Unlock premium to change bitrate"} 
                  value={settings.defaultBitrate}
                  onChange={e => setSettings({...settings, defaultBitrate: e.target.value ? Number(e.target.value) : ''})}
                />
              </div>

              <button type="submit" className="btn" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </form>
          </div>

          <div className="glass-card">
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📊 Your Statistics
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem' }}>0</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Rooms Created</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem' }}>0</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Hours in Voice</div>
              </div>
            </div>
            
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.05))', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <h3 style={{ marginBottom: '0.5rem', color: '#fff' }}>👑 Syncink+ Premium</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Unlock high-quality bitrate, custom profile themes, and bypass server limits.
              </p>
              <button className="btn" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>Upgrade Now</button>
            </div>
          </div>

        </main>
      )}
    </div>
  );
}

export default App;
