import { useState } from 'react';
import Icon from '../components/Icon';
import { useInstallApp, promptAppInstall } from '../utils/installApp';

const platformCopy = {
  ios: {
    heading: 'Add to your iPhone or iPad',
    steps: ['Open this site in Safari.', 'Tap Share, then choose Add to Home Screen.', 'Confirm the name and tap Add.'],
  },
  android: {
    heading: 'Install on Android',
    steps: ['Open this site in Chrome or another compatible browser.', 'Use Install AAK Music when the browser offers it, or open the browser menu and choose Install app / Add to Home screen.'],
  },
  windows: {
    heading: 'Install on Windows',
    steps: ['Open this site in Microsoft Edge or Chrome.', 'Choose Install AAK Music from the address-bar install icon or the browser menu.'],
  },
  desktop: {
    heading: 'Install on this device',
    steps: ['In a compatible desktop browser, use its Install AAK Music command in the address bar or browser menu.', 'If the install command is not available, this browser or site context does not currently meet its install criteria.'],
  },
  other: {
    heading: 'Add AAK Music to your device',
    steps: ['Open the site in a browser that supports web app installation.', 'Choose Install app or Add to Home screen from the browser menu.'],
  },
} as const;

export default function InstallPage() {
  const install = useInstallApp();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const copy = platformCopy[install.platform];

  const requestInstall = async () => {
    if (busy || !install.canPrompt) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await promptAppInstall();
      setMessage(result === 'accepted' ? 'AAK Music was added to this device.' : result === 'dismissed' ? 'Installation was dismissed. You can install later from your browser menu.' : 'Your browser no longer has an install prompt available. Use its install option when it appears.');
    } catch {
      setMessage('The browser could not complete installation. Try its Install app option from the menu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto min-h-[75vh] w-full max-w-5xl px-4 pb-20 pt-28 sm:px-6 md:px-10 md:pt-36">
      <div className="rounded-[2rem] border border-bone/12 bg-raised/75 p-5 shadow-[0_18px_60px_rgb(0_0_0/.12)] sm:p-8 md:p-12">
        <div className="flex flex-wrap items-center gap-3 text-cyan">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan/20 bg-cyan/10"><Icon n="install" s={22} /></span>
          <p className="font-mono text-[10px] uppercase tracking-[.2em]">AAK MUSIC · WEB APP</p>
        </div>
        <h1 className="mt-5 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">Take AAK Music with you</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-bone/65 sm:text-base">Install the AAK Music web app for an app-style shortcut and standalone window. Music streaming still needs an internet connection; this installation does not download songs for offline playback.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0 rounded-2xl border border-bone/10 bg-void/30 p-5 sm:p-6">
            <h2 className="font-display text-xl font-bold">{install.installed ? 'AAK Music is installed' : copy.heading}</h2>
            {install.installed ? <p className="mt-3 text-sm leading-6 text-bone/65">Open AAK Music from your home screen, app launcher, or taskbar. Installation status is supplied by the browser.</p> : (
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-bone/70">{copy.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            )}
            {install.canPrompt && !install.installed && <button type="button" onClick={() => void requestInstall()} disabled={busy} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cyan px-5 text-sm font-bold text-ink transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:opacity-60"><Icon n="install" s={18} />{busy ? 'Opening install prompt…' : 'Install AAK Music'}</button>}
            {message && <p role="status" className="mt-4 text-sm text-bone/70">{message}</p>}
          </div>
          <aside className="rounded-2xl border border-bone/10 bg-void/30 p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-bone/45">What installation means</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-bone/65">
              <li>Browser-based app shortcut and standalone display where supported.</li>
              <li>Offline visits show a connection message; streaming audio and video are never cached for offline playback.</li>
              <li>This is a PWA, not an Android APK, signed iOS app, or Windows installer.</li>
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
