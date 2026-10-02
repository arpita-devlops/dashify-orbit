import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createApi } from '../lib/api';
import { tokenStore } from '../lib/http';
import { DEMO_CREDENTIALS } from '../lib/localApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [api, setApi] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const instance = await createApi();
      let current = null;
      if (tokenStore.get()) {
        try {
          current = await instance.auth.me();
        } catch {
          tokenStore.clear();
        }
      }
      if (!alive) return;
      setApi(instance);
      setUser(current);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    window.addEventListener('dashify:unauthorized', logout);
    return () => window.removeEventListener('dashify:unauthorized', logout);
  }, [logout]);

  const finish = useCallback(({ token, user: account }) => {
    tokenStore.set(token);
    setUser(account);
    return account;
  }, []);

  const login = useCallback(async (credentials) => finish(await api.auth.login(credentials)), [api, finish]);
  const register = useCallback(async (input) => finish(await api.auth.register(input)), [api, finish]);
  const loginDemo = useCallback(() => login(DEMO_CREDENTIALS), [login]);
  const updateProfile = useCallback(async (input) => {
    const account = await api.auth.updateProfile(input);
    setUser(account);
    return account;
  }, [api]);

  const value = useMemo(
    () => ({ api, user, ready, mode: api?.mode, aiEngine: api?.aiEngine, login, register, loginDemo, logout, updateProfile }),
    [api, user, ready, login, register, loginDemo, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
