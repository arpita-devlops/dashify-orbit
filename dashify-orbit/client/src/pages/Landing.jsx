import {
  ArrowRightIcon,
  BellAlertIcon,
  BoltIcon,
  ChartBarIcon,
  CommandLineIcon,
  CpuChipIcon,
  GlobeAltIcon,
  LockClosedIcon,
  RocketLaunchIcon,
  SparklesIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PRIORITY_META, dueLabel, minutesLabel } from '../lib/format';
import { parseQuickAdd } from '../lib/quickAdd';

const OrbitScene = lazy(() => import('../components/three/OrbitScene'));

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
  show: (i = 0) => ({ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] } }),
};

function useDemoLauncher() {
  const { loginDemo, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [launching, setLaunching] = useState(false);

  const launch = async () => {
    if (user) return navigate('/app');
    setLaunching(true);
    try {
      await loginDemo();
      navigate('/app');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLaunching(false);
    }
  };
  return { launch, launching };
}

function Nav() {
  const { user } = useAuth();
  const { scrollY } = useScroll();
  const backdrop = useTransform(scrollY, [0, 80], [0, 1]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div style={{ opacity: backdrop }} className="absolute inset-0 border-b border-fg/10 bg-bg/75 backdrop-blur-xl" />
      <nav className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="Dashify home">
          <Logo />
        </Link>
        <div className="hidden items-center gap-1 text-sm text-muted md:flex">
          {[['Features', '#features'], ['How it works', '#how'], ['Architecture', '#stack']].map(([label, href]) => (
            <a key={href} href={href} className="rounded-lg px-3 py-2 transition hover:bg-fg/5 hover:text-fg">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Button as={Link} to="/app" size="md">
              Dashboard <ArrowRightIcon className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost" className="hidden sm:inline-flex">
                Sign in
              </Button>
              <Button as={Link} to="/register">Get started</Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  const { launch, launching } = useDemoLauncher();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const sceneY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const sceneOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[100svh] overflow-hidden pt-16">
      <div className="bg-grid mask-fade pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -left-40 top-20 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[30rem] w-[30rem] rounded-full bg-lilac/20 blur-[120px]" />

      <motion.div style={{ y: sceneY, opacity: sceneOpacity }} className="absolute inset-0 lg:left-[38%]">
        <Suspense fallback={null}>
          <OrbitScene />
        </Suspense>
      </motion.div>

      <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col justify-center px-5 pb-24 sm:px-8">
        <motion.div initial="hidden" animate="show" className="max-w-xl">
          <motion.div variants={fadeUp} custom={0} className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            <SparklesIcon className="h-4 w-4" /> AI-powered productivity dashboard
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Your day,
            <br />
            <span className="text-gradient">in orbit.</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
            Dashify pulls your scattered to-dos into one gravitational center. AI ranks what matters, plans your hours, and keeps you in
            flow with focus sessions, reminders and live analytics.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-9 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={launch} loading={launching}>
              <RocketLaunchIcon className="h-5 w-5" /> Launch live demo
            </Button>
            <Button as={Link} to="/register" size="lg" variant="secondary">
              Create free account
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} custom={4} className="mt-5 text-xs text-muted">
            No signup needed for the demo · <span className="font-mono">demo@dashify.app</span> / <span className="font-mono">demo1234</span>
          </motion.p>
          <motion.div variants={fadeUp} custom={5} className="mt-10 flex flex-wrap gap-2">
            {['React 19', 'Express', 'MongoDB', 'JWT auth', 'OpenAI'].map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        <div className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted sm:flex">
          <span>Closer orbit = higher priority</span>
          <span className="h-8 w-px animate-pulse bg-gradient-to-b from-muted to-transparent" />
        </div>
      </div>
    </section>
  );
}

function ProductPreview() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [32, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.4], [0.2, 1]);

  const plan = [
    ['09:00', 'Fix auth bug', 'urgent', 'Overdue · blocks release'],
    ['09:45', 'Ship v2 dashboard', 'high', 'Due today · in progress'],
    ['11:15', 'Recharge break', null, 'Step away, hydrate'],
    ['11:30', 'Review pull requests', 'medium', 'Quick win before lunch'],
  ];

  return (
    <section ref={ref} className="relative px-5 pb-10 sm:px-8" style={{ perspective: 1400 }}>
      <motion.div style={{ rotateX, scale, opacity, transformOrigin: 'center top' }} className="card mx-auto max-w-6xl overflow-hidden bg-surface/90 p-0">
        <div className="flex items-center gap-2 border-b border-fg/10 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-coral/80" />
          <span className="h-3 w-3 rounded-full bg-accent/80" />
          <span className="h-3 w-3 rounded-full bg-mint/80" />
          <span className="ml-3 rounded-md bg-fg/5 px-3 py-1 font-mono text-[11px] text-muted">dashify.app/overview</span>
        </div>
        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_1.3fr_1fr]">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            {[
              ['Productivity score', '86', 'text-accent'],
              ['Focus this week', '6h 40m', 'text-lilac'],
              ['Completed', '12 tasks', 'text-mint'],
              ['Streak', '7 days', 'text-ion'],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-xl border border-fg/10 bg-elevated/70 p-3.5">
                <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
                <p className={`mt-1 font-display text-xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-fg/10 bg-elevated/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <SparklesIcon className="h-4 w-4 text-accent" /> AI plan for today
              </p>
              <span className="chip">Smart planner</span>
            </div>
            <ol className="space-y-2">
              {plan.map(([time, title, priority, note], i) => (
                <motion.li
                  key={time}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.12 }}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${priority ? 'border-fg/10 bg-surface/80' : 'border-dashed border-fg/15'}`}
                >
                  <span className="font-mono text-[11px] text-muted">{time}</span>
                  <span className={`h-2 w-2 rounded-full ${priority ? PRIORITY_META[priority].dot : 'bg-muted/40'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{title}</span>
                    <span className="block truncate text-[11px] text-muted">{note}</span>
                  </span>
                </motion.li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl border border-fg/10 bg-elevated/70 p-4">
            <p className="mb-3 text-sm font-semibold">This week</p>
            <div className="flex h-36 items-end gap-2">
              {[40, 65, 30, 80, 55, 95, 70].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.06, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-accent/30 to-accent"
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function FeatureCard({ icon: Icon, title, body, className = '', children, index }) {
  return (
    <motion.article
      variants={fadeUp}
      custom={index}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      whileHover={{ y: -6 }}
      className={`card group relative overflow-hidden p-6 ${className}`}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl transition group-hover:bg-accent/20" />
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-fg/10 bg-elevated text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
      {children && <div className="mt-5">{children}</div>}
    </motion.article>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8">
      <SectionHeading eyebrow="Features" title="Everything your day needs to stay on course" body="A full-stack productivity system — not just a to-do list." />
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        <FeatureCard index={0} className="md:col-span-2" icon={SparklesIcon} title="AI daily planner" body="Tell Dashify your focus and working hours. An LLM ranks your open work by urgency and impact, then builds a time-blocked plan with breaks — explaining every slot.">
          <div className="space-y-2">
            {[['09:00', 'Fix auth bug', 'Overdue · blocks release', 'urgent'], ['09:45', 'Ship v2 dashboard', 'Due today · already in progress', 'high'], ['11:15', 'Review PRs', 'Quick win', 'medium']].map(([t, title, why, p], i) => (
              <motion.div key={t} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.15 }} className="flex items-center gap-3 rounded-xl border border-fg/10 bg-elevated/70 px-3 py-2">
                <span className="font-mono text-[11px] text-muted">{t}</span>
                <span className={`h-2 w-2 rounded-full ${PRIORITY_META[p].dot}`} />
                <span className="text-sm font-medium">{title}</span>
                <span className="ml-auto hidden text-[11px] text-muted sm:block">{why}</span>
              </motion.div>
            ))}
          </div>
        </FeatureCard>

        <FeatureCard index={1} icon={Squares2X2Icon} title="Smart Kanban board" body="Drag tasks between To do, In progress and Done. Filter by priority, tags and status; search everything instantly.">
          <div className="relative grid h-20 grid-cols-3 gap-2">
            {['To do', 'Doing', 'Done'].map((c) => (
              <div key={c} className="rounded-lg border border-dashed border-fg/15 p-1.5 text-[10px] text-muted">
                {c}
              </div>
            ))}
            <motion.div
              className="absolute left-1.5 top-6 h-6 w-[calc(33%-1rem)] rounded-md bg-gradient-to-r from-accent to-coral shadow-glow"
              animate={{ x: ['0%', '112%', '224%', '224%', '0%'] }}
              transition={{ duration: 5, repeat: Infinity, times: [0, 0.3, 0.6, 0.9, 1], ease: 'easeInOut' }}
            />
          </div>
        </FeatureCard>

        <FeatureCard index={2} icon={BoltIcon} title="Focus sessions" body="Pomodoro-style timer linked to tasks. Every session is logged and feeds your analytics.">
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 44 44" className="h-16 w-16 -rotate-90">
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgb(var(--fg) / 0.1)" strokeWidth="4" />
              <motion.circle cx="22" cy="22" r="18" fill="none" stroke="rgb(var(--accent))" strokeWidth="4" strokeLinecap="round" strokeDasharray="113" animate={{ strokeDashoffset: [113, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }} />
            </svg>
            <div>
              <p className="font-mono text-2xl font-semibold">25:00</p>
              <p className="text-xs text-muted">Deep work · Ship v2</p>
            </div>
          </div>
        </FeatureCard>

        <FeatureCard index={3} icon={ChartBarIcon} title="Live analytics" body="Productivity score, streaks, weekly completions, focus minutes and priority mix — computed from your real activity.">
          <div className="flex h-16 items-end gap-1.5">
            {[30, 55, 40, 70, 50, 90, 65].map((h, i) => (
              <motion.span key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.7 }} className="flex-1 rounded-t bg-gradient-to-t from-ion/30 to-ion" />
            ))}
          </div>
        </FeatureCard>

        <FeatureCard index={4} icon={BellAlertIcon} title="Reminders that land" body="Set a reminder relative to the deadline. Dashify nudges you with in-app toasts and native notifications.">
          <div className="relative h-16">
            {[0, 1].map((i) => (
              <motion.div key={i} className="absolute inset-x-0 flex items-center gap-2 rounded-lg border border-fg/10 bg-elevated px-3 py-2 text-xs" style={{ top: i * 10, scale: 1 - i * 0.05, zIndex: 2 - i }} animate={{ y: [8, 0, 0, -6], opacity: [0, 1, 1, 0] }} transition={{ duration: 4, repeat: Infinity, delay: i * 2 }}>
                <BellAlertIcon className="h-4 w-4 text-accent" /> {i ? 'Evening run in 15 min' : 'Ship v2 due in 2 hours'}
              </motion.div>
            ))}
          </div>
        </FeatureCard>

        <FeatureCard index={5} icon={CommandLineIcon} title="Command palette" body="Press Ctrl K anywhere to jump, search, or capture a task in plain English.">
          <div className="flex items-center gap-2">
            {['Ctrl', 'K'].map((k, i) => (
              <motion.kbd key={k} animate={{ y: [0, 3, 0] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.15 }} className="rounded-lg border border-fg/15 bg-elevated px-3 py-1.5 font-mono text-sm shadow-[0_3px_0_rgb(var(--fg)/0.15)]">
                {k}
              </motion.kbd>
            ))}
            <span className="ml-2 font-mono text-xs text-muted">→ “gym tomorrow 7am #health”</span>
          </div>
        </FeatureCard>

        <FeatureCard index={6} className="md:col-span-2" icon={GlobeAltIcon} title="Built for distributed teams" body="Shared boards that sync live over WebSockets, assignees, @mentions, a golden-hours finder across time zones, workload balancing and AI-written async standups.">
          <div className="space-y-1.5">
            {[['Maya', 'New York', 'bg-ion', 36, 38], ['Lukas', 'Berlin', 'bg-mint', 14, 36], ['Priya', 'Pune', 'bg-accent', 0, 38]].map(([name, city, color, left, width], i) => (
              <div key={name} className="flex items-center gap-3 text-xs">
                <span className="w-24 shrink-0 text-muted">{name} · {city}</span>
                <div className="relative h-4 flex-1 overflow-hidden rounded bg-fg/[0.05]">
                  <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.15, duration: 0.7 }} className={`absolute inset-y-0.5 origin-left rounded ${color} opacity-80`} style={{ left: `${left}%`, width: `${width}%` }} />
                  <span className="absolute inset-y-0 left-[36%] w-[16%] border-x border-accent/50 bg-accent/10" />
                </div>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-accent">● Golden hours: everyone online</p>
          </div>
        </FeatureCard>

        <FeatureCard index={7} className="md:col-span-3" icon={LockClosedIcon} title="Secure, production-ready architecture" body="JWT authentication with bcrypt-hashed passwords, role-based access control (owner / admin / member / viewer), per-user and per-team data isolation, input validation, Helmet security headers, rate limiting, environment-based secrets and Dockerized deployment.">
          <div className="flex flex-wrap gap-2">
            {['JWT · 7d expiry', 'bcrypt (12 rounds)', 'Role-based access', 'Socket.IO realtime', 'Helmet headers', 'Rate limiting', 'Input whitelisting', 'Docker Compose', 'GitHub Actions CI/CD'].map((t) => (
              <span key={t} className="chip border-mint/25 bg-mint/10 text-mint">
                {t}
              </span>
            ))}
          </div>
        </FeatureCard>
      </div>
    </section>
  );
}

function QuickAddDemo() {
  const [text, setText] = useState('Finish report tomorrow 5pm #work !high ~45m');
  const parsed = useMemo(() => parseQuickAdd(text), [text]);
  const due = dueLabel(parsed.dueAt);
  const tokens = [
    parsed.title && { key: 'title', label: 'Title', value: parsed.title, tone: 'text-fg' },
    due && { key: 'due', label: 'Due', value: due.text, tone: 'text-ion' },
    parsed.priority && { key: 'priority', label: 'Priority', value: PRIORITY_META[parsed.priority].label, tone: PRIORITY_META[parsed.priority].text },
    ...parsed.tags.map((t) => ({ key: `tag-${t}`, label: 'Tag', value: `#${t}`, tone: 'text-lilac' })),
    parsed.estimateMins && { key: 'est', label: 'Estimate', value: minutesLabel(parsed.estimateMins), tone: 'text-mint' },
  ].filter(Boolean);

  return (
    <div className="card p-5">
      <label htmlFor="qa-demo" className="label">
        Try it — type a task in plain English
      </label>
      <input id="qa-demo" value={text} onChange={(e) => setText(e.target.value)} className="input font-mono" maxLength={140} />
      <div className="mt-4 flex min-h-[5rem] flex-wrap content-start gap-2">
        <AnimatePresence mode="popLayout">
          {tokens.map((t) => (
            <motion.span key={t.key} layout initial={{ opacity: 0, scale: 0.8, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} className="inline-flex items-center gap-2 rounded-xl border border-fg/10 bg-elevated px-3 py-1.5 text-sm">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t.label}</span>
              <span className={`font-medium ${t.tone}`}>{t.value}</span>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { icon: CommandLineIcon, title: 'Capture', body: 'Type tasks naturally — dates, times, #tags, !priority and ~estimates are parsed instantly.' },
    { icon: CpuChipIcon, title: 'Plan', body: 'AI re-ranks priorities from deadlines and momentum, then time-blocks your day.' },
    { icon: BoltIcon, title: 'Focus', body: 'Start a focus session straight from your plan. Progress flows into your analytics.' },
  ];
  return (
    <section id="how" className="relative scroll-mt-20 overflow-hidden border-y border-fg/10 bg-surface/40 py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
        <div>
          <SectionHeading align="left" eyebrow="How it works" title="From chaos to a clear plan in three moves" />
          <ol className="relative mt-10 space-y-8 before:absolute before:bottom-4 before:left-5 before:top-4 before:w-px before:bg-gradient-to-b before:from-accent before:via-coral before:to-lilac">
            {steps.map((s, i) => (
              <motion.li key={s.title} variants={fadeUp} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }} className="relative flex gap-5">
                <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-accent/40 bg-bg text-accent shadow-glow">
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-mono text-xs text-muted">0{i + 1}</p>
                  <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">{s.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
        <QuickAddDemo />
      </div>
    </section>
  );
}

function Architecture() {
  const nodes = [
    { title: 'React 19 SPA', sub: 'Vite · Tailwind · Framer Motion · Three.js', color: 'text-ion' },
    { title: 'Express REST API', sub: 'JWT · Helmet · rate limits · validation', color: 'text-accent' },
    { title: 'MongoDB', sub: 'Mongoose models · per-user isolation', color: 'text-mint' },
  ];
  return (
    <section id="stack" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8">
      <SectionHeading eyebrow="Architecture" title="Built like a real product" body="A clean three-tier architecture with an AI service layer — and a graceful fallback when the model is unavailable." />
      <div className="mt-14 grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {nodes.map((n, i) => (
          <FragmentWithConnector key={n.title} last={i === nodes.length - 1}>
            <motion.div variants={fadeUp} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-5 text-center">
              <p className={`font-display text-lg font-semibold ${n.color}`}>{n.title}</p>
              <p className="mt-1 text-xs text-muted">{n.sub}</p>
            </motion.div>
          </FragmentWithConnector>
        ))}
      </div>
      <div className="mx-auto mt-4 flex max-w-md flex-col items-center">
        <span className="relative h-10 w-px overflow-hidden bg-fg/15">
          <motion.span className="absolute left-0 h-3 w-px bg-lilac" animate={{ top: ['-20%', '110%'] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }} />
        </span>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card w-full border-lilac/30 p-5 text-center">
          <p className="flex items-center justify-center gap-2 font-display text-lg font-semibold text-lilac">
            <SparklesIcon className="h-5 w-5" /> AI service layer
          </p>
          <p className="mt-1 text-xs text-muted">OpenAI planner with validated JSON output → deterministic heuristic fallback</p>
        </motion.div>
      </div>
    </section>
  );
}

function FragmentWithConnector({ children, last }) {
  return (
    <>
      {children}
      {!last && (
        <span className="relative mx-auto h-8 w-px overflow-hidden bg-fg/15 lg:h-px lg:w-16">
          <motion.span className="absolute left-0 h-3 w-px bg-accent lg:hidden" animate={{ top: ['-30%', '110%'] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />
          <motion.span className="absolute top-0 hidden h-px w-4 bg-accent lg:block" animate={{ left: ['-30%', '110%'] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />
        </span>
      )}
    </>
  );
}

function SectionHeading({ eyebrow, title, body, align = 'center' }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-accent">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {body && <p className="mt-4 text-muted">{body}</p>}
    </motion.div>
  );
}

function FinalCta() {
  const { launch, launching } = useDemoLauncher();
  return (
    <section className="px-5 pb-24 sm:px-8">
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-fg/10 bg-[#0b0d18] px-6 py-16 text-center text-white sm:px-12">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffb547]/30 blur-[90px]" />
        <div className="pointer-events-none absolute inset-0 animate-spin-slower opacity-40" style={{ background: 'conic-gradient(from 0deg, transparent, rgba(108,140,255,0.25), transparent 30%)' }} />
        <div className="relative">
          <h2 className="font-display text-3xl font-bold sm:text-5xl">Put your day in orbit.</h2>
          <p className="mx-auto mt-4 max-w-lg text-white/70">Explore the full workspace with sample data — plan with AI, drag tasks, run a focus session.</p>
          <Button size="lg" className="mt-8" onClick={launch} loading={launching}>
            <RocketLaunchIcon className="h-5 w-5" /> Launch live demo
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="overflow-x-clip">
      <Nav />
      <main>
        <Hero />
        <ProductPreview />
        <Features />
        <HowItWorks />
        <Architecture />
        <FinalCta />
      </main>
      <footer className="border-t border-fg/10 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 text-sm text-muted sm:flex-row sm:px-8">
          <Logo />
          <p>
            Designed &amp; built by{' '}
            <a href="https://arpita-devlops.github.io/MyPortfolio/" target="_blank" rel="noopener noreferrer" className="font-medium text-fg hover:text-accent">
              Arpita Pandey
            </a>{' '}
            ·{' '}
            <a href="https://github.com/arpita-devlops/dashify-orbit" target="_blank" rel="noopener noreferrer" className="hover:text-accent">
              Source on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
