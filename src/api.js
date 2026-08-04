// Central API base URL – auto-detects localhost or respects VITE_API_URL
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

let baseUrl = isLocal
  ? (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.includes('http') ? import.meta.env.VITE_API_URL : 'http://localhost:5000')
  : (import.meta.env.VITE_API_URL || 'https://ap.orderin.in');

// If page is hosted on HTTPS, upgrade http:// to https:// (except localhost)
if (
  typeof window !== 'undefined' &&
  window.location.protocol === 'https:' &&
  baseUrl.startsWith('http://') &&
  !baseUrl.includes('localhost') &&
  !baseUrl.includes('127.0.0.1')
) {
  baseUrl = baseUrl.replace('http://', 'https://');
}

export const API = baseUrl;







