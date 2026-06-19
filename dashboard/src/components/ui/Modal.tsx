import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export const Modal = ({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, danger }: ModalProps) => (
  <AnimatePresence>
    {open && (
      <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onCancel}>
        <motion.div className="modal" initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} onClick={e=>e.stopPropagation()}>
          <div className="modal-title">{title}</div>
          <div className="modal-desc">{description}</div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onCancel}>{cancelLabel}</button>
            <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
