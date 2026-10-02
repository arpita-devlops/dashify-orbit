import { XMarkIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`card relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-b-none bg-surface sm:rounded-2xl ${size}`}
            initial={{ y: 40, scale: 0.97, opacity: 0, rotateX: 8 }}
            animate={{ y: 0, scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ y: 30, scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            style={{ transformPerspective: 900 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-fg/10 px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold">{title}</h2>
                {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition hover:bg-fg/5 hover:text-fg" aria-label="Close">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex items-center justify-end gap-2 border-t border-fg/10 bg-elevated/60 px-6 py-3.5">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
