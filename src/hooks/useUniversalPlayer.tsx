import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePlayer } from './usePlayer';
import { attachAnalyser } from './analyser';
import { setAudioActivity } from '../utils/audioBus';
import type { AudioCatalogTrack, YouTubeResult } from '../services/music/types';

export type RepeatMode = 'off' | 'all' | 'one';

interface UniversalPlayerContextValue {
  activeAudio: AudioCatalogTrack | null;
  activeVideo: YouTubeResult | null;
  queue: AudioCatalogTrack[];
  queueIndex: number;
  playing: boolean;
  time: number;
  duration: number;
  volume: number;
  repeat: RepeatMode;
  shuffle: boolean;
  error: string;
  playAudio: (track: AudioCatalogTrack) => void;
  playVideo: (video: YouTubeResult) => void;
  addToQueue: (track: AudioCatalogTrack) => void;
  clearQueue: () => void;
  playQueued: (index: number) => void;
  closeVideo: () => void;
  closeAudio: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setRepeat: (mode: RepeatMode) => void;
  setShuffle: (enabled: boolean) => void;
  setError: (message: string) => void;
  syncAudio: (audio: HTMLAudioElement) => void;
  onEnded: () => void;
}

const Context = createContext<UniversalPlayerContextValue | null>(null);
const sameTrack = (a: AudioCatalogTrack, b: AudioCatalogTrack) => a.provider === b.provider && a.id === b.id;

