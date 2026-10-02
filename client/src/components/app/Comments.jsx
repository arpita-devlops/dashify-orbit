import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { timeAgo } from '../../lib/format';
import Avatar from './Avatar';

const firstName = (name = '') => name.split(/\s+/)[0];

function CommentBody({ body, names }) {
  const parts = body.split(/(@[\p{L}\d_-]+)/u);
  return (
    <p className="whitespace-pre-wrap break-words text-sm">
      {parts.map((part, i) =>
        part.startsWith('@') && names.has(part.slice(1).toLowerCase()) ? (
          <span key={i} className="rounded bg-accent/15 px-1 font-semibold text-accent">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

export default function Comments({ task }) {
  const { api, user } = useAuth();
  const { members } = useWorkspace();
  const toast = useToast();
  const [comments, setComments] = useState(null);
  const [text, setText] = useState('');
  const [mention, setMention] = useState(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const names = useMemo(() => new Set(members.flatMap((m) => [m.name.toLowerCase(), firstName(m.name).toLowerCase()])), [members]);
  const suggestions = mention === null ? [] : members.filter((m) => m.id !== user.id && m.name.toLowerCase().includes(mention)).slice(0, 5);

  useEffect(() => {
    let alive = true;
    api.comments.list(task.id).then((list) => alive && setComments(list)).catch((err) => {
      toast.error(err.message);
      if (alive) setComments([]);
    });
    const onComment = (e) => {
      if (e.detail.taskId !== task.id) return;
      setComments((list) => (list && !list.some((c) => c.id === e.detail.id) ? [...list, e.detail] : list));
    };
    window.addEventListener('dashify:comment', onComment);
    return () => {
      alive = false;
      window.removeEventListener('dashify:comment', onComment);
    };
  }, [api, task.id, toast]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [comments?.length]);

  const onChange = (e) => {
    const value = e.target.value;
    setText(value);
    const match = value.slice(0, e.target.selectionStart).match(/@([\p{L}]*)$/u);
    setMention(match ? match[1].toLowerCase() : null);
  };

  const insertMention = (member) => {
    const caret = inputRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@([\p{L}]*)$/u, `@${firstName(member.name)} `);
    setText(before + text.slice(caret));
    setMention(null);
    inputRef.current?.focus();
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const comment = await api.comments.create(task.id, body);
      setComments((list) => (list?.some((c) => c.id === comment.id) ? list : [...(list || []), comment]));
      setText('');
      setMention(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mt-6 border-t border-fg/10 pt-5">
      <h3 className="label">Discussion {comments?.length ? `· ${comments.length}` : ''}</h3>
      <div ref={listRef} className="max-h-64 space-y-3 overflow-y-auto pr-1">
        {comments === null && <div className="h-12 animate-pulse rounded-xl bg-fg/[0.05]" />}
        {comments?.length === 0 && <p className="py-3 text-sm text-muted">No comments yet. Mention a teammate with @ to loop them in.</p>}
        <AnimatePresence initial={false}>
          {comments?.map((c) => {
            const mine = c.authorId === user.id;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2.5 ${mine ? 'flex-row-reverse text-right' : ''}`}>
                <Avatar name={c.authorName} id={c.authorId} size="h-7 w-7 text-[10px]" />
                <div className={`max-w-[85%] rounded-2xl border px-3 py-2 text-left ${mine ? 'border-accent/25 bg-accent/10' : 'border-fg/10 bg-elevated/70'}`}>
                  <p className="mb-0.5 text-[11px] text-muted">
                    <span className="font-semibold text-fg">{mine ? 'You' : c.authorName}</span> · {timeAgo(c.createdAt)}
                  </p>
                  <CommentBody body={c.body} names={names} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <form onSubmit={submit} className="relative mt-3">
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.ul initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card absolute bottom-full z-10 mb-2 w-64 bg-surface p-1">
              {suggestions.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => insertMention(m)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-fg/5">
                    <Avatar name={m.name} id={m.id} size="h-6 w-6 text-[9px]" /> {m.name}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-2 rounded-xl border border-fg/10 bg-elevated px-2 py-1.5 focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/15">
          <input
            ref={inputRef}
            value={text}
            onChange={onChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && suggestions.length) {
                e.preventDefault();
                insertMention(suggestions[0]);
              } else if (e.key === 'Escape' && mention !== null) {
                e.stopPropagation();
                setMention(null);
              }
            }}
            maxLength={1000}
            placeholder="Write a comment… use @ to mention"
            className="min-w-0 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted/70"
            aria-label="Write a comment"
          />
          <button type="submit" disabled={!text.trim() || sending} className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-[#1a1206] transition disabled:opacity-40" aria-label="Send comment">
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
}
