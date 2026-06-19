import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { Toast } from '../../types';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const icons = {
  success: <CheckCircle size={16} />,
  error: <AlertCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
};

export const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => (
  <div className="toast-container">
    <AnimatePresence>
      {toasts.map(t => (
        <motion.div
          key={t.id}
          className={`toast toast-${t.type}`}
          initial={{ opacity: 0, x: 60, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.9 }}
          transition={{ duration: 0.25 }}
        >
          {icons[t.type]}
          <span>{t.message}</span>
          <button className="toast-close" onClick={() => onRemove(t.id)}><X size={14}/></button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);
