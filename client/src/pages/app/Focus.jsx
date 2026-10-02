import { ArrowPathIcon, BoltIcon, CheckIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { CountUp, ProgressRing } from '../../components/ui/Primitives';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PRIORITY_META, formatTime, minutesLabel } from '../../lib/format';
import { isSameDay, rankTasks } from '../../lib/stats';

const PRESETS = [
  { key: 'focus', label: 'Focus', minutes: 25, kind: 'focus' },
  { key: 'deep', label: 'Deep work', minutes: 50, kind: 'focus' },
  { key: 'break', label: 'Break', minutes: 5, kind: 'break' },
];

const fmt = (secs) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [660, 880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  } catch {
    // audio not available — the toast still announces completion
  }
}

/** Tilted 3D orbit rings with a satellite whose speed reflects whether the timer is running. */
function OrbitRings({ running, kind }) {
  const color = kind === 'break' ? 'bg-mint shadow-[0_0_16px_rgb(var(--mint))]' : 'bg-accent shadow-[0_0_16px_rgb(var(--accent))]';
  const rings = [
    { size: 'h-[340px] w-[340px] sm:h-[400px] sm:w-[400px]', tilt: 'rotateX(74deg) rotateY(14deg)', speed: running ? 5 : 24, dot: color },
    { size: 'h-[290px] w-[290px] sm:h-[350px] sm:w-[350px]', tilt: 'rotateX(66deg) rotateY(-28deg)', speed: running ? 8 : 36, dot: 'bg-ion shadow-[0_0_14px_rgb(var(--ion))]' },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" style={{ perspective: 900 }}>
      {rings.map((ring, i) => (
        <div key={i} className={`absolute rounded-full border border-fg/10 ${ring.size}`} style={{ transform: ring.tilt, transformStyle: 'preserve-3d' }}>
          <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: ring.speed, repeat: Infinity, ease: 'linear' }}>
            <span className={`absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full ${ring.dot}`} />
          </motion.div>
        </div>
      ))}
    </div>
  );
}

