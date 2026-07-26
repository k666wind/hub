import { useEffect, useState, type ReactNode } from 'react';
import { ThemeContext } from '../hooks/useTheme';
import { getSetting, setSetting, SETTINGS_KEYS, type ThemeMode } from '../services/settingsService';

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>(
    systemPrefersDark() ? 'dark' : 'light'
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSetting<ThemeMode>(SETTINGS_KEYS.theme, 'system').then((saved) => {
      setModeState(saved);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const next = mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode;
    setResolved(next);
    document.documentElement.classList.toggle('dark-theme', next === 'dark');
    document.documentElement.setAttribute('data-theme', next);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const next = mq.matches ? 'dark' : 'light';
      setResolved(next);
      document.documentElement.classList.toggle('dark-theme', next === 'dark');
      document.documentElement.setAttribute('data-theme', next);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    void setSetting(SETTINGS_KEYS.theme, next);
  };

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>{children}</ThemeContext.Provider>
  );
}
