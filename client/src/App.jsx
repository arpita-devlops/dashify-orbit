import { lazy, Suspense } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Button from './components/ui/Button';
import { Splash } from './components/ui/Primitives';
import { useAuth } from './context/AuthContext';
import Auth from './pages/Auth';

const Landing = lazy(() => import('./pages/Landing'));
const AppLayout = lazy(() => import('./pages/app/AppLayout'));
const Overview = lazy(() => import('./pages/app/Overview'));
const Tasks = lazy(() => import('./pages/app/Tasks'));
const Focus = lazy(() => import('./pages/app/Focus'));
const Settings = lazy(() => import('./pages/app/Settings'));
const Team = lazy(() => import('./pages/app/Team'));

function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

function GuestOnly({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/app" replace /> : children;
}

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="font-mono text-sm text-accent">404 · lost in space</p>
        <h1 className="mt-3 font-display text-4xl font-bold">This page drifted out of orbit</h1>
        <Button as={Link} to="/" className="mt-8">Back to Dashify</Button>
      </div>
    </div>
  );
}

export default function App() {
  const { ready } = useAuth();
  if (!ready) return <Splash />;

  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<GuestOnly><Auth mode="login" /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Auth mode="register" /></GuestOnly>} />
        <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Overview />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="team" element={<Team />} />
          <Route path="focus" element={<Focus />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