export default function Focus() {
  const { tasks, sessions, logFocus, updateTask, teamId } = useWorkspace();
  const { user } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const openTasks = useMemo(() => rankTasks(teamId ? tasks.filter((t) => !t.assigneeId || t.assigneeId === user.id) : tasks), [tasks, teamId, user.id]);

  const [presetKey, setPresetKey] = useState('focus');
  const preset = PRESETS.find((p) => p.key === presetKey);
  const [duration, setDuration] = useState(preset.minutes * 60);
  const [remaining, setRemaining] = useState(preset.minutes * 60);
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState(() => {
    const fromQuery = params.get('task');
    return tasks.some((t) => t.id === fromQuery && t.status !== 'done') ? fromQuery : '';
  });
  const endAt = useRef(null);
  const completing = useRef(false);
  const task = tasks.find((t) => t.id === taskId);

  const choose = useCallback((key) => {
    const next = PRESETS.find((p) => p.key === key);
    setPresetKey(key);
    setDuration(next.minutes * 60);
    setRemaining(next.minutes * 60);
    setRunning(false);
  }, []);

  const complete = useCallback(async () => {
    if (completing.current) return;
    completing.current = true;
    setRunning(false);
    chime();
    if (preset.kind === 'focus') {
      const minutes = Math.max(1, Math.round((duration - remaining) / 60));
      try {
        await logFocus({ taskId: taskId || null, minutes });
        toast.show({
          tone: 'success',
          title: `Session complete · ${minutesLabel(minutes)}`,
          message: task ? `Great work on “${task.title}”. Time for a short break.` : 'Logged to your analytics. Time for a short break.',
          action: task && { label: 'Mark done', onClick: () => updateTask(task.id, { status: 'done' }) },
          duration: 9000,
        });
      } catch (err) {
        toast.error(err.message);
      }
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Focus session complete', { body: 'Take a 5 minute break.' });
      choose('break');
    } else {
      toast.info('Break over — ready for the next orbit?');
      choose('focus');
    }
    completing.current = false;
  }, [preset.kind, duration, remaining, logFocus, taskId, task, toast, updateTask, choose]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) complete();
    }, 250);
    return () => clearInterval(id);
  }, [running, complete]);

  useEffect(() => {
    const original = document.title;
    if (running) document.title = `${fmt(remaining)} · ${preset.label} — Dashify`;
    return () => {
      document.title = original;
    };
  }, [running, remaining, preset.label]);

  const toggle = useCallback(() => {
    if (running) {
      setRunning(false);
    } else {
      endAt.current = Date.now() + remaining * 1000;
      setRunning(true);
    }
  }, [running, remaining]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  const [today] = useState(() => new Date());
  const todaySessions = sessions.filter((s) => isSameDay(s.startedAt, today));
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0);
  const goal = 120;
  const progress = 1 - remaining / duration;
  const isBreak = preset.kind === 'break';

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <motion.div
          className={`pointer-events-none absolute left-1/2 top-[45%] h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px] ${isBreak ? 'bg-mint/20' : 'bg-accent/20'}`}
          animate={running ? { scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] } : { scale: 1, opacity: 0.5 }}
          transition={{ duration: 4, repeat: running ? Infinity : 0, ease: 'easeInOut' }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Focus mode</h1>
            <p className="text-sm text-muted">Press <kbd className="kbd">Space</kbd> to start or pause</p>
          </div>
          <div className="flex rounded-xl bg-fg/[0.05] p-1 text-xs font-semibold">
            {PRESETS.map((p) => (
              <button key={p.key} onClick={() => choose(p.key)} className={`relative rounded-lg px-3 py-1.5 transition ${presetKey === p.key ? 'text-fg' : 'text-muted hover:text-fg'}`}>
                {presetKey === p.key && <motion.span layoutId="preset-pill" className="absolute inset-0 rounded-lg bg-surface shadow-soft" />}
                <span className="relative">{p.label} · {p.minutes}m</span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative my-6 grid h-[360px] place-items-center sm:h-[420px]">
          <OrbitRings running={running} kind={preset.kind} />
          <ProgressRing value={progress} size={260} stroke={10} colors={isBreak ? ['rgb(var(--mint))', 'rgb(var(--ion))'] : ['rgb(var(--accent))', 'rgb(var(--coral))']}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{running ? (isBreak ? 'Recharging' : 'In orbit') : 'Ready'}</p>
              <p className="mt-1 font-mono text-6xl font-semibold tabular-nums tracking-tight">{fmt(remaining)}</p>
              <p className="mt-1 max-w-[11rem] truncate text-xs text-muted">{isBreak ? 'Breathe. Stretch. Hydrate.' : task ? task.title : 'Free focus'}</p>
            </div>
          </ProgressRing>
        </div>

        <div className="relative flex flex-wrap items-center justify-center gap-3">
          <Button variant="secondary" size="lg" onClick={() => choose(presetKey)} aria-label="Reset timer">
            <ArrowPathIcon className="h-5 w-5" />
          </Button>
          <Button size="lg" onClick={toggle} className="min-w-[10rem]">
            {running ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
            {running ? 'Pause' : remaining < duration ? 'Resume' : 'Start'}
          </Button>
          <Button variant="secondary" size="lg" onClick={complete} disabled={remaining === duration} aria-label="Finish session now">
            <CheckIcon className="h-5 w-5" />
          </Button>
        </div>

        {!isBreak && (
          <div className="relative mx-auto mt-6 max-w-md">
            <label htmlFor="focus-task" className="label text-center">Focusing on</label>
            <select id="focus-task" className="input text-center" value={taskId} onChange={(e) => setTaskId(e.target.value)} disabled={running}>
              <option value="">Free focus (no task)</option>
              {openTasks.map((t) => (
                <option key={t.id} value={t.id}>{PRIORITY_META[t.priority].label} · {t.title}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="font-display text-lg font-semibold">Today’s focus</h2>
          <div className="mt-4 flex items-center gap-5">
            <ProgressRing value={todayMinutes / goal} size={110} stroke={9} colors={['rgb(var(--lilac))', 'rgb(var(--ion))']}>
              <div>
                <p className="font-display text-xl font-bold"><CountUp value={todayMinutes} /></p>
                <p className="text-[10px] uppercase tracking-wider text-muted">min</p>
              </div>
            </ProgressRing>
            <div className="space-y-1 text-sm">
              <p><span className="font-semibold">{todaySessions.length}</span> <span className="text-muted">sessions completed</span></p>
              <p><span className="font-semibold">{Math.max(goal - todayMinutes, 0)} min</span> <span className="text-muted">to your {goal}-min goal</span></p>
              {todayMinutes >= goal && <p className="font-semibold text-mint">Daily goal reached 🎯</p>}
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg font-semibold">Recent sessions</h2>
          <ul className="mt-3 space-y-2">
            {sessions.length === 0 && <li className="py-6 text-center text-sm text-muted">Your completed sessions will appear here.</li>}
            {sessions.slice(0, 7).map((s, i) => {
              const linked = tasks.find((t) => t.id === s.taskId);
              return (
                <motion.li key={s.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-3 rounded-xl border border-fg/[0.07] bg-elevated/50 px-3 py-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
                    <BoltIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{linked?.title ?? 'Free focus'}</p>
                    <p className="text-xs text-muted">
                      {new Date(s.startedAt).toLocaleDateString(undefined, { weekday: 'short' })} · {formatTime(s.startedAt)}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold">{s.minutes}m</span>
                </motion.li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
