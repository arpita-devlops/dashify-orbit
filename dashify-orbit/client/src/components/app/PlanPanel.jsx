import { ArrowPathIcon, BoltIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PRIORITY_META } from '../../lib/format';
import Button from '../ui/Button';
import { EngineBadge } from '../ui/Primitives';

const THINKING = ['Reading your open tasks…', 'Weighing deadlines and momentum…', 'Balancing deep work and breaks…', 'Drafting your day…'];

function defaultStart() {
  const now = new Date();
  if (now.getHours() < 9) return '09:00';
  const mins = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 30) * 30;
  if (mins >= 22 * 60) return '09:00';
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function Thinking() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % THINKING.length), 900);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping2 rounded-full bg-accent" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
        </span>
        <AnimatePresence mode="wait">
          <motion.p key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="shimmer-text text-sm font-medium">
            {THINKING[step]}
          </motion.p>
        </AnimatePresence>
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-fg/[0.05]" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

export default function PlanPanel() {
  const { plan, generatePlan, tasks } = useWorkspace();
  const toast = useToast();
  const navigate = useNavigate();
  const [focus, setFocus] = useState(plan?.input?.focus ?? '');
  const [start, setStart] = useState(plan?.input?.start ?? defaultStart());
  const [end, setEnd] = useState(plan?.input?.end ?? '18:00');
  const [loading, setLoading] = useState(false);
  const openCount = tasks.filter((t) => t.status !== 'done').length;

  const run = async (e) => {
    e?.preventDefault();
    if (start >= end) return toast.error('End time must be after start time');
    setLoading(true);
    try {
      await generatePlan({ focus, start, end });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-lilac to-coral text-white">
              <SparklesIcon className="h-4 w-4" />
            </span>
            AI daily planner
          </h2>
          <p className="mt-1 text-sm text-muted">Turns {openCount} open tasks into a time-blocked plan.</p>
        </div>
        {plan && !loading && <EngineBadge source={plan.source} />}
      </div>

      <form onSubmit={run} className="relative mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <input className="input" value={focus} onChange={(e) => setFocus(e.target.value)} maxLength={300} placeholder="Today's focus (optional) — e.g. backend, learning" aria-label="Today's focus" />
        <input type="time" className="input sm:w-[7.5rem]" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Start time" />
        <input type="time" className="input sm:w-[7.5rem]" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="End time" />
        <Button type="submit" variant="ai" loading={loading} className="h-[42px]">
          {plan ? <ArrowPathIcon className="h-4 w-4" /> : <SparklesIcon className="h-4 w-4" />}
          {plan ? 'Re-plan' : 'Plan my day'}
        </Button>
      </form>

      <div className="relative mt-5">
        {loading ? (
          <Thinking />
        ) : plan ? (
          <div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-fg/10 bg-elevated/70 px-4 py-3 text-sm leading-relaxed">
              {plan.summary}
            </motion.p>
            <ol className="relative mt-4 space-y-2 before:absolute before:bottom-3 before:left-[4.1rem] before:top-3 before:w-px before:bg-fg/10">
              {plan.blocks.map((block, i) => {
                const meta = block.priority && PRIORITY_META[block.priority];
                const isBreak = block.type === 'break';
                return (
                  <motion.li
                    key={`${block.start}-${i}`}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    className="relative flex items-center gap-3"
                  >
                    <span className="w-12 shrink-0 text-right font-mono text-[11px] text-muted">{block.start}</span>
                    <span className={`relative z-10 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-surface ${isBreak ? 'bg-muted/50' : meta?.dot ?? 'bg-ion'}`} />
                    <div className={`group flex min-w-0 flex-1 items-center gap-3 rounded-xl border px-3.5 py-2.5 transition ${isBreak ? 'border-dashed border-fg/15 bg-transparent' : 'border-fg/10 bg-surface hover:border-fg/20'}`}>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${isBreak ? 'text-muted' : ''}`}>{block.title}</p>
                        <p className="truncate text-xs text-muted">
                          {block.start}–{block.end} · {block.note}
                        </p>
                      </div>
                      {!isBreak && block.taskId && (
                        <button onClick={() => navigate(`/app/focus?task=${encodeURIComponent(block.taskId)}`)} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-accent opacity-100 transition hover:bg-accent/10 sm:opacity-0 sm:group-hover:opacity-100">
                          <BoltIcon className="h-3.5 w-3.5" /> Focus
                        </button>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-fg/15 px-6 py-10 text-center">
            <div className="relative h-14 w-14">
              <span className="absolute inset-[30%] rounded-full bg-gradient-to-br from-accent to-coral" />
              <span className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-ion/60" />
            </div>
            <p className="text-sm text-muted">Set your hours and let Dashify arrange your tasks into a focused, realistic day.</p>
          </div>
        )}
      </div>
    </section>
  );
}
