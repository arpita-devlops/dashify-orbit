import { BellIcon, CheckIcon, ClockIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PRIORITY_META, minutesLabel } from '../../lib/format';
import { DueChip } from '../ui/Primitives';
import Avatar from './Avatar';

export function CheckButton({ done, onClick, size = 'h-5 w-5' }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.8 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`grid shrink-0 place-items-center rounded-full border-2 transition ${size} ${done ? 'border-mint bg-mint text-[#062b1d]' : 'border-fg/25 hover:border-mint'}`}
      aria-label={done ? 'Mark as not done' : 'Mark as done'}
    >
      {done && (
        <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}>
          <CheckIcon className="h-3 w-3 stroke-[3]" />
        </motion.span>
      )}
    </motion.button>
  );
}

export default function TaskCard({ task, onOpen, onToggle, dragHandlers, dragging = false }) {
  const { members, canEdit } = useWorkspace();
  const meta = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
  const done = task.status === 'done';
  const assignee = task.assigneeId ? members.find((m) => m.id === task.assigneeId) : null;

  return (
    <div
      {...dragHandlers}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(task)}
      role="button"
      tabIndex={0}
      className={`group relative cursor-pointer overflow-hidden rounded-xl border border-fg/10 bg-surface p-3.5 pl-4 shadow-soft outline-none transition duration-200 hover:-translate-y-0.5 hover:border-fg/20 focus-visible:ring-4 focus-visible:ring-accent/20 ${dragging ? 'rotate-2 scale-[1.03] opacity-60' : ''}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${meta.bar}`} />
      <div className="flex items-start gap-2.5">
        <CheckButton done={done} onClick={() => canEdit && onToggle(task)} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold leading-snug ${done ? 'text-muted line-through' : ''}`}>{task.title}</p>
          {task.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{task.description}</p>}
        </div>
        {task.aiReason && (
          <span title={task.aiReason} className="text-lilac">
            <SparklesIcon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-7">
        {!done && <DueChip dueAt={task.dueAt} />}
        {task.tags?.slice(0, 2).map((t) => (
          <span key={t} className="rounded-md bg-lilac/10 px-1.5 py-0.5 text-[10px] font-medium text-lilac">#{t}</span>
        ))}
        <span className="ml-auto flex items-center gap-2 text-[11px] text-muted">
          {task.remindAt && !task.reminded && !done && <BellIcon className="h-3.5 w-3.5 text-accent" title="Reminder set" />}
          <span className="flex items-center gap-0.5"><ClockIcon className="h-3.5 w-3.5" /> {minutesLabel(task.estimateMins ?? 45)}</span>
          {assignee && <Avatar name={assignee.name} id={assignee.id} size="h-5 w-5 text-[8px]" />}
        </span>
      </div>
    </div>
  );
}
