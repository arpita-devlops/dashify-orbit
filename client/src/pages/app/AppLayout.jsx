import {
  ArrowRightStartOnRectangleIcon,
  BellIcon,
  BoltIcon,
  Cog6ToothIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useOutlet } from 'react-router-dom';
import TeamSwitcher from '../../components/app/TeamSwitcher';
import { DueChip } from '../../components/ui/Primitives';
import { Logo } from '../../components/ui/Logo';
import ThemeToggle from '../../components/ui/ThemeToggle';
import { AppUiProvider, useAppUi } from '../../context/AppUiContext';
import { useAuth } from '../../context/AuthContext';
import { WorkspaceProvider, useWorkspace } from '../../context/WorkspaceContext';
import { PRIORITY_META } from '../../lib/format';

const NAV = [
  { to: '/app', label: 'Overview', icon: HomeIcon, end: true },
  { to: '/app/tasks', label: 'Tasks', icon: Squares2X2Icon },
  { to: '/app/team', label: 'Team', icon: UserGroupIcon },
  { to: '/app/focus', label: 'Focus', icon: BoltIcon },
  { to: '/app/settings', label: 'Settings', icon: Cog6ToothIcon },
];
const MOBILE_NAV = NAV.slice(0, 4);

function ModeBadge() {
  const { mode, aiEngine } = useAuth();
  const { connection, teamId, online } = useWorkspace();
  const live = mode === 'live';
  return (
    <div className="rounded-xl border border-fg/10 bg-elevated/60 p-3 text-xs">
      <p className="flex items-center gap-2 font-semibold">
        <span className={`relative flex h-2 w-2`}>
          <span className={`absolute inline-flex h-full w-full animate-ping2 rounded-full ${live ? 'bg-mint' : 'bg-accent'}`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? 'bg-mint' : 'bg-accent'}`} />
        </span>
        {live ? 'Live API connected' : 'Browser demo mode'}
      </p>
      <p className="mt-1 text-muted">AI engine: {aiEngine === 'openai' ? 'OpenAI' : 'Smart planner'}</p>
      <p className="mt-0.5 text-muted">
        Realtime: {connection === 'online' ? (teamId ? `synced · ${online.length} online` : 'connected') : 'reconnecting…'}
      </p>
    </div>
  );
}

function Sidebar() {
  const { user, logout } = useAuth();
  const { openPalette } = useAppUi();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-fg/10 bg-surface/70 p-4 backdrop-blur-xl lg:flex">
      <div className="px-2 py-1.5">
        <Logo />
      </div>

      <div className="mt-5">
        <TeamSwitcher />
      </div>

      <button onClick={openPalette} className="mt-3 flex items-center gap-2 rounded-xl border border-fg/10 bg-elevated/70 px-3 py-2.5 text-sm text-muted transition hover:border-accent/40 hover:text-fg">
        <PlusIcon className="h-4 w-4 text-accent" /> Quick add
        <span className="ml-auto flex gap-1"><kbd className="kbd">Ctrl</kbd><kbd className="kbd">K</kbd></span>
      </button>

      <nav className="mt-6 space-y-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="relative block">
            {({ isActive }) => (
              <span className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'text-fg' : 'text-muted hover:bg-fg/5 hover:text-fg'}`}>
                {isActive && <motion.span layoutId="sidebar-pill" className="absolute inset-0 rounded-xl border border-accent/25 bg-accent/10" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <Icon className={`relative h-5 w-5 ${isActive ? 'text-accent' : ''}`} />
                <span className="relative">{label}</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <ModeBadge />
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-coral font-display text-sm font-bold text-[#1a1206]">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <button onClick={logout} className="rounded-lg p-2 text-muted transition hover:bg-coral/10 hover:text-coral" aria-label="Sign out" title="Sign out">
            <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Notifications() {
  const { tasks } = useWorkspace();
  const { openTaskModal } = useAppUi();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [now] = useState(() => Date.now());

  const upcoming = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== 'done' && t.dueAt && new Date(t.dueAt).getTime() < now + 86_400_000)
        .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
        .slice(0, 6),
    [tasks, now],
  );

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative grid h-10 w-10 place-items-center rounded-xl border border-fg/10 bg-surface/60 text-muted transition hover:text-fg" aria-label="Upcoming deadlines">
        <BellIcon className="h-5 w-5" />
        {upcoming.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral ring-2 ring-surface" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} className="card absolute right-0 top-12 z-50 w-80 bg-surface p-2">
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Next 24 hours</p>
            {upcoming.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">Nothing due soon. Enjoy the calm ✨</p>}
            {upcoming.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setOpen(false);
                  openTaskModal(t);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-fg/5"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_META[t.priority].dot}`} />
                <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                <DueChip dueAt={t.dueAt} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TopBar() {
  const { openPalette } = useAppUi();
  return (
    <header className="sticky top-0 z-30 border-b border-fg/10 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 lg:hidden">
          <Logo compact />
          <TeamSwitcher compact />
        </div>
        <button onClick={openPalette} className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-fg/10 bg-surface/60 px-3.5 text-sm text-muted transition hover:border-fg/20 sm:max-w-md">
          <MagnifyingGlassIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">Search or capture a task…</span>
          <span className="ml-auto hidden gap-1 sm:flex"><kbd className="kbd">Ctrl</kbd><kbd className="kbd">K</kbd></span>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Notifications />
          <ThemeToggle />
          <Link to="/app/settings" className="grid h-10 w-10 place-items-center rounded-xl border border-fg/10 bg-surface/60 text-muted transition hover:text-fg lg:hidden" aria-label="Settings">
            <Cog6ToothIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const { openTaskModal } = useAppUi();
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-fg/10 bg-surface/90 px-2 py-1.5 shadow-soft backdrop-blur-xl lg:hidden">
      {MOBILE_NAV.slice(0, 2).map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium ${isActive ? 'text-accent' : 'text-muted'}`}>
          <Icon className="h-5 w-5" /> {label}
        </NavLink>
      ))}
      <button onClick={() => openTaskModal()} className="-mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-[#1a1206] shadow-glow" aria-label="New task">
        <PlusIcon className="h-6 w-6 stroke-[2.5]" />
      </button>
      {MOBILE_NAV.slice(2).map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium ${isActive ? 'text-accent' : 'text-muted'}`}>
          <Icon className="h-5 w-5" /> {label}
        </NavLink>
      ))}
    </nav>
  );
}

function PageLoader() {
  return (
    <div className="grid h-64 place-items-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-r-transparent" />
    </div>
  );
}

function Shell() {
  const location = useLocation();
  const outlet = useOutlet();
  const { loading } = useWorkspace();

  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-[30rem] w-[30rem] rounded-full bg-accent/[0.07] blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-[26rem] w-[26rem] rounded-full bg-lilac/[0.07] blur-[120px]" />
      </div>
      <Sidebar />
      <div className="relative lg:pl-64">
        <TopBar />
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">
          {loading ? (
            <PageLoader />
          ) : (
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <Suspense fallback={<PageLoader />}>{outlet}</Suspense>
            </motion.div>
          )}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

export default function AppLayout() {
  return (
    <WorkspaceProvider>
      <AppUiProvider>
        <Shell />
      </AppUiProvider>
    </WorkspaceProvider>
  );
}
