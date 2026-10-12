import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { getDevicePerformanceMode, readPerformancePreference } from './utils/performanceMode';
import { initInstallExperience } from './utils/installApp';

const preference = readPerformancePreference();
document.documentElement.dataset.performancePreference = preference;
document.documentElement.dataset.performanceMode = preference === 'auto' ? getDevicePerformanceMode() : preference;
initInstallExperience();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const registerServiceWorker = () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // PWA installation is optional; streaming and the site continue online.
    });
  };
  if (document.readyState === 'complete') registerServiceWorker();
  else window.addEventListener('load', registerServiceWorker, { once: true });
}

createRoot(document.getElementById('root')!).render(<App />);
