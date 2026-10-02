import { motion } from 'framer-motion';

/** Orbit mark: a glowing focus core with a task planet circling it. */
export function LogoMark({ className = 'h-9 w-9', animated = true }) {
  return (
    <span className={`relative inline-grid shrink-0 place-items-center rounded-xl bg-[#0b0d18] ring-1 ring-white/10 ${className}`}>
      <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="logo-core" cx="50%" cy="42%" r="60%">
            <stop offset="0" stopColor="#fff4d6" />
            <stop offset="0.45" stopColor="#ffb547" />
            <stop offset="1" stopColor="#ff6b6b" />
          </radialGradient>
        </defs>
        <ellipse cx="20" cy="20" rx="14.5" ry="6" fill="none" stroke="#6c8cff" strokeOpacity="0.85" strokeWidth="1.6" transform="rotate(-24 20 20)" />
        <circle cx="20" cy="20" r="5.4" fill="url(#logo-core)" />
        <g className={animated ? 'origin-center animate-spin-slow' : ''} style={{ transformBox: 'view-box' }}>
          <circle cx="33" cy="14" r="2.3" fill="#34d399" />
        </g>
      </svg>
    </span>
  );
}

export function Logo({ compact = false }) {
  return (
    <motion.span className="inline-flex items-center gap-2.5" whileHover={{ scale: 1.02 }}>
      <LogoMark />
      {!compact && <span className="font-display text-lg font-bold tracking-tight">Dashify</span>}
    </motion.span>
  );
}
