import { motion } from 'framer-motion';
import { useState } from 'react';
import { PRIORITY_META, PRIORITY_ORDER, minutesLabel } from '../../lib/format';

export function WeeklyChart({ data }) {
  const [metric, setMetric] = useState('completed');
  const max = Math.max(...data.map((d) => d[metric]), 1);
  const total = data.reduce((sum, d) => sum + d[metric], 0);
  const color = metric === 'completed' ? 'from-accent/25 to-accent' : 'from-lilac/25 to-lilac';
  const format = (v) => (metric === 'completed' ? v : minutesLabel(v));

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Weekly momentum</h2>
          <p className="text-sm text-muted">
            {metric === 'completed' ? `${total} tasks completed` : `${minutesLabel(total)} of focus`} in the last 7 days
          </p>
        </div>
        <div className="flex rounded-xl bg-fg/[0.05] p-1 text-xs font-semibold">
          {[['completed', 'Tasks'], ['focus', 'Focus']].map(([key, label]) => (
            <button key={key} onClick={() => setMetric(key)} className={`relative rounded-lg px-3 py-1.5 transition ${metric === key ? 'text-fg' : 'text-muted hover:text-fg'}`}>
              {metric === key && <motion.span layoutId="chart-tab" className="absolute inset-0 rounded-lg bg-surface shadow-soft" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 flex h-48 items-end gap-2 sm:gap-3">
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          return (
            <div key={d.label + i} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[11px] font-semibold text-muted opacity-0 transition group-hover:opacity-100">{format(d[metric])}</span>
              <motion.div
                key={metric}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max((d[metric] / max) * 100, d[metric] ? 6 : 2)}%` }}
                transition={{ delay: i * 0.05, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className={`w-full max-w-[3rem] rounded-t-lg bg-gradient-to-t ${color} ${isToday ? 'shadow-glow' : 'opacity-80'}`}
              />
              <span className={`text-[11px] ${isToday ? 'font-semibold text-fg' : 'text-muted'}`}>{isToday ? 'Today' : d.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const DONUT_COLORS = { urgent: 'rgb(var(--coral))', high: 'rgb(var(--accent))', medium: 'rgb(var(--ion))', low: 'rgb(var(--mint))' };

export function PriorityDonut({ counts }) {
  const total = PRIORITY_ORDER.reduce((sum, p) => sum + (counts[p] || 0), 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">Priority mix</h2>
      <p className="text-sm text-muted">Where your open work sits</p>
      <div className="mt-5 flex items-center gap-6">
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
            <circle cx="64" cy="64" r={r} fill="none" stroke="rgb(var(--fg) / 0.07)" strokeWidth="14" />
            {total > 0 &&
              PRIORITY_ORDER.map((p, i) => {
                const len = ((counts[p] || 0) / total) * c;
                const dash = Math.max(len - 3, 0);
                const el = (
                  <motion.circle
                    key={p}
                    cx="64"
                    cy="64"
                    r={r}
                    fill="none"
                    stroke={DONUT_COLORS[p]}
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDashoffset={-offset}
                    initial={{ strokeDasharray: `0 ${c}` }}
                    animate={{ strokeDasharray: `${dash} ${c}` }}
                    transition={{ delay: 0.2 + i * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                );
                offset += len;
                return el;
              })}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="font-display text-3xl font-bold">{total}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted">open</p>
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-2.5">
          {PRIORITY_ORDER.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${PRIORITY_META[p].dot}`} />
              <span className="flex-1 text-muted">{PRIORITY_META[p].label}</span>
              <span className="font-semibold">{counts[p] || 0}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
