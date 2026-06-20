import { useState, useEffect } from 'react';
import { Save, Shield, ShieldAlert, ShieldCheck, Plus, X } from 'lucide-react';
import { InfoBanner } from '../components/layout/InfoBanner';

interface Role {
  id: string;
  name: string;
  color: string;
}

interface AccessManagerProps {
  guildId: string | null;
  permissionLevel: 'Owner' | 'Administrator' | 'Moderator' | 'Member';
  addToast: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

export type AccessLevel = 'low' | 'medium' | 'high' | 'critical';

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
  
  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    
    Promise.all([
      fetch(`/api/guilds/${guildId}/roles`, { credentials: 'include' }).then(res => res.json()),
      fetch(`/api/guilds/${guildId}/access`, { credentials: 'include' }).then(res => res.json())
    ]).then(([rolesData, accessData]) => {
      setAllRoles(rolesData.roles || []);
      setAllowedRoles(accessData.allowedRoles || []);
      setLoading(false);
    }).catch(() => {
      addToast('error', 'Failed to load access roles.');
      setLoading(false);
    });
  }, [guildId, addToast]);

  const handleSave = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ allowedRoles }),
      });
      if (!res.ok) throw new Error('Failed to save access rules');
      addToast('success', 'Dashboard access rules saved successfully!');
    } catch {
      addToast('error', 'Failed to save access rules.');
    } finally {
      setSaving(false);
    }
  };

  const addRole = (roleId: string) => {
    setAllowedRoles(prev => [...prev, { roleId, level: 'low' }]);
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
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, flexDirection:'column', gap:16, color:'var(--text-muted)' }}>
          <ShieldAlert size={48} style={{ color: 'var(--error)' }} />
          <div style={{ fontSize:16, fontWeight:600, color: 'var(--text-primary)' }}>Access Denied</div>
          <div style={{ fontSize:14 }}>You must be the Server Owner or have Administrator permissions to manage Dashboard Access.</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="page-content" style={{ display: 'flex', justifyContent: 'center', marginTop: 100, color: 'var(--primary)' }}>Loading access manager...</div>;
  }

  const addableRoles = allRoles.filter(r => !allowedRoles.some(ar => ar.roleId === r.id));

  return (
    <div className="page-content">
      <InfoBanner message="Owners and Administrators always have full Critical access to the dashboard." />
      
      <div className="page-header" style={{ marginTop: 20 }}>
        <div>
          <div className="page-title">Dashboard Access Manager</div>
          <div className="page-subtitle">Select which Discord roles are allowed to access and edit dashboard settings.</div>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
        </button>
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
              <div key={r.id} onClick={() => addRole(r.id)} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: r.color === '#000000' ? '#99aab5' : r.color }} />
                <span>{r.name}</span>
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
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{role.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <select 
                      className="form-control" 
                      style={{ width: 140, padding: '6px 12px', fontSize: 13 }}
                      value={ar.level}
                      onChange={(e) => changeLevel(ar.roleId, e.target.value as AccessLevel)}
                    >
                      <option value="low">Low (View Only)</option>
                      <option value="medium">Medium (Manage VC)</option>
                      <option value="high">High (Manage Roles)</option>
                      <option value="critical">Critical (Full Access)</option>
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
