// Central API base URL – uses VITE_API_URL in production, falls back to local backend http://localhost:5000
export const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
