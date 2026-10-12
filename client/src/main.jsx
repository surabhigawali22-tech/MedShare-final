import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import './i18n.js'
import App from './App.jsx'

// API base URL configuration:
// In browser development, relative paths (/api) use Vite's dev proxy to localhost:5000.
// In native Android/Capacitor, requests use http://192.168.1.8:5000 (host machine Wi-Fi IP).
const isNative = Capacitor.isNativePlatform() || 
  (typeof window !== 'undefined' && Boolean(window.Capacitor)) ||
  (typeof window !== 'undefined' && window.location.origin && window.location.origin.includes('localhost') && !window.location.port);

const configuredBase = import.meta.env.VITE_API_BASE_URL || '';
const apiBase = isNative ? 'http://192.168.1.8:5000' : configuredBase;

const originalFetch = window.fetch;
window.fetch = (input, init = {}) => {
  let url = input;
  if (typeof input === 'string') {
    if (apiBase && (input.startsWith('/api') || input.startsWith('/uploads'))) {
      url = `${apiBase}${input}`;
    } else if (isNative && (input.startsWith('http://localhost:5000') || input.startsWith('http://127.0.0.1:5000'))) {
      url = input.replace(/http:\/\/(localhost|127\.0\.0\.1):5000/, 'http://192.168.1.8:5000');
    }
  }

  const token = localStorage.getItem('medshare_token');
  const guestRole = localStorage.getItem('medshare_guest_role') || 'donor';

  const newInit = { ...init };
  const headers = new Headers(newInit.headers || {});

  const currentAuth = headers.get('Authorization');
  if (!currentAuth || currentAuth === 'Bearer null' || currentAuth === 'Bearer undefined') {
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    } else {
      headers.set('Authorization', `Bearer guest-${guestRole}`);
    }
  }

  if (!headers.has('X-Guest-Role')) {
    headers.set('X-Guest-Role', guestRole);
  }

  newInit.headers = headers;
  return originalFetch(url, newInit);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
