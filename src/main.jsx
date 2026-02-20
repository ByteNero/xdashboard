import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => console.log('[PWA] Service worker registered:', reg.scope),
      (err) => console.error('[PWA] Service worker registration failed:', err)
    );
  });
}

// Wake Lock API — keeps screen on while dashboard is visible
let wakeLock = null;

const requestWakeLock = async () => {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('[WakeLock] Screen wake lock acquired');
      wakeLock.addEventListener('release', () => {
        console.log('[WakeLock] Screen wake lock released');
      });
    } catch (err) {
      console.warn('[WakeLock] Failed to acquire:', err.message);
    }
  }
};

// Acquire on load
requestWakeLock();

// Re-acquire when tab becomes visible again (e.g. after standby/resume)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    requestWakeLock();
  }
});
