import { SparklesIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PRIORITY_META, PRIORITY_ORDER, STATUS_META, toLocalInput } from '../../lib/format';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Avatar from './Avatar';
import Comments from './Comments';

const REMINDERS = [
  ['none', 'No reminder'],
  ['0', 'At due time'],
  ['10', '10 min before'],
  ['60', '1 hour before'],
  ['1440', '1 day before'],
];
const ESTIMATES = [15, 30, 45, 60, 90, 120, 180];

function initialReminder(task) {
  if (!task?.remindAt) return 'none';
  if (!task.dueAt) return 'keep';
  const diff = Math.round((new Date(task.dueAt) - new Date(task.remindAt)) / 60_000);
  return REMINDERS.some(([v]) => v === String(diff)) ? String(diff) : 'keep';
}

function TaskForm({ task, defaults, onClose }) {
  const { createTask, updateTask, deleteTask, teamId, members, canEdit } = useWorkspace();
  const { user } = useAuth();
  const toast = useToast();
  const source = task ?? defaults ?? {};
  const isTeamTask = task ? Boolean(task.teamId) : Boolean(teamId);
  const readOnly = isTeamTask && !canEdit;
  const assignable = members.filter((m) => m.role !== 'viewer');
  const [form, setForm] = useState({
    title: source.title ?? '',
    description: source.description ?? '',
    status: source.status ?? 'todo',
    priority: source.priority ?? 'medium',
    due: toLocalInput(source.dueAt),
    reminder: initialReminder(task),
    estimateMins: source.estimateMins ?? 45,
    tags: source.tags ?? [],
    assignee: task ? task.assigneeId ?? '' : defaults?.assignee ?? (isTeamTask ? user.id : ''),
  });
  const [tagDraft, setTagDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const addTag = (raw) => {
    const tag = raw.trim().replace(/^#/, '').toLowerCase().slice(0, 24);
    if (tag && !form.tags.includes(tag) && form.tags.length < 8) set('tags', [...form.tags, tag]);
    setTagDraft('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Give your task a title');
    const dueAt = form.due ? new Date(form.due).toISOString() : null;
    let remindAt = null;
    if (form.reminder === 'keep') remindAt = task?.remindAt ?? null;
    else if (form.reminder !== 'none' && dueAt) remindAt = new Date(new Date(dueAt).getTime() - Number(form.reminder) * 60_000).toISOString();

    const payload = {
      title: form.title.trim(),
      description: form.description,
      status: form.status,
      priority: form.priority,
      dueAt,
      remindAt,
      estimateMins: Number(form.estimateMins),
      tags: tagDraft.trim() ? [...form.tags, tagDraft.trim().toLowerCase()] : form.tags,
      ...(isTeamTask && { assignee: form.assignee || null }),
    };

    setSaving(true);
    try {
      if (task) {
        await updateTask(task.id, payload);
        toast.success('Task updated');
      } else {
        await createTask(payload);
        toast.success('Task added to your orbit');
      }
      onClose();
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return setConfirmDelete(true);
    onClose();
    await deleteTask(task.id);
  };

  return (
    <>
    <form id="task-form" onSubmit={submit} className="space-y-5">
      {readOnly && (
        <p className="rounded-xl border border-fg/10 bg-fg/[0.04] px-3 py-2 text-xs text-muted">You have view-only access to this team. You can still join the discussion below.</p>
      )}
      <fieldset disabled={readOnly} className="space-y-5">
      {task?.aiReason && (
        <p className="flex items-start gap-2 rounded-xl border border-lilac/25 bg-lilac/10 px-3 py-2 text-xs text-lilac">
          <SparklesIcon className="mt-0.5 h-4 w-4 shrink-0" /> AI: {task.aiReason}
        </p>
      )}
      <div>
        <label htmlFor="task-title" className="label">Title</label>
        <input id="task-title" autoFocus className="input text-base" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={140} placeholder="What needs to happen?" />
      </div>
      <div>
        <label htmlFor="task-desc" className="label">Notes</label>
        <textarea id="task-desc" rows={3} className="input resize-none" value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} placeholder="Context, links, acceptance criteria…" />
      </div>

      <div>
        <span className="label">Priority</span>
        <div className="grid grid-cols-4 gap-2">
          {PRIORITY_ORDER.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => set('priority', p)}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition ${form.priority === p ? PRIORITY_META[p].soft : 'border-fg/10 text-muted hover:border-fg/25'}`}
            >
              <span className={`h-2 w-2 rounded-full ${PRIORITY_META[p].dot}`} /> {PRIORITY_META[p].label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Status</span>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-fg/[0.04] p-1">
          {Object.entries(STATUS_META).map(([value, meta]) => (
            <button type="button" key={value} onClick={() => set('status', value)} className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition ${form.status === value ? 'bg-surface text-fg shadow-soft' : 'text-muted hover:text-fg'}`}>
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      {isTeamTask && (
        <div>
          <span className="label">Assignee</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => set('assignee', '')} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${!form.assignee ? 'border-accent/40 bg-accent/10 text-accent' : 'border-fg/10 text-muted hover:border-fg/25'}`}>
              Unassigned
            </button>
            {assignable.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => set('assignee', m.id)}
                className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold transition ${form.assignee === m.id ? 'border-accent/40 bg-accent/10 text-fg' : 'border-fg/10 text-muted hover:border-fg/25'}`}
              >
                <Avatar name={m.name} id={m.id} size="h-6 w-6 text-[9px]" />
                {m.id === user.id ? 'Me' : m.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="task-due" className="label">Due</label>
          <input id="task-due" type="datetime-local" className="input" value={form.due} onChange={(e) => set('due', e.target.value)} />
        </div>
        <div>
          <label htmlFor="task-reminder" className="label">Reminder</label>
          <select id="task-reminder" className="input" value={form.reminder} onChange={(e) => set('reminder', e.target.value)} disabled={!form.due && form.reminder !== 'keep'}>
            {form.reminder === 'keep' && <option value="keep">Keep current reminder</option>}
            {REMINDERS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="task-estimate" className="label">Estimate</label>
          <select id="task-estimate" className="input" value={form.estimateMins} onChange={(e) => set('estimateMins', e.target.value)}>
            {[...new Set([...ESTIMATES, Number(form.estimateMins)])].sort((a, b) => a - b).map((m) => (
              <option key={m} value={m}>{m >= 60 ? `${m / 60}h` : `${m} min`}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="task-tags" className="label">Tags</label>
          <div className="input flex min-h-[42px] flex-wrap items-center gap-1.5 py-1.5">
            {form.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-md bg-lilac/15 px-1.5 py-0.5 text-xs font-medium text-lilac">
                #{t}
                <button type="button" onClick={() => set('tags', form.tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              id="task-tags"
              className="min-w-[4rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(tagDraft);
                } else if (e.key === 'Backspace' && !tagDraft && form.tags.length) set('tags', form.tags.slice(0, -1));
              }}
              placeholder={form.tags.length ? '' : 'work, health…'}
            />
          </div>
        </div>
      </div>
      </fieldset>

      <div className="flex items-center justify-between gap-2 border-t border-fg/10 pt-4">
        {task && !readOnly ? (
          <Button type="button" variant={confirmDelete ? 'danger' : 'ghost'} size="sm" onClick={remove}>
            <TrashIcon className="h-4 w-4" /> {confirmDelete ? 'Click to confirm' : 'Delete'}
          </Button>
        ) : (
          <span className="hidden text-xs text-muted sm:block">
            {readOnly ? 'View only' : <>Tip: press <kbd className="kbd">N</kbd> anywhere to add a task</>}
          </span>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
          {!readOnly && <Button type="submit" loading={saving}>{task ? 'Save changes' : 'Add task'}</Button>}
        </div>
      </div>
    </form>
    {task && isTeamTask && <Comments task={task} />}
    </>
  );
}

export default function TaskModal({ open, task, defaults, onClose }) {
  return (
    <Modal open={open} onClose={onClose} size={task?.teamId ? 'max-w-2xl' : 'max-w-lg'} title={task ? 'Edit task' : 'New task'} subtitle={task?.teamId ? 'Shared with your team — changes sync live for everyone.' : task ? 'Changes sync instantly across your workspace.' : 'Capture it now — Dashify will help you schedule it.'}>
      <TaskForm task={task} defaults={defaults} onClose={onClose} />
    </Modal>
  );
}
