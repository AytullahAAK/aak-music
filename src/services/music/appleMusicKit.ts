export interface MusicKitPlayer {
  isPlaying: boolean;
  playbackState: number;
  currentPlaybackTime: number;
  currentPlaybackDuration: number;
  volume: number;
  repeatMode: number;
  shuffleMode: number;
  play(): Promise<unknown>;
  pause(): void;
  stop(): void;
  seekToTime(seconds: number): Promise<unknown>;
  skipToNextItem(): Promise<unknown>;
  skipToPreviousItem(): Promise<unknown>;
}

export interface MusicKitInstance {
  isAuthorized: boolean;
  authorize(): Promise<string>;
  setQueue(options: { song: string }): Promise<unknown>;
  addEventListener(name: string, callback: (event?: unknown) => void): void;
  removeEventListener(name: string, callback: (event?: unknown) => void): void;
  player: MusicKitPlayer;
}

interface MusicKitGlobal {
  configure(options: { developerToken: string; app: { name: string; build: string } }): unknown | Promise<unknown>;
  getInstance(): MusicKitInstance;
}

type MusicKitWindow = Window & { MusicKit?: MusicKitGlobal };
let scriptPromise: Promise<MusicKitGlobal> | null = null;
let instancePromise: Promise<MusicKitInstance> | null = null;

function loadMusicKit() {
  const musicWindow = window as MusicKitWindow;
  if (musicWindow.MusicKit) return Promise.resolve(musicWindow.MusicKit);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<MusicKitGlobal>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-aak-musickit]');
    const timeout = window.setTimeout(() => { window.removeEventListener('musickitloaded', ready); reject(new Error('Apple MusicKit did not finish loading.')); }, 15000);
    const ready = () => {
      window.removeEventListener('musickitloaded', ready);
      const sdk = musicWindow.MusicKit;
      if (!sdk) { window.clearTimeout(timeout); reject(new Error('Apple MusicKit loaded without its playback API.')); return; }
      window.clearTimeout(timeout); resolve(sdk);
    };
    window.addEventListener('musickitloaded', ready, { once: true });
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
      script.async = true;
      script.dataset.aakMusickit = 'true';
      script.addEventListener('load', ready, { once: true });
      script.addEventListener('error', () => { window.clearTimeout(timeout); window.removeEventListener('musickitloaded', ready); reject(new Error('Could not load Apple MusicKit.')); }, { once: true });
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', ready, { once: true });
      if (musicWindow.MusicKit) ready();
    }
  }).catch((error: unknown) => { scriptPromise = null; throw error; });
  return scriptPromise;
}

export async function getMusicKitInstance() {
  if (instancePromise) return instancePromise;
  instancePromise = (async () => {
    const response = await fetch('/api/apple-music-token');
    const data = await response.json() as { developerToken?: string; error?: string };
    if (!response.ok || !data.developerToken) throw new Error(data.error || 'Apple MusicKit is not configured.');
    const sdk = await loadMusicKit();
    await sdk.configure({ developerToken: data.developerToken, app: { name: 'AAK Music', build: '1.0.0' } });
    return sdk.getInstance();
  })().catch((error: unknown) => { instancePromise = null; throw error; });
  return instancePromise;
}

