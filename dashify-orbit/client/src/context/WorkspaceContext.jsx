import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const WorkspaceContext = createContext(null);
const EDITABLE = ['title', 'description', 'status', 'priority', 'tags', 'dueAt', 'remindAt', 'estimateMins'];
const PERSONAL = 'personal';

const upsert = (list, task) => (list.some((t) => t.id === task.id) ? list.map((t) => (t.id === task.id ? task : t)) : [task, ...list]);

export function WorkspaceProvider({ children }) {
  const { api, user } = useAuth();
  const toast = useToast();
  const scopeKey = `dashify:scope:${user.id}`;

  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState(() => localStorage.getItem(scopeKey) || null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [presence, setPresence] = useState({});
  const [connection, setConnection] = useState('connecting');
  const [booting, setBooting] = useState(true);
  const [loadedScope, setLoadedScope] = useState(null);
  const [plans, setPlans] = useState({});
  const [standups, setStandups] = useState({});

  const activeTeamId = !booting && teamId && teams.some((t) => t.id === teamId) ? teamId : null;
  const scopeId = activeTeamId ?? PERSONAL;

  const tasksRef = useRef(tasks);
  const scopeRef = useRef(activeTeamId);
  const handlerRef = useRef(null);
  useEffect(() => {
    tasksRef.current = tasks;
    scopeRef.current = activeTeamId;
  }, [tasks, activeTeamId]);

  const refreshTeams = useCallback(async () => {
    try {
      setTeams(await api.teams.list());
    } catch (err) {
      toast.error(err.message);
    }
  }, [api, toast]);

  const reloadTeamInfo = useCallback(async () => {
    const id = scopeRef.current;
    if (!id) return;
    try {
      setTeamInfo(await api.teams.get(id));
    } catch {
      // membership may have just been revoked — the realtime handler moves us to personal scope
    }
  }, [api]);

  const switchScope = useCallback((id) => {
    setTeamId(id);
    if (id) localStorage.setItem(scopeKey, id);
    else localStorage.removeItem(scopeKey);
  }, [scopeKey]);

  // Boot: teams + personal focus sessions.
  useEffect(() => {
    let alive = true;
    Promise.all([api.teams.list(), api.focus.list()])
      .then(([teamList, sessionList]) => {
        if (!alive) return;
        setTeams(teamList);
        setSessions(sessionList);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => alive && setBooting(false));
    return () => {
      alive = false;
    };
  }, [api, user.id, toast]);

  // Scope data: tasks, plus members + activity for teams.
  useEffect(() => {
    if (booting) return;
    let alive = true;
    const requests = [api.tasks.list({ teamId: activeTeamId })];
    if (activeTeamId) requests.push(api.teams.get(activeTeamId), api.teams.activity(activeTeamId));
    Promise.all(requests)
      .then(([taskList, info = null, feed = []]) => {
        if (!alive) return;
        setTasks(taskList);
        setTeamInfo(info);
        setActivity(feed);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => alive && setLoadedScope(activeTeamId ?? PERSONAL));
    return () => {
      alive = false;
    };
  }, [api, booting, activeTeamId, toast]);

  // Realtime: the latest handler is kept in a ref so the socket connects only once per session.
  useEffect(() => {
    handlerRef.current = (event) => {
      const current = scopeRef.current;
      switch (event.type) {
        case 'connection':
          setConnection(event.status);
          return;
        case 'presence':
          setPresence((p) => ({ ...p, [event.teamId]: event.online }));
          return;
        case 'mention':
        case 'assigned':
          if (event.userId !== user.id) return;
          toast.show({
            tone: 'ai',
            title: event.type === 'mention' ? `${event.by} mentioned you` : `${event.by} assigned you a task`,
            message: `“${event.title}”`,
            duration: 9000,
            action: event.teamId !== current ? { label: 'View', onClick: () => switchScope(event.teamId) } : undefined,
          });
          return;
        case 'team:removed':
        case 'team:deleted':
          if (event.type === 'team:removed' && event.userId !== user.id) return;
          refreshTeams();
          if (event.teamId === current) {
            switchScope(null);
            toast.info(event.type === 'team:deleted' ? 'This team was deleted' : 'You were removed from this team');
          }
          return;
        default:
          break;
      }

      if (event.teamId !== current) {
        if (event.type === 'members:changed') refreshTeams();
        return;
      }
      if (event.type === 'task:upsert') setTasks((list) => upsert(list, event.task));
      else if (event.type === 'task:delete') setTasks((list) => list.filter((t) => t.id !== event.taskId));
      else if (event.type === 'activity') setActivity((list) => (list.some((a) => a.id === event.activity.id) ? list : [event.activity, ...list].slice(0, 80)));
      else if (event.type === 'comment:new') window.dispatchEvent(new CustomEvent('dashify:comment', { detail: event.comment }));
      else if (event.type === 'members:changed') {
        reloadTeamInfo();
        refreshTeams();
      }
    };
  });

  useEffect(() => api.realtime.connect((event) => handlerRef.current?.(event)), [api, user.id]);

  const createTask = useCallback(async (input) => {
    const task = await api.tasks.create({ ...input, ...(scopeRef.current && { team: scopeRef.current }) });
    setTasks((list) => upsert(list, task));
    return task;
  }, [api]);

  const updateTask = useCallback(async (id, patch) => {
    const previous = tasksRef.current;
    // Optimistic update so drag & drop and checkboxes feel instant.
    setTasks((list) =>
      list.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch };
        if ('assignee' in patch) next.assigneeId = patch.assignee || null;
        if ('status' in patch && patch.status !== t.status) next.completedAt = patch.status === 'done' ? new Date().toISOString() : null;
        return next;
      }),
    );
    try {
      const saved = await api.tasks.update(id, patch);
      setTasks((list) => list.map((t) => (t.id === id ? saved : t)));
      return saved;
    } catch (err) {
      setTasks(previous);
      toast.error(err.message);
      throw err;
    }
  }, [api, toast]);

  const deleteTask = useCallback(async (id) => {
    const previous = tasksRef.current;
    const removed = previous.find((t) => t.id === id);
    setTasks((list) => list.filter((t) => t.id !== id));
    try {
      await api.tasks.remove(id);
      toast.show({
        message: `“${removed?.title ?? 'Task'}” deleted`,
        action: removed && {
          label: 'Undo',
          onClick: () => createTask({ ...Object.fromEntries(EDITABLE.filter((k) => k in removed).map((k) => [k, removed[k]])), ...(removed.assigneeId && { assignee: removed.assigneeId }) }),
        },
      });
    } catch (err) {
      setTasks(previous);
      toast.error(err.message);
    }
  }, [api, toast, createTask]);

  const toggleDone = useCallback((task) => updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' }), [updateTask]);

  const logFocus = useCallback(async (input) => {
    const session = await api.focus.create(input);
    setSessions((list) => [session, ...list]);
    return session;
  }, [api]);

  const generatePlan = useCallback(async (input) => {
    const scope = scopeRef.current ?? PERSONAL;
    const result = await api.ai.plan({ ...input, ...(scopeRef.current && { team: scopeRef.current }) });
    setPlans((p) => ({ ...p, [scope]: { ...result, input, createdAt: new Date().toISOString() } }));
    return result;
  }, [api]);

  const prioritize = useCallback(async () => {
    const result = await api.ai.prioritize(scopeRef.current ? { team: scopeRef.current } : {});
    setTasks(result.tasks);
    return result;
  }, [api]);

  // ---- Team actions ----
  const createTeam = useCallback(async (name) => {
    const team = await api.teams.create(name);
    setTeams((list) => [...list, team]);
    switchScope(team.id);
    return team;
  }, [api, switchScope]);

  const joinTeam = useCallback(async (code) => {
    const team = await api.teams.join(code);
    setTeams((list) => [...list, team]);
    switchScope(team.id);
    return team;
  }, [api, switchScope]);

  const renameTeam = useCallback(async (name) => {
    await api.teams.rename(scopeRef.current, name);
    await Promise.all([reloadTeamInfo(), refreshTeams()]);
  }, [api, reloadTeamInfo, refreshTeams]);

  const regenerateCode = useCallback(async () => {
    await api.teams.regenerateCode(scopeRef.current);
    await reloadTeamInfo();
  }, [api, reloadTeamInfo]);

  const setMemberRole = useCallback(async (userId, role) => {
    await api.teams.setRole(scopeRef.current, userId, role);
    await reloadTeamInfo();
  }, [api, reloadTeamInfo]);

  const removeMember = useCallback(async (userId) => {
    await api.teams.removeMember(scopeRef.current, userId);
    await reloadTeamInfo();
  }, [api, reloadTeamInfo]);

  const leaveTeam = useCallback(async () => {
    await api.teams.removeMember(scopeRef.current, user.id);
    switchScope(null);
    await refreshTeams();
  }, [api, user.id, switchScope, refreshTeams]);

  const deleteTeam = useCallback(async () => {
    await api.teams.remove(scopeRef.current);
    switchScope(null);
    await refreshTeams();
  }, [api, switchScope, refreshTeams]);

  const generateStandup = useCallback(async () => {
    const id = scopeRef.current;
    const result = await api.teams.standup(id);
    setStandups((s) => ({ ...s, [id]: result }));
    return result;
  }, [api]);

  // Reminder engine: personal tasks, or team tasks assigned to me.
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      tasksRef.current
        .filter((t) => t.remindAt && !t.reminded && t.status !== 'done' && (!t.teamId || t.assigneeId === user.id) && new Date(t.remindAt).getTime() <= now)
        .forEach((task) => {
          toast.show({ title: 'Reminder', message: task.title, tone: 'ai', duration: 9000 });
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Dashify reminder', { body: task.title, icon: './favicon.svg', tag: task.id });
          }
          updateTask(task.id, { reminded: true }).catch(() => {});
        });
    };
    const first = setTimeout(check, 1500);
    const timer = setInterval(check, 20_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [toast, updateTask, user.id]);

  const role = activeTeamId ? teamInfo?.role ?? 'viewer' : 'owner';
  const value = useMemo(
    () => ({
      tasks, sessions, plan: plans[scopeId] ?? null,
      loading: booting || loadedScope !== scopeId,
      teams, teamId: activeTeamId, currentTeam: teams.find((t) => t.id === activeTeamId) ?? null,
      teamInfo, members: teamInfo?.members ?? [], role, canEdit: role !== 'viewer',
      activity, online: presence[activeTeamId] ?? [], connection, standup: standups[activeTeamId] ?? null,
      switchScope, createTask, updateTask, deleteTask, toggleDone, logFocus, generatePlan, prioritize,
      createTeam, joinTeam, renameTeam, regenerateCode, setMemberRole, removeMember, leaveTeam, deleteTeam, generateStandup,
    }),
    [tasks, sessions, plans, scopeId, booting, loadedScope, teams, activeTeamId, teamInfo, role, activity, presence, connection, standups,
      switchScope, createTask, updateTask, deleteTask, toggleDone, logFocus, generatePlan, prioritize,
      createTeam, joinTeam, renameTeam, regenerateCode, setMemberRole, removeMember, leaveTeam, deleteTeam, generateStandup],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export const useWorkspace = () => useContext(WorkspaceContext);
