import { ArrowLeftIcon, EyeIcon, EyeSlashIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { browserTimeZone } from '../lib/timezones';

const OrbitScene = lazy(() => import('../components/three/OrbitScene'));

function strength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}
const STRENGTH = [
  ['Too short', 'bg-coral'],
  ['Weak', 'bg-coral'],
  ['Fair', 'bg-accent'],
  ['Good', 'bg-ion'],
  ['Strong', 'bg-mint'],
];

export default function Auth({ mode }) {
  const isRegister = mode === 'register';
  const { login, register, loginDemo, mode: apiMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const destination = location.state?.from || '/app';
  const level = strength(form.password);
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const run = async (kind, action) => {
    setError('');
    setBusy(kind);
    try {
      await action();
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (isRegister && form.password.length < 8) return setError('Password must be at least 8 characters');
    run('submit', () => (isRegister ? register({ ...form, timezone: browserTimeZone() }) : login({ email: form.email, password: form.password })));
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="relative flex flex-col px-6 py-6 sm:px-12">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-fg">
            <ArrowLeftIcon className="h-4 w-4" /> Home
          </Link>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <Logo />
          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <h1 className="mt-8 font-display text-3xl font-bold tracking-tight">{isRegister ? 'Create your workspace' : 'Welcome back'}</h1>
              <p className="mt-2 text-sm text-muted">{isRegister ? 'Start planning smarter in under a minute.' : 'Sign in to pick up where you left off.'}</p>

              <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
                {isRegister && (
                  <div>
                    <label htmlFor="name" className="label">Name</label>
                    <input id="name" className="input" autoComplete="name" value={form.name} onChange={update('name')} maxLength={60} required placeholder="Ada Lovelace" />
                  </div>
                )}
                <div>
                  <label htmlFor="email" className="label">Email</label>
                  <input id="email" type="email" className="input" autoComplete="email" value={form.email} onChange={update('email')} maxLength={120} required placeholder="you@example.com" />
                </div>
                <div>
                  <label htmlFor="password" className="label">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="input pr-11"
                      autoComplete={isRegister ? 'new-password' : 'current-password'}
                      value={form.password}
                      onChange={update('password')}
                      maxLength={128}
                      required
                      placeholder={isRegister ? 'At least 8 characters' : '••••••••'}
                    />
                    <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-fg" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                  {isRegister && form.password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex flex-1 gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < level ? STRENGTH[level][1] : 'bg-fg/10'}`} />
                        ))}
                      </div>
                      <span className="text-[11px] text-muted">{STRENGTH[level][0]}</span>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral" role="alert">
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <Button type="submit" size="lg" className="w-full" loading={busy === 'submit'}>
                  {isRegister ? 'Create account' : 'Sign in'}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted">
                <span className="h-px flex-1 bg-fg/10" /> or <span className="h-px flex-1 bg-fg/10" />
              </div>

              <Button variant="secondary" size="lg" className="w-full" loading={busy === 'demo'} onClick={() => run('demo', loginDemo)}>
                <RocketLaunchIcon className="h-5 w-5 text-accent" /> Explore the demo workspace
              </Button>

              <p className="mt-8 text-center text-sm text-muted">
                {isRegister ? 'Already have an account?' : 'New to Dashify?'}{' '}
                <Link to={isRegister ? '/login' : '/register'} className="font-semibold text-accent hover:underline">
                  {isRegister ? 'Sign in' : 'Create one'}
                </Link>
              </p>
              {apiMode === 'demo' && (
                <p className="mt-4 text-center text-[11px] text-muted/80">Running in browser demo mode — accounts are stored locally on this device.</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="relative hidden overflow-hidden border-l border-fg/10 bg-surface/50 lg:block">
        <div className="bg-grid mask-fade absolute inset-0 opacity-50" />
        <Suspense fallback={null}>
          <OrbitScene showLabels={false} intensity={1.2} />
        </Suspense>
        <div className="absolute inset-x-10 bottom-10">
          <div className="card max-w-md p-5">
            <p className="font-display text-lg font-semibold">“The closer the orbit, the sooner it matters.”</p>
            <p className="mt-2 text-sm text-muted">Every task in Dashify has gravity. AI keeps the urgent ones close and the someday ideas in the outer belt.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
