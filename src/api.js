// Central API base URL – respects VITE_API_URL if defined, else defaults based on environment
let baseUrl = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://ap.orderin.in'
);

// If page is hosted on HTTPS, upgrade http:// to https:// (except localhost) to avoid Mixed Content 'TypeError: Failed to fetch'
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







