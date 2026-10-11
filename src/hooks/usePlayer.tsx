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
import { setAudioActivity } from '../utils/audioBus';
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
}

const Ctx = createContext<PlayerContextType>(null!);
const TCtx = createContext<{ t: number; dur: number }>({ t: 0, dur: 0 });

export const usePlayer = () => useContext(Ctx);
export const useTime = () => useContext(TCtx); // time lives in its own context so only the player UI re-renders 4x/s

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
  const [vol, setVolState] = useState(0.85);
  const [time, setTime] = useState({ t: 0, dur: 0 });

  // Shuffle & Repeat states
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('all');

  // Full Screen Player Expanded state
  const [isExpanded, setIsExpanded] = useState(false);

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
      a.pause();
      return;
    }
    if (a.error) a.load();
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

  const setVol = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolState(clamped);
    if (au.current) au.current.volume = clamped;
  }, []);

  const play = useCallback(
    (n?: number) => {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('aak-local-play-request'));
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
    if (repeat === 'one') {
      const a = au.current;
      if (a) {
        a.currentTime = 0;
        a.play().catch(() => {});
      }
      return;
    }
    next();
  }, [repeat, next]);

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
    ]
  );

  return (
    <Ctx.Provider value={v}>
      <TCtx.Provider value={time}>{children}</TCtx.Provider>
      <audio
        ref={au}
        src={track.src}
        preload="metadata"
        onTimeUpdate={(e) => sync(e.currentTarget)}
        onLoadedMetadata={(e) => sync(e.currentTarget)}
        onWaiting={() => setMedia('loading')}
        onCanPlay={() => setMedia('ready')}
        onPlaying={() => setMedia('ready')}
        onError={() => {
          if (track.src) {
            setMedia('error');
            setWant(false);
          }
        }}
        onEnded={handleEnded}
      />
    </Ctx.Provider>
  );
}
