import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      className={`relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-fg/10 bg-surface/60 text-muted transition hover:border-accent/50 hover:text-fg ${className}`}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: 18, rotate: -90, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: -18, rotate: 90, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {dark ? <SunIcon className="h-5 w-5 text-accent" /> : <MoonIcon className="h-5 w-5 text-lilac" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
