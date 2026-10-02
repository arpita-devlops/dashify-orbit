import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const TONES = {
  info: { icon: InformationCircleIcon, color: 'text-ion' },
  success: { icon: CheckCircleIcon, color: 'text-mint' },
  error: { icon: ExclamationTriangleIcon, color: 'text-coral' },
  ai: { icon: SparklesIcon, color: 'text-accent' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    ({ message, title, tone = 'info', action, duration = 4500 }) => {
      const id = ++counter.current;
      setToasts((list) => [...list.slice(-3), { id, message, title, tone, action }]);
      setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      show,
      dismiss,
      info: (message, opts) => show({ message, tone: 'info', ...opts }),
      success: (message, opts) => show({ message, tone: 'success', ...opts }),
      error: (message, opts) => show({ message, tone: 'error', duration: 6000, ...opts }),
      ai: (message, opts) => show({ message, tone: 'ai', duration: 7000, ...opts }),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const { icon: Icon, color } = TONES[toast.tone] ?? TONES.info;
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="card pointer-events-auto flex w-full max-w-sm items-start gap-3 p-3.5 pr-2.5"
                role="status"
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
                <div className="min-w-0 flex-1">
                  {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
                  <p className="text-sm text-muted">{toast.message}</p>
                </div>
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action.onClick();
                      dismiss(toast.id);
                    }}
                    className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-accent hover:bg-accent/10"
                  >
                    {toast.action.label}
                  </button>
                )}
                <button onClick={() => dismiss(toast.id)} className="shrink-0 rounded-lg p-1 text-muted hover:bg-fg/5 hover:text-fg" aria-label="Dismiss">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
