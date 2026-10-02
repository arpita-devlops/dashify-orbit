import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import CommandPalette from '../components/app/CommandPalette';
import TaskModal from '../components/app/TaskModal';
import TeamModal from '../components/app/TeamModal';

const AppUiContext = createContext(null);

const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

export function AppUiProvider({ children }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [modal, setModal] = useState({ open: false, task: null, defaults: null, key: 0 });
  const [teamModal, setTeamModal] = useState({ open: false, tab: 'create', key: 0 });

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const openTeamModal = useCallback((tab = 'create') => {
    setPaletteOpen(false);
    setTeamModal((m) => ({ open: true, tab, key: m.key + 1 }));
  }, []);
  const closeTeamModal = useCallback(() => setTeamModal((m) => ({ ...m, open: false })), []);
  const openTaskModal = useCallback((task = null, defaults = null) => {
    setPaletteOpen(false);
    setModal((m) => ({ open: true, task, defaults, key: m.key + 1 }));
  }, []);
  const closeTaskModal = useCallback(() => setModal((m) => ({ ...m, open: false })), []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(document.activeElement)) {
        e.preventDefault();
        openTaskModal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openTaskModal]);

  const value = useMemo(() => ({ openPalette, openTaskModal, openTeamModal }), [openPalette, openTaskModal, openTeamModal]);

  return (
    <AppUiContext.Provider value={value}>
      {children}
      <CommandPalette open={paletteOpen} onClose={closePalette} />
      <TaskModal key={modal.key} open={modal.open} task={modal.task} defaults={modal.defaults} onClose={closeTaskModal} />
      <TeamModal key={`team-${teamModal.key}`} open={teamModal.open} initialTab={teamModal.tab} onClose={closeTeamModal} />
    </AppUiContext.Provider>
  );
}

export const useAppUi = () => useContext(AppUiContext);
