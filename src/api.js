// Central API base URL – uses VITE_API_URL in production, falls back to '' for Vite dev-proxy
export const API = import.meta.env.VITE_API_URL || '';
