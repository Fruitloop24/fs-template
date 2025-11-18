/**
 * CONFIG CONTEXT - Runtime configuration loader
 * Loads config from /config.json (injected by GitHub Action)
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { Config, ConfigContextType } from './config-context.types';

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/config.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load config: ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        console.log('[ConfigContext] Loaded config:', data);
        setConfig(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[ConfigContext] Failed to load config.json:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, error }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextType {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
