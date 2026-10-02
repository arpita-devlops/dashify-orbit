import { ArrowDownTrayIcon, BellAlertIcon, CircleStackIcon, GlobeAltIcon, MoonIcon, SparklesIcon, SunIcon, TrashIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ALL_TIME_ZONES, browserTimeZone, tzShortOffset } from '../../lib/timezones';

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="card grid gap-6 p-6 md:grid-cols-[16rem_1fr]">
      <div>
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <Icon className="h-5 w-5 text-accent" /> {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

export default function Settings() {
  const { user, updateProfile, api, mode, aiEngine, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { tasks, sessions } = useWorkspace();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [work, setWork] = useState({ timezone: user?.timezone || browserTimeZone(), workStart: user?.workStart || '09:00', workEnd: user?.workEnd || '18:00' });
  const [savingWork, setSavingWork] = useState(false);
  const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));

  const saveWork = async (e) => {
    e.preventDefault();
    setSavingWork(true);
    try {
      await updateProfile(work);
      toast.success('Working hours updated — your team sees the change live');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingWork(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const requestNotifications = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') new Notification('Dashify notifications enabled', { body: 'You’ll be reminded right on time.' });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), user, tasks, sessions }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `dashify-export-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetDemo = () => {
    api.resetDemo();
    logout();
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">Tune Dashify to the way you work.</p>
      </div>

      <Section icon={UserCircleIcon} title="Profile" description="How you appear across your workspace.">
        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-name" className="label">Name</label>
            <input id="settings-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </div>
          <div>
            <label htmlFor="settings-email" className="label">Email</label>
            <input id="settings-email" className="input opacity-70" value={user?.email ?? ''} readOnly />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" loading={saving} disabled={!name.trim() || name === user?.name}>Save profile</Button>
          </div>
        </form>
      </Section>

      <Section icon={GlobeAltIcon} title="Time zone & hours" description="Teammates see your local time and when you’re available.">
        <form onSubmit={saveWork} className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label htmlFor="settings-tz" className="label">Time zone</label>
            <select id="settings-tz" className="input" value={work.timezone} onChange={(e) => setWork((w) => ({ ...w, timezone: e.target.value }))}>
              {[...new Set([work.timezone, ...ALL_TIME_ZONES])].map((tz) => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')} ({tzShortOffset(tz)})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="settings-start" className="label">Workday starts</label>
            <input id="settings-start" type="time" className="input" value={work.workStart} onChange={(e) => setWork((w) => ({ ...w, workStart: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="settings-end" className="label">Workday ends</label>
            <input id="settings-end" type="time" className="input" value={work.workEnd} onChange={(e) => setWork((w) => ({ ...w, workEnd: e.target.value }))} />
          </div>
          <div className="flex items-end">
            <Button type="submit" loading={savingWork} className="w-full">Save hours</Button>
          </div>
        </form>
      </Section>

      <Section icon={theme === 'dark' ? MoonIcon : SunIcon} title="Appearance" description="Dashify adapts to day and night.">
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          {[['dark', 'Midnight', MoonIcon, 'bg-[#080a13]'], ['light', 'Daylight', SunIcon, 'bg-[#f6f4ef]']].map(([value, label, Icon, swatch]) => (
            <button key={value} onClick={() => setTheme(value)} className={`overflow-hidden rounded-xl border-2 text-left transition ${theme === value ? 'border-accent shadow-glow' : 'border-fg/10 hover:border-fg/25'}`}>
              <div className={`relative h-20 ${swatch}`}>
                <span className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#ffb547] to-[#ff6b6b]" />
                <span className="absolute left-1/2 top-1/2 h-14 w-24 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-[50%] border border-[#6c8cff]/70" />
              </div>
              <p className="flex items-center gap-2 px-3 py-2 text-sm font-semibold"><Icon className="h-4 w-4" /> {label}</p>
            </button>
          ))}
        </div>
      </Section>

      <Section icon={BellAlertIcon} title="Notifications" description="Native reminders when a task’s reminder time arrives.">
        {permission === 'unsupported' ? (
          <p className="text-sm text-muted">Your browser doesn’t support notifications — in-app reminders still work.</p>
        ) : permission === 'granted' ? (
          <p className="inline-flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/10 px-3 py-2 text-sm font-medium text-mint">Notifications are enabled</p>
        ) : permission === 'denied' ? (
          <p className="text-sm text-muted">Notifications are blocked. Enable them from your browser’s site settings.</p>
        ) : (
          <Button variant="secondary" onClick={requestNotifications}><BellAlertIcon className="h-4 w-4" /> Enable notifications</Button>
        )}
      </Section>

      <Section icon={CircleStackIcon} title="Data & AI" description="Where your data lives and which engine plans your day.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-fg/10 bg-elevated/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Backend</p>
            <p className="mt-1 font-semibold">{mode === 'live' ? 'Express API + MongoDB' : 'Browser demo storage'}</p>
            <p className="mt-1 text-xs text-muted">{mode === 'live' ? 'Authenticated with a JWT; data is isolated per user.' : 'No server detected, so data stays in this browser.'}</p>
          </div>
          <div className="rounded-xl border border-fg/10 bg-elevated/60 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted"><SparklesIcon className="h-3.5 w-3.5" /> AI engine</p>
            <p className="mt-1 font-semibold">{aiEngine === 'openai' ? 'OpenAI (GPT)' : 'Smart heuristic planner'}</p>
            <p className="mt-1 text-xs text-muted">{aiEngine === 'openai' ? 'Plans are generated by an LLM and validated server-side.' : 'Add OPENAI_API_KEY on the server to enable LLM planning.'}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportData}><ArrowDownTrayIcon className="h-4 w-4" /> Export my data (JSON)</Button>
          {mode === 'demo' && <Button variant="danger" onClick={resetDemo}><TrashIcon className="h-4 w-4" /> Reset demo data</Button>}
        </div>
      </Section>

      <Section icon={SparklesIcon} title="Shortcuts" description="Move at the speed of thought.">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {[[['Ctrl', 'K'], 'Command palette & quick add'], [['N'], 'New task'], [['Space'], 'Start / pause focus timer'], [['Esc'], 'Close dialogs']].map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between rounded-xl border border-fg/10 bg-elevated/50 px-3 py-2">
              <span className="text-muted">{label}</span>
              <span className="flex gap-1">{keys.map((k) => <kbd key={k} className="kbd">{k}</kbd>)}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