export function UniversalPlayerProvider({ children }: { children: ReactNode }) {
  const player = usePlayer();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeAudio, setActiveAudio] = useState<AudioCatalogTrack | null>(null);
  const [activeVideo, setActiveVideo] = useState<YouTubeResult | null>(null);
  const [queue, setQueue] = useState<AudioCatalogTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [repeat, setRepeat] = useState<RepeatMode>('all');
  const [shuffle, setShuffle] = useState(false);
  const [error, setError] = useState('');

  const pauseCurrent = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    if (activeAudio) setAudioActivity(`catalogue:${activeAudio.provider}:${activeAudio.id}`, false);
  }, [activeAudio]);

  const beginAudio = useCallback((track: AudioCatalogTrack, index: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    setTime(0);
    setDuration(0);
    setError('');
    player.setIsExpanded(false);
    setActiveVideo(null);
    setActiveAudio(track);
    setQueueIndex(index);
    audio.volume = volume;
    if (audio.src !== track.audioUrl) {
      audio.src = track.audioUrl;
      audio.load();
    } else {
      audio.currentTime = 0;
    }
    attachAnalyser(audio);
    void audio.play().catch((cause: unknown) => {
      setPlaying(false);
      const name = cause instanceof DOMException ? cause.name : '';
      if (name !== 'AbortError') setError('This provider could not start the audio. Open the provider link to check availability.');
    });
  }, [player, volume]);

  const playAudio = useCallback((track: AudioCatalogTrack) => {
    if (player.playing) player.toggle();
    const nextQueue = [track, ...queue.filter((queued) => !sameTrack(queued, track))];
    setQueue(nextQueue);
    beginAudio(track, 0);
  }, [beginAudio, player, queue]);

  const addToQueue = useCallback((track: AudioCatalogTrack) => {
    setQueue((current) => current.some((queued) => sameTrack(queued, track)) ? current : [...current, track]);
  }, []);

  const playQueued = useCallback((index: number) => {
    const track = queue[index];
    if (!track) return;
    if (player.playing) player.toggle();
    beginAudio(track, index);
  }, [beginAudio, player, queue]);

  const playVideo = useCallback((video: YouTubeResult) => {
    pauseCurrent();
    if (player.playing) player.toggle();
    setActiveAudio(null);
    setActiveVideo(video);
    setPlaying(false);
    setTime(0);
    setDuration(0);
    setError('');
    player.setIsExpanded(false);
    const audio = audioRef.current;
    if (audio) { audio.removeAttribute('src'); audio.load(); }
  }, [pauseCurrent, player]);

  const closeVideo = useCallback(() => setActiveVideo(null), []);

  const closeAudio = useCallback(() => {
    pauseCurrent();
    const audio = audioRef.current;
    if (audio) { audio.removeAttribute('src'); audio.load(); }
    setActiveAudio(null);
    setPlaying(false);
    setTime(0);
    setDuration(0);
    setError('');
  }, [pauseCurrent]);

  const clearQueue = useCallback(() => {
    if (activeAudio) closeAudio();
    setQueue([]);
    setQueueIndex(-1);
  }, [activeAudio, closeAudio]);

  const next = useCallback(() => {
    if (!queue.length) return;
    if (shuffle && queue.length > 1) {
      let index = queueIndex;
      while (index === queueIndex) index = Math.floor(Math.random() * queue.length);
      return playQueued(index);
    }
    const index = queueIndex + 1;
    if (index >= queue.length) {
      if (repeat === 'all') return playQueued(0);
      closeAudio();
      return;
    }
    playQueued(index);
  }, [closeAudio, playQueued, queue.length, queueIndex, repeat, shuffle]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setTime(0);
      if (!playing) void audio.play().catch(() => {});
      return;
    }
    if (queueIndex > 0) return playQueued(queueIndex - 1);
    if (repeat === 'all' && queue.length) return playQueued(queue.length - 1);
    if (activeAudio) beginAudio(activeAudio, queueIndex);
  }, [activeAudio, beginAudio, playQueued, playing, queue.length, queueIndex, repeat]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !activeAudio) return;
    if (audio.paused) {
      attachAnalyser(audio);
      void audio.play().catch(() => setError('The audio could not resume. Try again or open the provider link.'));
    } else audio.pause();
  }, [activeAudio]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, seconds));
    setTime(audio.currentTime);
  }, []);

  const setVolume = useCallback((nextVolume: number) => {
    const normalized = Math.max(0, Math.min(1, nextVolume));
    setVolumeState(normalized);
    if (audioRef.current) audioRef.current.volume = normalized;
  }, []);

  const syncAudio = useCallback((audio: HTMLAudioElement) => {
    setTime(audio.currentTime || 0);
    setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
  }, []);

  const onEnded = useCallback(() => {
    if (repeat === 'one') {
      const audio = audioRef.current;
      if (audio) { audio.currentTime = 0; void audio.play().catch(() => {}); }
      return;
    }
    next();
  }, [next, repeat]);

  useEffect(() => {
    const stopExternalForLocalPlayback = () => {
      if (activeAudio) closeAudio();
      if (activeVideo) closeVideo();
    };
    window.addEventListener('aak-local-play-request', stopExternalForLocalPlayback);
    return () => window.removeEventListener('aak-local-play-request', stopExternalForLocalPlayback);
  }, [activeAudio, activeVideo, closeAudio, closeVideo]);

  const value = useMemo<UniversalPlayerContextValue>(() => ({
    activeAudio, activeVideo, queue, queueIndex, playing, time, duration, volume, repeat, shuffle, error,
    playAudio, playVideo, addToQueue, clearQueue, playQueued, closeVideo, closeAudio, toggle, next, prev, seek, setVolume,
    setRepeat, setShuffle, setError, syncAudio, onEnded,
  }), [activeAudio, activeVideo, queue, queueIndex, playing, time, duration, volume, repeat, shuffle, error,
    playAudio, playVideo, addToQueue, clearQueue, playQueued, closeVideo, closeAudio, toggle, next, prev, seek, setVolume, syncAudio, onEnded]);

  return (
    <Context.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="none"
        className="sr-only"
        aria-hidden="true"
        onTimeUpdate={(event) => syncAudio(event.currentTarget)}
        onLoadedMetadata={(event) => syncAudio(event.currentTarget)}
        onDurationChange={(event) => syncAudio(event.currentTarget)}
        onPlay={() => { setPlaying(true); if (activeAudio) setAudioActivity(`catalogue:${activeAudio.provider}:${activeAudio.id}`, true); }}
        onPause={() => { setPlaying(false); if (activeAudio) setAudioActivity(`catalogue:${activeAudio.provider}:${activeAudio.id}`, false); }}
        onEnded={onEnded}
        onError={() => {
          setPlaying(false);
          if (activeAudio) setAudioActivity(`catalogue:${activeAudio.provider}:${activeAudio.id}`, false);
          if (activeAudio) setError('This audio stream is unavailable in the current region or has expired. Open the provider page for options.');
        }}
      />
    </Context.Provider>
  );
}

export function useUniversalPlayer() {
  const value = useContext(Context);
  if (!value) throw new Error('useUniversalPlayer must be used inside UniversalPlayerProvider.');
  return value;
}
