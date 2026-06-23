import { useState, useEffect } from 'react';
import { Save, Shield, ShieldCheck, Plus, X, AlertTriangle, Loader2 } from 'lucide-react';
import { InfoBanner } from '../components/layout/InfoBanner';
import { fetchJsonWithRetry } from '../api';

interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions?: string;
}

interface AccessManagerProps {
  guildId: string | null;
  permissionLevel: 'Owner' | 'Administrator' | 'Moderator' | 'Staff' | 'Member';
  addToast: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

export type AccessLevel = 'low' | 'medium' | 'high' | 'critical';

const ACCESS_LEVEL_META: Record<AccessLevel, { label: string; description: string; tone: string }> = {
  critical: {
    label: 'Owner',
    description: 'Full control over the dashboard and every server setting.',
    tone: '#ef4444',
  },
  high: {
    label: 'Administrator',
    description: 'Manage server settings, toggles, and most dashboard sections.',
    tone: '#f59e0b',
  },
  medium: {
    label: 'Moderator',
    description: 'Manage voice room tools and approved moderation pages.',
    tone: '#8b5cf6',
  },
  low: {
    label: 'Staff',
    description: 'Access low-level dashboard settings such as Interface.',
    tone: '#3b82f6',
  },
};

const ADMIN_MASK = 1n << 3n;
const MANAGE_GUILD_MASK = 1n << 5n;

const safePermissions = (value?: string) => {
  if (!value) return 0n;
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
};

const getSuggestedLevel = (role: Role, allRoles: Role[]) => {
  const name = role.name.toLowerCase();
  const perms = safePermissions(role.permissions);
  if (name.includes('owner')) return 'critical' as const;
  if (name.includes('admin') || (perms & ADMIN_MASK) === ADMIN_MASK) return 'critical' as const;
  if (name.includes('mod') || name.includes('manager') || (perms & MANAGE_GUILD_MASK) === MANAGE_GUILD_MASK) return 'high' as const;

  const index = allRoles.findIndex(r => r.id === role.id);
  const ratio = index >= 0 ? index / Math.max(allRoles.length, 1) : 1;
  if (ratio < 0.25) return 'high' as const;
  if (ratio < 0.55) return 'medium' as const;
  return 'low' as const;
};

export interface IAccessRole {
  roleId: string;
  level: AccessLevel;
}

export default function AccessManager({ guildId, permissionLevel, addToast }: AccessManagerProps) {
  const [allowedRoles, setAllowedRoles] = useState<IAccessRole[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  
  const [fetchError, setFetchError] = useState(false);
  
  const loadData = () => {
    if (!guildId) return;
    setLoading(true);
    setFetchError(false);
    setAllowedRoles([]);
    setAllRoles([]);
    setShowAdd(false);
    
    Promise.all([
      fetchJsonWithRetry<{ roles?: Role[] }>(`/api/guilds/${guildId}/roles`, { credentials: 'include' }),
      fetchJsonWithRetry<{ allowedRoles?: IAccessRole[] }>(`/api/guilds/${guildId}/access`, { credentials: 'include' })
    ]).then(([rolesData, accessData]) => {
      if (!rolesData.ok) throw new Error((rolesData.data as any)?.error || 'Failed to load roles');
      if (!accessData.ok) throw new Error((accessData.data as any)?.error || 'Failed to load access rules');

      setAllRoles(rolesData.data?.roles || []);
      setAllowedRoles(accessData.data?.allowedRoles || []);
      setLoading(false);
    }).catch(() => {
      setFetchError(true);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  const handleSave = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      const res = await fetchJsonWithRetry<{ success?: boolean; error?: string }>(`/api/guilds/${guildId}/access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ allowedRoles }),
      });
      if (!res.ok) throw new Error((res.data as any)?.error || 'Failed to save access rules');
      addToast('success', 'Dashboard access rules saved successfully!');
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Failed to save access rules.');
    } finally {
      setSaving(false);
    }
  };

  const addRole = (role: Role) => {
    const suggested = getSuggestedLevel(role, allRoles);
    setAllowedRoles(prev => [...prev, { roleId: role.id, level: suggested }]);
    setShowAdd(false);
  };

  const removeRole = (roleId: string) => {
    setAllowedRoles(prev => prev.filter(r => r.roleId !== roleId));
  };

  const changeLevel = (roleId: string, level: AccessLevel) => {
    setAllowedRoles(prev => prev.map(r => r.roleId === roleId ? { ...r, level } : r));
  };

  if (!guildId) {
    return (
      <div className="page-content">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, flexDirection:'column', gap:16, color:'var(--text-muted)' }}>
          <Shield size={48} style={{ opacity:0.3 }} />
          <div style={{ fontSize:16, fontWeight:600 }}>Select a server from the sidebar</div>
        </div>
      </div>
    );
  }

  if (permissionLevel !== 'Owner' && permissionLevel !== 'Administrator') {
    return (
      <div className="page-content">
        <InfoBanner message="You need to be an Administrator or Owner to access this page." />
      </div>
    );
  }
  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12, color: 'var(--text-muted)' }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Loading access rules...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="page-content">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 16, background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', textAlign: 'center', marginTop: 40 }}>
          <div style={{ color: 'var(--error)' }}><AlertTriangle size={32} /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>Failed to load access rules</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Please try refreshing or check your connection.</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>Retry</button>
        </div>
      </div>
    );
  }

  const addableRoles = allRoles.filter(r => !allowedRoles.some(ar => ar.roleId === r.id));
  const levelCounts = {
    critical: allowedRoles.filter(r => r.level === 'critical').length,
    high: allowedRoles.filter(r => r.level === 'high').length,
    medium: allowedRoles.filter(r => r.level === 'medium').length,
    low: allowedRoles.filter(r => r.level === 'low').length,
  };

  return (
    <div className="page-content">
      <InfoBanner message="Owner, Administrator, and Moderator access is tiered automatically. Higher tiers always outrank lower tiers." />
      
      <div className="page-header" style={{ marginTop: 20 }}>
        <div>
          <div className="page-title">Dashboard Access Manager</div>
          <div className="page-subtitle">Select which Discord roles can open the dashboard and assign them the right access tier.</div>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
        {(['critical', 'high', 'medium'] as AccessLevel[]).map((level) => (
          <div key={level} className="card" style={{ padding: 16, borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Access Tier</div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: ACCESS_LEVEL_META[level].tone }}>{ACCESS_LEVEL_META[level].label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{ACCESS_LEVEL_META[level].description}</div>
              </div>
              <div style={{ minWidth: 44, height: 44, borderRadius: 12, background: `${ACCESS_LEVEL_META[level].tone}22`, border: `1px solid ${ACCESS_LEVEL_META[level].tone}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: ACCESS_LEVEL_META[level].tone }}>
                {levelCounts[level]}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={20} color="var(--primary)" />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Allowed Roles</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={14} /> Add Role
          </button>
        </div>

        {showAdd && addableRoles.length > 0 && (
          <div style={{ marginBottom: 20, padding: 12, background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-md)', maxHeight: 200, overflowY: 'auto' }}>
            {addableRoles.map(r => (
              <div key={r.id} onClick={() => addRole(r)} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: r.color === '#000000' ? '#99aab5' : r.color }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span>{r.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ACCESS_LEVEL_META[getSuggestedLevel(r, allRoles)].label} by default</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {allowedRoles.length === 0 ? (
          <div className="empty-state">
            <Shield size={32} />
            <div style={{ marginTop: 12, fontSize: 14 }}>No roles have dashboard access yet.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allowedRoles.map(ar => {
              const role = allRoles.find(r => r.id === ar.roleId);
              if (!role) return null;
              return (
                <div key={ar.roleId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: role.color === '#000000' ? '#99aab5' : role.color }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{role.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {ACCESS_LEVEL_META[ar.level].label} tier
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <select 
                      className="form-control" 
                      style={{ width: 190, padding: '6px 12px', fontSize: 13 }}
                      value={ar.level}
                      onChange={(e) => changeLevel(ar.roleId, e.target.value as AccessLevel)}
                    >
                      <option value="critical">Owner (Full Access)</option>
                      <option value="high">Administrator (Manage Server)</option>
                      <option value="medium">Moderator (Manage VC)</option>
                      <option value="low">View Only</option>
                    </select>
                    <button onClick={() => removeRole(ar.roleId)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: 4 }}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
