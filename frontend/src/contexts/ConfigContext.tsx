/**
 * CONFIG CONTEXT - Runtime configuration loader
 * Loads config from /config.json (injected by GitHub Action)
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface Tier {
  name: string;
  displayName: string;
  price: number;
  limit: number | null;
  features: string;
  popular: boolean;
  stripePriceId: string | null;
}

interface Branding {
  appName: string;
  logoUrl: string;
  primaryColor: string;
  valueProp: string;
  description: string;
  heroImageUrl: string;
}

interface Product {
  name: string;
}

interface Config {
  branding: Branding;
  product: Product;
  tiers: Tier[];
  apiUrl: string;
  clerkPublishableKey: string;
}

interface ConfigContextType {
  config: Config | null;
  loading: boolean;
  error: string | null;
}

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
