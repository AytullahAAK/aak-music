import { useSyncExternalStore } from 'react';

type PromptChoice = { outcome: 'accepted' | 'dismissed'; platform?: string };
type InstallPlatform = 'ios' | 'android' | 'windows' | 'desktop' | 'other';
type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<PromptChoice>;
};

type InstallState = { canPrompt: boolean; installed: boolean };
const listeners = new Set<() => void>();
const standalone = () => typeof window !== 'undefined' && (
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true
);
let snapshot: InstallState = { canPrompt: false, installed: standalone() };
const serverSnapshot: InstallState = { canPrompt: false, installed: false };
let deferredPrompt: DeferredInstallPrompt | null = null;
let initialized = false;

function publish(next: InstallState) {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function initInstallExperience() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;
  snapshot = { ...snapshot, installed: standalone() };
  window.addEventListener('beforeinstallprompt', ((event: Event) => {
    event.preventDefault();
    deferredPrompt = event as DeferredInstallPrompt;
    publish({ ...snapshot, canPrompt: true });
  }) as EventListener);
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    publish({ canPrompt: false, installed: true });
  });
  window.matchMedia('(display-mode: standalone)').addEventListener('change', (event) => {
    if (event.matches) publish({ canPrompt: false, installed: true });
  });
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallSnapshot() { return snapshot; }

export async function promptAppInstall(): Promise<PromptChoice['outcome'] | 'unavailable'> {
  const prompt = deferredPrompt;
  if (!prompt) return 'unavailable';
  deferredPrompt = null;
  publish({ ...snapshot, canPrompt: false });
  await prompt.prompt();
  const choice = await prompt.userChoice;
  if (choice.outcome === 'accepted') publish({ canPrompt: false, installed: true });
  return choice.outcome;
}

function platformName(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || '';
  if (/iPhone|iPad|iPod/i.test(ua) || (/Mac/i.test(platform) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Windows/i.test(platform)) return 'windows';
  return 'desktop';
}

export function useInstallApp() {
  const state = useSyncExternalStore(subscribeInstall, getInstallSnapshot, () => serverSnapshot);
  return { ...state, platform: platformName() };
}
