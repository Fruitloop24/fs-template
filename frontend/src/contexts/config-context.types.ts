
export interface Tier {
  name: string;
  displayName: string;
  price: number;
  limit: number | 'unlimited' | null;
  features: string | string[]; // Can be string (comma-separated) or array
  popular: boolean;
  stripePriceId: string | null;
}

export interface Branding {
  appName: string;
  logoUrl: string;
  primaryColor: string;
  valueProp: string;
  description: string;
  heroImageUrl: string;
}

export interface Product {
  name: string;
}

export interface Config {
  branding: Branding;
  product: Product;
  tiers: Tier[];
  apiUrl: string;
  clerkPublishableKey: string;
  userId: string;
}

export interface ConfigContextType {
  config: Config | null;
  loading: boolean;
  error: string | null;
}
