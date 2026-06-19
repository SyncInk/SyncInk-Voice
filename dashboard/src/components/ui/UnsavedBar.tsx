import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Save } from 'lucide-react';

interface UnsavedBarProps {
  visible: boolean;
  onSave: () => void;
  onReset: () => void;
  saving?: boolean;
}

export const UnsavedBar = ({ visible, onSave, onReset, saving }: UnsavedBarProps) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        className="unsaved-bar"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
      >
        <span>⚠ You have unsaved changes</span>
        <div className="unsaved-actions">
          <button className="btn btn-secondary btn-sm" onClick={onReset}>
            <RotateCcw size={13} /> Reset
          </button>
          <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
            <Save size={13} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);
