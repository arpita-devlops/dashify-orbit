import { BoltIcon, CheckBadgeIcon, ClockIcon, ExclamationTriangleIcon, FireIcon, PlusIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PriorityDonut, WeeklyChart } from '../../components/app/Charts';
import PlanPanel from '../../components/app/PlanPanel';
import { CheckButton } from '../../components/app/TaskCard';
import Button from '../../components/ui/Button';
import { CountUp, DueChip, PriorityBadge, ProgressRing, TiltCard } from '../../components/ui/Primitives';
import { useAppUi } from '../../context/AppUiContext';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { greeting, minutesLabel } from '../../lib/format';
import { rankTasks, weeklyActivity, workspaceStats } from '../../lib/stats';

const rise = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
};

function StatCard({ icon: Icon, label, value, suffix, hint, tone, index }) {
  return (
    <motion.div variants={rise} custom={index} initial="hidden" animate="show">
      <TiltCard max={6} className="card group h-full p-4 sm:p-5">
        <div className="flex items-center justify-between" style={{ transform: 'translateZ(20px)' }}>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 font-display text-3xl font-bold" style={{ transform: 'translateZ(30px)' }}>
          {typeof value === 'number' ? <CountUp value={value} suffix={suffix} /> : value}
        </p>
        <p className="mt-1 text-xs text-muted">{hint}</p>
      </TiltCard>
    </motion.div>
  );
}

function ScoreCard({ stats }) {
  const message =
    stats.score >= 80 ? 'You’re in a great orbit — keep the streak alive.' : stats.score >= 50 ? 'Solid momentum. Clear an overdue task to climb.' : 'Start small: one focus session moves the needle.';
  return (
    <TiltCard max={8} className="card relative flex h-full flex-col items-center justify-center overflow-hidden p-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgb(var(--accent)/0.15),transparent_60%)]" />
      <p className="relative text-xs font-semibold uppercase tracking-[0.15em] text-muted">Productivity score</p>
      <div className="relative mt-4" style={{ transform: 'translateZ(40px)' }}>
        <ProgressRing value={stats.score / 100} size={168} stroke={13}>
          <div>
            <p className="font-display text-5xl font-bold">
              <CountUp value={stats.score} />
            </p>
            <p className="text-xs text-muted">out of 100</p>
          </div>
        </ProgressRing>
      </div>
      <p className="relative mt-4 max-w-[16rem] text-sm text-muted">{message}</p>
      <div className="relative mt-4 flex gap-2">
        <span className="chip border-coral/25 bg-coral/10 text-coral">
          <FireIcon className="h-3.5 w-3.5" /> {stats.streak}-day streak
        </span>
        <span className="chip border-lilac/25 bg-lilac/10 text-lilac">
          <BoltIcon className="h-3.5 w-3.5" /> {minutesLabel(stats.focusToday)} today
        </span>
      </div>
    </TiltCard>
  );
}

function UpNext({ tasks }) {
  const { toggleDone } = useWorkspace();
  const { openTaskModal } = useAppUi();
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Up next</h2>
          <p className="text-sm text-muted">Ranked by urgency, priority and momentum</p>
        </div>
        <Button as={Link} to="/app/tasks" variant="ghost" size="sm">View board</Button>
      </div>
      <ul className="mt-4 divide-y divide-fg/[0.07]">
        {tasks.length === 0 && (
          <li className="py-10 text-center text-sm text-muted">
            All clear! <button onClick={() => openTaskModal()} className="font-semibold text-accent">Add a task</button>
          </li>
        )}
        {tasks.map((task, i) => (
          <motion.li key={task.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 py-3">
            <CheckButton done={task.status === 'done'} onClick={() => toggleDone(task)} />
            <button onClick={() => openTaskModal(task)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium hover:text-accent">{task.title}</p>
              {task.tags?.length > 0 && <p className="truncate text-xs text-muted">{task.tags.map((t) => `#${t}`).join(' ')}</p>}
            </button>
            <span className="hidden sm:block"><DueChip dueAt={task.dueAt} /></span>
            <PriorityBadge priority={task.priority} compact />
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const { tasks, sessions, teamId, currentTeam } = useWorkspace();
  const { openTaskModal } = useAppUi();
  const [now] = useState(() => new Date());

  const stats = useMemo(() => workspaceStats(tasks, sessions, now), [tasks, sessions, now]);
  const week = useMemo(() => weeklyActivity(tasks, sessions, now), [tasks, sessions, now]);
  const upNext = useMemo(
    () => rankTasks(teamId ? tasks.filter((t) => !t.assigneeId || t.assigneeId === user.id) : tasks, now).slice(0, 6),
    [tasks, now, teamId, user.id],
  );

  return (
    <div className="space-y-6">
      <motion.div variants={rise} initial="hidden" animate="show" className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            {currentTeam && <span className="ml-2 rounded-full border border-ion/30 bg-ion/10 px-2 py-0.5 text-[11px] font-semibold text-ion">{currentTeam.name}</span>}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {greeting(now)}, <span className="text-gradient">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {stats.dueToday ? `${stats.dueToday} task${stats.dueToday > 1 ? 's' : ''} due today` : 'Nothing due today'}
            {stats.overdue ? ` · ${stats.overdue} overdue` : ''} · {stats.inProgress} in progress
          </p>
        </div>
        <Button onClick={() => openTaskModal()}>
          <PlusIcon className="h-4 w-4" /> New task
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard index={0} icon={ClockIcon} label="Due today" value={stats.dueToday} hint={`${stats.open} open in total`} tone="bg-accent/10 text-accent" />
        <StatCard index={1} icon={CheckBadgeIcon} label="Completed" value={stats.completedWeek} hint="in the last 7 days" tone="bg-mint/10 text-mint" />
        <StatCard index={2} icon={BoltIcon} label="Focus" value={minutesLabel(stats.focusWeek)} hint="deep work this week" tone="bg-lilac/10 text-lilac" />
        <StatCard index={3} icon={ExclamationTriangleIcon} label="Overdue" value={stats.overdue} hint={stats.overdue ? 'needs attention' : 'you’re on track'} tone="bg-coral/10 text-coral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <motion.div variants={rise} custom={4} initial="hidden" animate="show" className="xl:col-span-2">
          <PlanPanel />
        </motion.div>
        <motion.div variants={rise} custom={5} initial="hidden" animate="show">
          <ScoreCard stats={stats} />
        </motion.div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <motion.div variants={rise} custom={6} initial="hidden" animate="show" className="xl:col-span-2">
          <WeeklyChart data={week} />
        </motion.div>
        <motion.div variants={rise} custom={7} initial="hidden" animate="show">
          <PriorityDonut counts={stats.priorityCounts} />
        </motion.div>
      </div>

      <motion.div variants={rise} custom={8} initial="hidden" animate="show">
        <UpNext tasks={upNext} />
      </motion.div>
    </div>
  );
}
