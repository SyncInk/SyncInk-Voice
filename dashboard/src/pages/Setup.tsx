import { useState } from 'react';
import { Hash, Pencil, Trash2, Plus, Gem } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InfoBanner } from '../components/layout/InfoBanner';
import { Modal } from '../components/ui/Modal';

interface Props { addToast: (type: 'success'|'error'|'warning'|'info', msg: string) => void; }

interface Setup {
  id: string;
  name: string;
  categoryName: string;
  generatorChannelName: string;
  isDefault: boolean;
  channelNameTemplate: string;
  userLimit: number;
  bitrate: number;
  region: string;
}

const initial: Setup[] = [
  { id:'1', name:'Join to Create', categoryName:'VOICE CHANNELS', generatorChannelName:'➕ Join to Create', isDefault:true, channelNameTemplate:"{user}'s Room", userLimit:0, bitrate:64, region:'auto' },
];

export default function Setup({ addToast }: Props) {
  const [setups, setSetups] = useState<Setup[]>(initial);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    setSetups(s => s.filter(x => x.id !== deleteId));
    setDeleteId(null);
    addToast('success', 'Setup deleted successfully');
  };

  return (
    <div className="page-content">
      <InfoBanner message="If you encounter any issues, please report them on our" />
      <div className="page-header" style={{ marginTop: 20 }}>
        <div>
          <div className="page-title">Voice Channel Setups</div>
          <div className="page-subtitle">Manage your Join-to-Create systems</div>
        </div>
        <button className="btn btn-primary" onClick={() => addToast('info', 'Create Setup coming soon!')}>
          <Plus size={15} /> Create Setup
        </button>
      </div>

      {/* Premium card */}
      <div className="premium-card">
        <div className="premium-card-icon"><Gem size={28} color="#a78bfa" /></div>
        <div className="premium-card-text">
          <div className="premium-card-title">Unlock Unlimited Setups</div>
          <div className="premium-card-desc">Free servers are limited to 1 setup. Upgrade to create unlimited Join-to-Create systems.</div>
        </div>
        <button className="btn btn-primary">Upgrade Now</button>
      </div>

      <AnimatePresence>
        {setups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎙️</div>
            <div className="empty-state-title">No setups yet</div>
            <div className="empty-state-desc">Create your first Join-to-Create setup to get started</div>
            <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => addToast('info', 'Create Setup coming soon!')}>
              <Plus size={14} /> Create Setup
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {setups.map(setup => (
              <motion.div key={setup.id} className="setup-card"
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, x:-20 }} layout
              >
                <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                  <Hash size={18} color="var(--text-muted)" />
                </div>
                <div className="setup-card-info">
                  <div className="setup-card-name">{setup.name}</div>
                  <div className="setup-card-meta">
                    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'var(--text-muted)' }}>
                      📁 {setup.categoryName}
                    </span>
                    {setup.isDefault && (
                      <span className="badge-default">⚙ Default</span>
                    )}
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                      Template: <code style={{ background:'var(--bg-elevated)', padding:'1px 5px', borderRadius:3, fontSize:11 }}>{setup.channelNameTemplate}</code>
                    </span>
                  </div>
                </div>
                <div className="setup-card-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => addToast('info', 'Edit Setup coming soon!')}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(setup.id)}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <Modal
        open={!!deleteId}
        title="Delete Setup"
        description="Are you sure you want to delete this setup? This will remove the Join-to-Create channel and all associated settings. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        danger
      />
    </div>
  );
}
