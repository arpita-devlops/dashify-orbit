import { UserGroupIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

function TeamForm({ initialTab, onClose }) {
  const { createTeam, joinTeam } = useWorkspace();
  const { mode } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const team = tab === 'create' ? await createTeam(name) : await joinTeam(code);
      toast.success(tab === 'create' ? `“${team.name}” is ready — share the invite code with your team` : `Welcome to ${team.name}!`);
      onClose();
      navigate('/app/team');
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-fg/[0.05] p-1 text-sm font-semibold">
        {[['create', 'Create a team', UserGroupIcon], ['join', 'Join with code', UserPlusIcon]].map(([key, label, Icon]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`relative flex items-center justify-center gap-2 rounded-lg py-2 transition ${tab === key ? 'text-fg' : 'text-muted hover:text-fg'}`}>
            {tab === key && <motion.span layoutId="team-tab" className="absolute inset-0 rounded-lg bg-surface shadow-soft" />}
            <Icon className="relative h-4 w-4" /> <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {tab === 'create' ? (
          <div>
            <label htmlFor="team-name" className="label">Team name</label>
            <input id="team-name" autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Platform Squad" />
            <p className="mt-2 text-xs text-muted">You’ll be the owner. Invite teammates anywhere in the world with an 8-character code.</p>
          </div>
        ) : (
          <div>
            <label htmlFor="team-code" className="label">Invite code</label>
            <input
              id="team-code"
              autoFocus
              className="input text-center font-mono text-lg uppercase tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
              placeholder="K7QM2XPA"
              autoComplete="off"
            />
            <p className="mt-2 text-xs text-muted">
              {mode === 'demo' ? 'Demo mode: codes work for teams created in this browser. Run the full stack to invite real teammates.' : 'Ask a team admin for the code from their Team page.'}
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy} disabled={tab === 'create' ? !name.trim() : code.length !== 8}>
            {tab === 'create' ? 'Create team' : 'Join team'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function TeamModal({ open, initialTab = 'create', onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Collaborate with your team" subtitle="Shared boards, live updates and AI standups — across every time zone.">
      <TeamForm initialTab={initialTab} onClose={onClose} />
    </Modal>
  );
}
