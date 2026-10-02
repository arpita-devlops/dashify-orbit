import { animate, motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import { DUE_TONE, PRIORITY_META, dueLabel } from '../../lib/format';

/** Number that counts up when it scrolls into view. */
export function CountUp({ value, suffix = '', decimals = 0, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, { duration: 1.2, ease: [0.22, 1, 0.36, 1], onUpdate: setDisplay });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Card that tilts toward the cursor in 3D. */
export function TiltCard({ children, className = '', max = 10, ...props }) {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(y, [0, 1], [max, -max]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-max, max]), { stiffness: 200, damping: 20 });

  const onMove = (e) => {
    if (e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  };
  const reset = () => {
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <motion.div
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ rotateX, rotateY, transformPerspective: 1000, transformStyle: 'preserve-3d' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function ProgressRing({ value, size = 160, stroke = 12, children, colors = ['rgb(var(--accent))', 'rgb(var(--coral))'] }) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={colors[0]} />
            <stop offset="1" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--fg) / 0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#ring-${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.min(Math.max(value, 0), 1)) }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${colors[0]})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function PriorityBadge({ priority, compact = false }) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META.medium;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.soft}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {!compact && meta.label}
    </span>
  );
}

export function DueChip({ dueAt }) {
  const due = dueLabel(dueAt);
  if (!due) return null;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${DUE_TONE[due.tone]}`}>{due.text}</span>;
}

export function EngineBadge({ source }) {
  const openai = source === 'openai';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${openai ? 'border-mint/30 bg-mint/10 text-mint' : 'border-lilac/30 bg-lilac/10 text-lilac'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${openai ? 'bg-mint' : 'bg-lilac'}`} />
      {openai ? 'OpenAI' : 'Smart planner'}
    </span>
  );
}

export function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg">
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-20 w-20">
          <div className="absolute inset-[30%] rounded-full bg-gradient-to-br from-accent to-coral shadow-glow" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-ion" style={{ animationDuration: '1.4s' }} />
          <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-b-mint" style={{ animationDuration: '2.2s', animationDirection: 'reverse' }} />
        </div>
        <p className="shimmer-text font-mono text-xs uppercase tracking-[0.3em]">Aligning your orbit</p>
      </div>
    </div>
  );
}
