import {StrictMode, Fragment} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('CAMPORA service worker registration failed:', error);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Fragment>
      <App />
      <PWAInstallPrompt />
    </Fragment>
  </StrictMode>,
);
