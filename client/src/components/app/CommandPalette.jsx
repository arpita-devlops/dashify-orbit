import {
  ArrowRightIcon,
  BoltIcon,
  Cog6ToothIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PlusIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppUi } from '../../context/AppUiContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PRIORITY_META, dueLabel, minutesLabel } from '../../lib/format';
import { parseQuickAdd } from '../../lib/quickAdd';

function PaletteBody({ onClose }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { tasks, createTask, prioritize } = useWorkspace();
  const { openTaskModal } = useAppUi();
  const { toggle } = useTheme();
  const toast = useToast();

  const parsed = useMemo(() => parseQuickAdd(query), [query]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const go = (path) => () => navigate(path);
    const commands = [
      { id: 'nav-overview', group: 'Navigate', label: 'Go to Overview', icon: HomeIcon, run: go('/app') },
      { id: 'nav-tasks', group: 'Navigate', label: 'Go to Tasks board', icon: Squares2X2Icon, run: go('/app/tasks') },
      { id: 'nav-team', group: 'Navigate', label: 'Open Team hub', icon: UserGroupIcon, run: go('/app/team') },
      { id: 'nav-focus', group: 'Navigate', label: 'Start a focus session', icon: BoltIcon, run: go('/app/focus') },
      { id: 'nav-settings', group: 'Navigate', label: 'Open Settings', icon: Cog6ToothIcon, run: go('/app/settings') },
      {
        id: 'ai-prioritize', group: 'AI', label: 'AI: re-prioritize my tasks', icon: SparklesIcon,
        run: async () => {
          try {
            const res = await prioritize();
            toast.ai(res.summary, { title: 'Priorities updated' });
          } catch (err) {
            toast.error(err.message);
          }
        },
      },
      { id: 'ai-plan', group: 'AI', label: 'AI: plan my day', icon: SparklesIcon, run: go('/app') },
      { id: 'new-task', group: 'Create', label: 'New task with details…', icon: PlusIcon, run: () => openTaskModal() },
      { id: 'theme', group: 'Preferences', label: 'Toggle light / dark theme', icon: MoonIcon, run: toggle },
    ].filter((c) => !q || c.label.toLowerCase().includes(q));

    const matches = q
      ? tasks
          .filter((t) => t.title.toLowerCase().includes(q) || t.tags?.some((tag) => tag.includes(q)))
          .slice(0, 6)
          .map((t) => ({ id: `task-${t.id}`, group: 'Tasks', label: t.title, task: t, icon: ArrowRightIcon, run: () => openTaskModal(t) }))
      : [];

    const create = parsed.title
      ? [{
          id: 'quick-create', group: 'Quick add', label: `Create “${parsed.title}”`, icon: PlusIcon, preview: parsed,
          run: async () => {
            try {
              await createTask({ title: parsed.title, tags: parsed.tags, ...(parsed.priority && { priority: parsed.priority }), ...(parsed.dueAt && { dueAt: parsed.dueAt }), ...(parsed.estimateMins && { estimateMins: parsed.estimateMins }) });
              toast.success(`Added “${parsed.title}”`);
            } catch (err) {
              toast.error(err.message);
            }
          },
        }]
      : [];

    return [...create, ...matches, ...commands];
  }, [query, parsed, tasks, navigate, openTaskModal, prioritize, toggle, toast, createTask]);

  const select = (item) => {
    onClose();
    item?.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(items.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % Math.max(items.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(items[active]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  let lastGroup = null;
  return (
    <>
      <div className="flex items-center gap-3 border-b border-fg/10 px-4">
        <MagnifyingGlassIcon className="h-5 w-5 text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search, jump, or type a task: “gym tomorrow 7am #health !high”"
          className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted/70"
          aria-label="Command palette"
        />
        <kbd className="kbd">Esc</kbd>
      </div>
      <ul className="max-h-[60vh] overflow-y-auto p-2" role="listbox">
        {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">No matches — keep typing to create a task.</li>}
        {items.map((item, i) => {
          const header = item.group !== lastGroup ? item.group : null;
          lastGroup = item.group;
          const due = item.preview && dueLabel(item.preview.dueAt);
          return (
            <li key={item.id}>
              {header && <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">{header}</p>}
              <button
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => select(item)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${i === active ? 'bg-accent/10 text-fg' : 'text-fg/80'}`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${i === active ? 'text-accent' : 'text-muted'}`} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.task && <span className={`h-2 w-2 rounded-full ${PRIORITY_META[item.task.priority].dot}`} />}
                {item.preview && (
                  <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
                    {due && <span className="chip text-ion">{due.text}</span>}
                    {item.preview.priority && <span className={`chip ${PRIORITY_META[item.preview.priority].text}`}>{PRIORITY_META[item.preview.priority].label}</span>}
                    {item.preview.tags.map((t) => <span key={t} className="chip text-lilac">#{t}</span>)}
                    {item.preview.estimateMins && <span className="chip text-mint">{minutesLabel(item.preview.estimateMins)}</span>}
                  </span>
                )}
                {i === active && <kbd className="kbd hidden sm:inline">↵</kbd>}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-4 border-t border-fg/10 px-4 py-2.5 text-[11px] text-muted">
        <span><kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> navigate</span>
        <span><kbd className="kbd">↵</kbd> select</span>
        <span className="ml-auto hidden sm:inline">Syntax: <span className="font-mono">#tag !high ~30m tomorrow 5pm</span></span>
      </div>
    </>
  );
}

export default function CommandPalette({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[95] flex items-start justify-center px-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="card relative w-full max-w-2xl overflow-hidden bg-surface"
          >
            <PaletteBody onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
