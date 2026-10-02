import {
  AdjustmentsHorizontalIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import TaskCard, { CheckButton } from '../../components/app/TaskCard';
import Avatar from '../../components/app/Avatar';
import Button from '../../components/ui/Button';
import { DueChip, PriorityBadge } from '../../components/ui/Primitives';
import { useAppUi } from '../../context/AppUiContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PRIORITY_META, PRIORITY_ORDER, STATUS_META, dueLabel, minutesLabel } from '../../lib/format';
import { PRIORITY_WEIGHT, scoreTask } from '../../lib/planner';
import { parseQuickAdd } from '../../lib/quickAdd';

const COLUMNS = [
  { status: 'todo', label: 'To do', hint: 'Waiting for launch' },
  { status: 'in_progress', label: 'In progress', hint: 'In orbit right now' },
  { status: 'done', label: 'Done', hint: 'Landed safely' },
];

const NO_DUE = Number.MAX_SAFE_INTEGER;

const SORTS = {
  smart: { label: 'Smart rank', fn: (a, b, now) => scoreTask(b, { now }).score - scoreTask(a, { now }).score },
  due: { label: 'Due date', fn: (a, b) => (a.dueAt ? new Date(a.dueAt).getTime() : NO_DUE) - (b.dueAt ? new Date(b.dueAt).getTime() : NO_DUE) },
  priority: { label: 'Priority', fn: (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] },
  newest: { label: 'Newest', fn: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
};

function QuickAddBar() {
  const { createTask } = useWorkspace();
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => parseQuickAdd(text), [text]);
  const due = dueLabel(parsed.dueAt);

  const submit = async (e) => {
    e.preventDefault();
    if (!parsed.title) return;
    setBusy(true);
    try {
      await createTask({
        title: parsed.title,
        tags: parsed.tags,
        ...(parsed.priority && { priority: parsed.priority }),
        ...(parsed.dueAt && { dueAt: parsed.dueAt }),
        ...(parsed.estimateMins && { estimateMins: parsed.estimateMins }),
      });
      setText('');
      toast.success(`Added “${parsed.title}”`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-2">
      <div className="flex items-center gap-2">
        <PlusIcon className="ml-2 h-5 w-5 shrink-0 text-accent" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={160}
          placeholder="Quick add: “Prep demo fri 3pm #work !high ~1h”"
          className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
          aria-label="Quick add task"
        />
        <Button type="submit" size="sm" loading={busy} disabled={!parsed.title}>Add</Button>
      </div>
      <AnimatePresence>
        {text && (parsed.tags.length > 0 || parsed.priority || due || parsed.estimateMins) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-wrap gap-1.5 overflow-hidden px-2 pb-1.5 pt-1">
            {due && <span className="chip text-ion">📅 {due.text}</span>}
            {parsed.priority && <span className={`chip ${PRIORITY_META[parsed.priority].text}`}>● {PRIORITY_META[parsed.priority].label}</span>}
            {parsed.tags.map((t) => <span key={t} className="chip text-lilac">#{t}</span>)}
            {parsed.estimateMins && <span className="chip text-mint">⏱ {minutesLabel(parsed.estimateMins)}</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function Column({ column, tasks, dragId, over, setOver, onDropTask, onOpen, onToggle, setDragId, draggable }) {
  const isOver = over === column.status;
  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!isOver) setOver(column.status);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setOver(null)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(null);
        onDropTask(e.dataTransfer.getData('text/plain'), column.status);
      }}
      className={`flex w-[85vw] shrink-0 snap-start flex-col rounded-2xl border p-3 transition-colors sm:w-auto ${isOver ? 'border-accent/50 bg-accent/[0.06]' : 'border-fg/10 bg-fg/[0.02]'}`}
    >
      <header className="flex items-center gap-2 px-1.5 pb-3 pt-1">
        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[column.status].dot}`} />
        <h2 className="text-sm font-semibold">{column.label}</h2>
        <span className="rounded-full bg-fg/[0.06] px-2 py-0.5 text-[11px] font-semibold text-muted">{tasks.length}</span>
        <span className="ml-auto hidden text-[11px] text-muted xl:inline">{column.hint}</span>
      </header>
      <div className="flex min-h-[8rem] flex-1 flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <motion.div key={task.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }}>
              <TaskCard
                task={task}
                onOpen={onOpen}
                onToggle={onToggle}
                dragging={dragId === task.id}
                dragHandlers={draggable ? {
                  draggable: true,
                  onDragStart: (e) => {
                    e.dataTransfer.setData('text/plain', task.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDragId(task.id);
                  },
                  onDragEnd: () => {
                    setDragId(null);
                    setOver(null);
                  },
                } : undefined}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {tasks.length === 0 && (
          <div className={`grid flex-1 place-items-center rounded-xl border border-dashed text-xs text-muted ${isOver ? 'border-accent/50' : 'border-fg/10'}`}>
            {isOver ? 'Release to move here' : 'Drop tasks here'}
          </div>
        )}
      </div>
    </section>
  );
}

function ListView({ tasks, onOpen, onToggle }) {
  return (
    <div className="card overflow-hidden">
      <div className="hidden grid-cols-[auto_1fr_8rem_9rem_6rem] gap-4 border-b border-fg/10 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted md:grid">
        <span className="w-5" />
        <span>Task</span>
        <span>Priority</span>
        <span>Due</span>
        <span>Status</span>
      </div>
      <ul>
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <motion.li key={task.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 20 }} className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-fg/[0.06] px-5 py-3 transition last:border-0 hover:bg-fg/[0.03] md:grid-cols-[auto_1fr_8rem_9rem_6rem]" onClick={() => onOpen(task)}>
              <CheckButton done={task.status === 'done'} onClick={() => onToggle(task)} />
              <div className="min-w-0">
                <p className={`truncate text-sm font-medium ${task.status === 'done' ? 'text-muted line-through' : ''}`}>{task.title}</p>
                {task.tags?.length > 0 && <p className="truncate text-xs text-lilac">{task.tags.map((t) => `#${t}`).join(' ')}</p>}
              </div>
              <span className="md:hidden"><PriorityBadge priority={task.priority} compact /></span>
              <span className="hidden md:block"><PriorityBadge priority={task.priority} /></span>
              <span className="hidden md:block">{task.status !== 'done' ? <DueChip dueAt={task.dueAt} /> : <span className="text-xs text-muted">—</span>}</span>
              <span className="hidden items-center gap-1.5 text-xs text-muted md:flex">
                <span className={`h-2 w-2 rounded-full ${STATUS_META[task.status].dot}`} /> {STATUS_META[task.status].label}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
        {tasks.length === 0 && <li className="px-5 py-14 text-center text-sm text-muted">No tasks match these filters.</li>}
      </ul>
    </div>
  );
}

export default function Tasks() {
  const { tasks, updateTask, toggleDone, prioritize, teamId, members, canEdit, currentTeam, online } = useWorkspace();
  const { user } = useAuth();
  const { openTaskModal } = useAppUi();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('all');
  const [tag, setTag] = useState('all');
  const [assignee, setAssignee] = useState('all');
  const [sort, setSort] = useState('smart');
  const [view, setView] = useState('board');
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);
  const [prioritizing, setPrioritizing] = useState(false);
  const [now] = useState(() => new Date());

  const allTags = useMemo(() => [...new Set(tasks.flatMap((t) => t.tags || []))].sort(), [tasks]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchesAssignee = (t) => assignee === 'all' || (assignee === 'me' ? t.assigneeId === user.id : assignee === 'none' ? !t.assigneeId : t.assigneeId === assignee);
    return tasks
      .filter((t) => (priority === 'all' || t.priority === priority) && (tag === 'all' || t.tags?.includes(tag)) && matchesAssignee(t))
      .filter((t) => !q || t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.tags?.some((x) => x.includes(q)))
      .sort((a, b) => SORTS[sort].fn(a, b, now));
  }, [tasks, query, priority, tag, assignee, sort, now, user.id]);

  const onDropTask = (id, status) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    updateTask(id, { status })
      .then(() => status === 'done' && toast.success(`“${task.title}” landed 🎉`))
      .catch(() => {});
  };

  const runPrioritize = async () => {
    setPrioritizing(true);
    try {
      const res = await prioritize();
      toast.ai(res.summary, { title: res.updates.length ? `${res.updates.length} priorities updated` : 'Priorities look good' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPrioritizing(false);
    }
  };

  const filtersActive = query || priority !== 'all' || tag !== 'all' || assignee !== 'all';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{currentTeam ? `${currentTeam.name} board` : 'Tasks'}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            {tasks.filter((t) => t.status !== 'done').length} open · {tasks.filter((t) => t.status === 'done').length} completed
            {canEdit && ' · drag cards between columns'}
            {teamId && (
              <span className="flex items-center -space-x-1.5">
                {members.filter((m) => online.includes(m.id)).slice(0, 5).map((m) => (
                  <Avatar key={m.id} name={m.name} id={m.id} size="h-6 w-6 text-[9px] ring-2 ring-bg" />
                ))}
                <span className="pl-3 text-xs">{online.length} online now</span>
              </span>
            )}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="ai" onClick={runPrioritize} loading={prioritizing}>
              <SparklesIcon className="h-4 w-4" /> AI prioritize
            </Button>
            <Button onClick={() => openTaskModal()}>
              <PlusIcon className="h-4 w-4" /> New task
            </Button>
          </div>
        )}
      </div>

      {canEdit ? <QuickAddBar /> : <p className="rounded-xl border border-fg/10 bg-fg/[0.03] px-4 py-3 text-sm text-muted">You’re a viewer on this team — you can browse the board and comment on tasks.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, notes or tags" className="input pl-9" aria-label="Search tasks" />
        </div>
        <div className="flex items-center gap-2">
          <AdjustmentsHorizontalIcon className="hidden h-5 w-5 text-muted sm:block" />
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input w-auto py-2" aria-label="Filter by priority">
            <option value="all">All priorities</option>
            {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
          </select>
          <select value={tag} onChange={(e) => setTag(e.target.value)} className="input w-auto py-2" aria-label="Filter by tag">
            <option value="all">All tags</option>
            {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
          </select>
          {teamId && (
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="input w-auto py-2" aria-label="Filter by assignee">
              <option value="all">Everyone</option>
              <option value="me">Assigned to me</option>
              <option value="none">Unassigned</option>
              {members.filter((m) => m.id !== user.id && m.role !== 'viewer').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-auto py-2" aria-label="Sort tasks">
            {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex rounded-xl border border-fg/10 bg-surface/60 p-1">
          {[['board', Squares2X2Icon], ['list', ListBulletIcon]].map(([key, Icon]) => (
            <button key={key} onClick={() => setView(key)} className={`relative rounded-lg p-2 transition ${view === key ? 'text-fg' : 'text-muted hover:text-fg'}`} aria-label={`${key} view`}>
              {view === key && <motion.span layoutId="view-toggle" className="absolute inset-0 rounded-lg bg-accent/15" />}
              <Icon className="relative h-4 w-4" />
            </button>
          ))}
        </div>
        {filtersActive && (
          <button onClick={() => { setQuery(''); setPriority('all'); setTag('all'); setAssignee('all'); }} className="text-xs font-semibold text-accent hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {view === 'board' ? (
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {COLUMNS.map((column) => (
            <Column
              key={column.status}
              column={column}
              tasks={visible.filter((t) => t.status === column.status)}
              dragId={dragId}
              setDragId={setDragId}
              over={over}
              setOver={setOver}
              onDropTask={onDropTask}
              onOpen={openTaskModal}
              onToggle={toggleDone}
              draggable={canEdit}
            />
          ))}
        </div>
      ) : (
        <ListView tasks={visible} onOpen={openTaskModal} onToggle={toggleDone} />
      )}
    </div>
  );
}
