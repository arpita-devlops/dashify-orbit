import { CheckIcon, ChevronUpDownIcon, PlusIcon, UserIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useAppUi } from '../../context/AppUiContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { initials } from '../../lib/format';

const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer' };

function ScopeIcon({ team }) {
  if (!team) {
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-fg/[0.06] text-muted">
        <UserIcon className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-ion to-lilac font-display text-xs font-bold text-white">
      {initials(team.name)}
    </span>
  );
}

export default function TeamSwitcher({ compact = false }) {
  const { teams, currentTeam, switchScope } = useWorkspace();
  const { openTeamModal } = useAppUi();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const choose = (id) => {
    switchScope(id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2.5 rounded-xl border border-fg/10 bg-elevated/60 text-left transition hover:border-fg/25 ${compact ? 'p-1.5' : 'px-2.5 py-2'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <ScopeIcon team={currentTeam} />
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{currentTeam?.name ?? 'Personal'}</span>
            <span className="block truncate text-[11px] text-muted">{currentTeam ? `${ROLE_LABEL[currentTeam.role]} · ${currentTeam.memberCount} members` : 'Only visible to you'}</span>
          </span>
        )}
        {!compact && <ChevronUpDownIcon className="h-4 w-4 shrink-0 text-muted" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className={`card absolute z-50 mt-2 w-72 bg-surface p-1.5 ${compact ? 'left-0' : 'inset-x-0 w-auto'}`}
            role="listbox"
          >
            <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Workspaces</p>
            {[null, ...teams].map((team) => {
              const active = (team?.id ?? null) === (currentTeam?.id ?? null);
              return (
                <button key={team?.id ?? 'personal'} onClick={() => choose(team?.id ?? null)} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${active ? 'bg-accent/10' : 'hover:bg-fg/5'}`} role="option" aria-selected={active}>
                  <ScopeIcon team={team} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{team?.name ?? 'Personal'}</span>
                    <span className="block text-[11px] text-muted">{team ? `${ROLE_LABEL[team.role]} · ${team.memberCount} members` : 'Private tasks & focus'}</span>
                  </span>
                  {active && <CheckIcon className="h-4 w-4 text-accent" />}
                </button>
              );
            })}
            <div className="my-1 h-px bg-fg/10" />
            <button
              onClick={() => {
                setOpen(false);
                openTeamModal();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-accent transition hover:bg-accent/10"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-dashed border-accent/40">
                <PlusIcon className="h-4 w-4" />
              </span>
              Create or join a team
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
