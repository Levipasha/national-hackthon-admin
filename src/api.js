// Central API base URL – uses VITE_API_URL in production, falls back to local backend http://localhost:5000
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
export const API = isLocal ? 'http://localhost:5000' : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

