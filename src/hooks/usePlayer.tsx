import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { tracks } from '../data';
import { attachAnalyser } from './analyser';
import { claimPlayback, getPlaybackOwner, resumeAudioBus, setAudioActivity, setPlaybackOwner, type PlaybackOwner } from '../utils/audioBus';
import type { Track } from '../data';

export type Status = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';
export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerContextType {
  track: Track;
  i: number;
  playing: boolean;
  status: Status;
  vol: number;
  shuffle: boolean;
  repeat: RepeatMode;
  favorites: string[];
  isExpanded: boolean;
  hasInitiatedPlayback: boolean;
  play: (i?: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
  setVol: (v: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  setIsExpanded: (expanded: boolean) => void;
  getAudioElement: () => HTMLAudioElement | null;
}

const Ctx = createContext<PlayerContextType>(null!);
const TCtx = createContext<{ t: number; dur: number }>({ t: 0, dur: 0 });
const ExpandedSetterContext = createContext<(expanded: boolean) => void>(() => {});

export const usePlayer = () => useContext(Ctx);
export const useTime = () => useContext(TCtx); // time lives in its own context so only the player UI re-renders 4x/s
export const useSetPlayerExpanded = () => useContext(ExpandedSetterContext);

export const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

export const statusLabel = (s: Status) =>
  s === 'unavailable' || s === 'error'
    ? 'Audio file unavailable'
    : s === 'loading'
    ? 'Loading audio…'
    : null;

export function PlayerProvider({ children }: { children: ReactNode }) {
  const au = useRef<HTMLAudioElement>(null);
  const [i, setI] = useState(0);
  const [want, setWant] = useState(false);
  const [media, setMedia] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [vol, setVolState] = useState(1);
  const [time, setTime] = useState({ t: 0, dur: 0 });

  // Shuffle & Repeat states
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('all');

  // Full Screen Player Expanded state
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasInitiatedPlayback, setHasInitiatedPlayback] = useState(false);

  // Favorites state persisted in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('aak_fav_tracks');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem('aak_fav_tracks', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);

  const toggleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }, []);

  const track = tracks[i] || tracks[0];
  const status: Status = !track.src
    ? 'unavailable'
    : want && media === 'idle'
    ? 'loading'
    : media;
  const playing = want && !!track.src && media !== 'error';

  // Navigation logic considering shuffle & repeat
  const getNextIndex = useCallback(
    (cur: number) => {
      if (shuffle && tracks.length > 1) {
        let rand = cur;
        while (rand === cur) {
          rand = Math.floor(Math.random() * tracks.length);
        }
        return rand;
      }
      if (repeat === 'off' && cur >= tracks.length - 1) {
        return -1; // End reached
      }
      return (cur + 1) % tracks.length;
    },
    [shuffle, repeat]
  );

  const getPrevIndex = useCallback(
    (cur: number) => {
      if (shuffle && tracks.length > 1) {
        let rand = cur;
        while (rand === cur) {
          rand = Math.floor(Math.random() * tracks.length);
        }
        return rand;
      }
      return (cur - 1 + tracks.length) % tracks.length;
    },
    [shuffle]
  );

  const go = useCallback((targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= tracks.length) {
      setWant(false);
      return;
    }
    setI(targetIndex);
    setMedia('idle');
    setTime({ t: 0, dur: 0 });
    setWant(!!tracks[targetIndex].src);
  }, []);

  // Handle Playback Lifecycle
  useEffect(() => {
    const a = au.current;
    if (!a) return;
    if (!want || !track.src) {
      if (getPlaybackOwner() === 'aak-local') {
        a.pause();
        setPlaybackOwner('none');
      }
      return;
    }
    if (getPlaybackOwner() !== 'aak-local') return;
    if (a.src !== new URL(track.src, window.location.href).href) {
      a.src = track.src;
      a.load();
    } else if (a.error) a.load();
    attachAnalyser(a);
    a.play().catch((e) => {
      if (e.name !== 'AbortError') {
        setMedia('error');
        setWant(false);
      }
    });
  }, [want, i, track.src]);

  // Volume Sync
  useEffect(() => {
    if (au.current) au.current.volume = vol;
  }, [vol]);

  // Motion Playing Sync for Visualizer
  useEffect(() => {
    setAudioActivity('main-player', playing);
  }, [playing]);

  useEffect(() => {
    const stopForAnotherSource = (event: Event) => {
      const owner = (event as CustomEvent<PlaybackOwner>).detail;
      if (owner === 'aak-local' || !want) return;
      au.current?.pause();
      setWant(false);
      setAudioActivity('main-player', false);
    };
    window.addEventListener('aak-playback-request', stopForAnotherSource);
    return () => window.removeEventListener('aak-playback-request', stopForAnotherSource);
  }, [want]);

  const setVol = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolState(clamped);
    if (au.current) au.current.volume = clamped;
  }, []);

  const getAudioElement = useCallback(() => au.current, []);

  const play = useCallback(
    (n?: number) => {
      setHasInitiatedPlayback(true);
      claimPlayback('aak-local');
      // Resume Web Audio synchronously from the user's play gesture. Creating or
      // resuming the context only in the playback effect can miss transient user
      // activation in browsers, leaving the media element routed into a suspended
      // graph (the element looks "playing" but its timeline/output never advances).
      const target = n === undefined || n === i ? track : tracks[n];
      if (target?.src) void resumeAudioBus().catch(() => {});
      if (n === undefined || n === i) {
        setMedia((m) => (m === 'error' ? 'idle' : m));
        setWant(!!track.src);
      } else {
        go(n);
      }
    },
    [i, track.src, go]
  );

  const toggle = useCallback(() => (want ? setWant(false) : play()), [want, play]);

  const prev = useCallback(() => {
    const a = au.current;
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      setTime((x) => ({ ...x, t: 0 }));
      return;
    }
    const prevIdx = getPrevIndex(i);
    go(prevIdx);
  }, [i, getPrevIndex, go]);

  const next = useCallback(() => {
    const nextIdx = getNextIndex(i);
    if (nextIdx === -1) {
      setWant(false);
      if (au.current) au.current.currentTime = 0;
    } else {
      go(nextIdx);
    }
  }, [i, getNextIndex, go]);

  const seek = useCallback(
    (s: number) => {
      const a = au.current;
      if (a && track.src && isFinite(a.duration)) {
        a.currentTime = s;
        setTime((x) => ({ ...x, t: s }));
      }
    },
    [track.src]
  );

  // Audio element events
  const sync = (a: HTMLAudioElement) =>
    setTime({ t: a.currentTime, dur: isFinite(a.duration) ? a.duration : 0 });

  const handleEnded = useCallback(() => {
    if (!want) return;
    const endedEvent = new Event('aak-local-audio-ended', { cancelable: true });
    if (!window.dispatchEvent(endedEvent)) return;
    if (repeat === 'one') {
      const a = au.current;
      if (a) {
        a.currentTime = 0;
        a.play().catch(() => {});
      }
      return;
    }
    next();
  }, [repeat, next, want]);

  const v = useMemo<PlayerContextType>(
    () => ({
      track,
      i,
      playing,
      status,
      vol,
      shuffle,
      repeat,
      favorites,
      isExpanded,
      hasInitiatedPlayback,
      play,
      toggle,
      next,
      prev,
      seek,
      setVol,
      toggleShuffle,
      toggleRepeat,
      toggleFavorite,
      isFavorite,
      setIsExpanded,
      getAudioElement,
    }),
    [
      track,
      i,
      playing,
      status,
      vol,
      shuffle,
      repeat,
      favorites,
      isExpanded,
      hasInitiatedPlayback,
      play,
      toggle,
      next,
      prev,
      seek,
      setVol,
      toggleShuffle,
      toggleRepeat,
      toggleFavorite,
      isFavorite,
      setIsExpanded,
      getAudioElement,
    ]
  );

  return (
    <ExpandedSetterContext.Provider value={setIsExpanded}>
    <Ctx.Provider value={v}>
      <TCtx.Provider value={time}>{children}</TCtx.Provider>
      <audio
        ref={au}
        className="sr-only"
        aria-hidden="true"
        preload="none"
        onTimeUpdate={(e) => { if (want) sync(e.currentTarget); }}
        onLoadedMetadata={(e) => { if (want) sync(e.currentTarget); }}
        onWaiting={() => { if (want) setMedia('loading'); }}
        onCanPlay={() => { if (want) setMedia('ready'); }}
        onPlaying={() => { if (want) setMedia('ready'); }}
        onError={() => {
          if (want && track.src) {
            setMedia('error');
            setWant(false);
          }
        }}
        onEnded={handleEnded}
      />
    </Ctx.Provider>
    </ExpandedSetterContext.Provider>
  );
}
