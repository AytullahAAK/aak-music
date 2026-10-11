import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePlayer } from './usePlayer';
import { attachAnalyser } from './analyser';
import { claimPlayback, setAudioActivity, setPlaybackOwner, type PlaybackOwner } from '../utils/audioBus';
import type { AudioCatalogTrack, YouTubeResult } from '../services/music/types';
import { getMusicKitInstance, type MusicKitInstance } from '../services/music/appleMusicKit';

export interface YouTubeTransportController {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
}

export type RepeatMode = 'off' | 'all' | 'one';

interface UniversalPlayerClock {
  time: number;
  duration: number;
  videoTime: number;
  videoDuration: number;
}

interface UniversalPlayerContextValue {
  activeAudio: AudioCatalogTrack | null;
  activeVideo: YouTubeResult | null;
  queue: AudioCatalogTrack[];
  queueIndex: number;
  playing: boolean;
  volume: number;
  repeat: RepeatMode;
  shuffle: boolean;
  error: string;
  videoPlaying: boolean;
  videoReady: boolean;
  setVideoController: (controller: YouTubeTransportController | null) => void;
  syncVideo: (state: number, currentTime: number, duration: number) => void;
  toggleVideo: () => void;
  seekVideo: (seconds: number) => void;
  setVideoVolume: (volume: number) => void;
  playAudio: (track: AudioCatalogTrack) => void;
  playAppleMusic: (track: AudioCatalogTrack) => void;
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
const ClockContext = createContext<UniversalPlayerClock>({ time: 0, duration: 0, videoTime: 0, videoDuration: 0 });
const sameTrack = (a: AudioCatalogTrack, b: AudioCatalogTrack) => a.provider === b.provider && a.id === b.id;

export function UniversalPlayerProvider({ children }: { children: ReactNode }) {
  const player = usePlayer();
  const musicKitRef = useRef<MusicKitInstance | null>(null);
  const musicKitListenersRef = useRef<Array<{ name: string; listener: (event?: unknown) => void }>>([]);
  const videoControllerRef = useRef<YouTubeTransportController | null>(null);
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
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const syncMusicKit = useCallback(() => {
    const kit = musicKitRef.current;
    if (!kit) return;
    setPlaying(Boolean(kit.player.isPlaying));
    const current = kit.player.currentPlaybackTime;
    const total = kit.player.currentPlaybackDuration;
    setTime(Number.isFinite(current) ? Math.max(0, current) : 0);
    setDuration(Number.isFinite(total) ? Math.max(0, total) : 0);
    setVolumeState(Number.isFinite(kit.player.volume) ? kit.player.volume : 0.85);
  }, []);

  const attachMusicKitListeners = useCallback((kit: MusicKitInstance) => {
    if (musicKitListenersRef.current.length) return;
    const update = () => syncMusicKit();
    const failed = (event?: unknown) => {
      const detail = event && typeof event === 'object' ? event as { message?: string; error?: { message?: string } } : {};
      setPlaying(false);
      setError(detail.message || detail.error?.message || 'Apple Music could not play this item. Check subscription availability and account authorization.');
    };
    for (const name of ['playbackStateDidChange', 'playbackTimeDidChange', 'nowPlayingItemDidChange']) {
      kit.addEventListener(name, update);
      musicKitListenersRef.current.push({ name, listener: update });
    }
    kit.addEventListener('mediaPlaybackError', failed);
    musicKitListenersRef.current.push({ name: 'mediaPlaybackError', listener: failed });
  }, [syncMusicKit]);

  const pauseCurrent = useCallback(() => {
    const audio = player.getAudioElement();
    if (activeAudio?.playbackKind === 'subscription') musicKitRef.current?.player.pause();
    if (audio) audio.pause();
    if (activeAudio) setAudioActivity(`catalogue:${activeAudio.provider}:${activeAudio.id}`, false);
    setPlaybackOwner('none');
  }, [activeAudio, player.getAudioElement]);

  const beginAudio = useCallback((track: AudioCatalogTrack, index: number) => {
    if (track.playbackKind === 'subscription') return;
    const audio = player.getAudioElement();
    if (!audio) return;
    claimPlayback('catalogue-audio');
    audio.pause();
    setPlaying(false);
    setTime(0);
    setDuration(0);
    setError('');
    setActiveVideo(null);
    setPlaybackOwner('catalogue-audio');
    setVideoPlaying(false); setVideoReady(false); setVideoTime(0); setVideoDuration(0); videoControllerRef.current = null;
    setActiveAudio(track);
    setQueueIndex(index);
    audio.volume = volume;
    musicKitRef.current?.player.stop();
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

  const playAppleMusic = useCallback(async (track: AudioCatalogTrack) => {
    claimPlayback('apple-musickit');
    const audio = player.getAudioElement();
    audio?.pause();
    if (activeAudio) setAudioActivity(`catalogue:${activeAudio.provider}:${activeAudio.id}`, false);
    if (player.playing) player.toggle();
    setPlaying(false); setTime(0); setDuration(0); setError('Connecting to Apple Music…');
    setActiveAudio(track);
    setActiveVideo(null); setVideoPlaying(false); setVideoReady(false); videoControllerRef.current = null;
    try {
      const kit = await getMusicKitInstance();
      musicKitRef.current = kit;
      attachMusicKitListeners(kit);
      if (!kit.isAuthorized) await kit.authorize();
      kit.player.volume = volume;
      await kit.setQueue({ song: track.id });
      setError('');
      await kit.player.play();
      syncMusicKit();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setPlaying(false);
      setError(/cancel|denied|authorization/i.test(message)
        ? 'Apple Music authorization was cancelled or denied. You can still open the track in Apple Music.'
        : `Apple Music could not start playback. Check that you have an active subscription and this track is available in your storefront. ${message}`.trim());
    }
  }, [activeAudio, attachMusicKitListeners, player, syncMusicKit, volume]);

  const playAudio = useCallback((track: AudioCatalogTrack) => {
    if (track.playbackKind === 'subscription') {
      setQueue([track, ...queue.filter((queued) => !sameTrack(queued, track))]);
      setQueueIndex(0);
      void playAppleMusic(track);
      return;
    }
    if (player.playing) player.toggle();
    const nextQueue = [track, ...queue.filter((queued) => !sameTrack(queued, track))];
    setQueue(nextQueue);
    beginAudio(track, 0);
  }, [beginAudio, player, queue, playAppleMusic]);

  const addToQueue = useCallback((track: AudioCatalogTrack) => {
    setQueue((current) => current.some((queued) => sameTrack(queued, track)) ? current : [...current, track]);
  }, []);

  const playQueued = useCallback((index: number) => {
    const track = queue[index];
    if (!track) return;
    if (player.playing) player.toggle();
    if (track.playbackKind === 'subscription') { void playAppleMusic(track); setQueueIndex(index); }
    else beginAudio(track, index);
  }, [beginAudio, player, queue, playAppleMusic]);

  const playVideo = useCallback((video: YouTubeResult) => {
    pauseCurrent();
    claimPlayback('youtube-iframe');
    musicKitRef.current?.player.stop();
    if (player.playing) player.toggle();
    setActiveAudio(null);
    setActiveVideo(video);
    setPlaybackOwner('youtube-iframe');
    setPlaying(false);
    setTime(0);
    setDuration(0);
    setVideoPlaying(false); setVideoReady(false); setVideoTime(0); setVideoDuration(0); videoControllerRef.current = null;
    setError('');
    player.setIsExpanded(true);
    const audio = player.getAudioElement();
    if (audio) { audio.removeAttribute('src'); audio.load(); }
  }, [pauseCurrent, player]);

  const closeVideo = useCallback(() => { setActiveVideo(null); setVideoPlaying(false); setVideoReady(false); setVideoTime(0); setVideoDuration(0); videoControllerRef.current = null; setPlaybackOwner('none'); }, []);

  const setVideoController = useCallback((controller: YouTubeTransportController | null) => { videoControllerRef.current = controller; setVideoReady(Boolean(controller)); }, []);
  const syncVideo = useCallback((state: number, currentTime: number, total: number) => {
    setVideoPlaying(state === 1);
    setVideoTime(Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0);
    setVideoDuration(Number.isFinite(total) ? Math.max(0, total) : 0);
  }, []);
  const toggleVideo = useCallback(() => {
    if (videoPlaying) videoControllerRef.current?.pauseVideo(); else videoControllerRef.current?.playVideo();
  }, [videoPlaying]);
  const seekVideo = useCallback((seconds: number) => videoControllerRef.current?.seekTo(Math.max(0, Math.min(videoDuration || seconds, seconds))), [videoDuration]);
  const setVideoVolume = useCallback((next: number) => {
    const normalized = Math.max(0, Math.min(1, next));
    setVolumeState(normalized);
    videoControllerRef.current?.setVolume(normalized);
  }, []);

  const closeAudio = useCallback(() => {
    pauseCurrent();
    const audio = player.getAudioElement();
    if (audio) { audio.removeAttribute('src'); audio.load(); }
    musicKitRef.current?.player.stop();
    setActiveAudio(null);
    setPlaybackOwner('none');
    setPlaying(false);
    setTime(0);
    setDuration(0);
    setError('');
  }, [pauseCurrent, player.getAudioElement]);

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
    if (activeAudio?.playbackKind === 'subscription') {
      if (time > 3) { void musicKitRef.current?.player.seekToTime(0); setTime(0); return; }
      if (queueIndex > 0) return playQueued(queueIndex - 1);
      if (repeat === 'all' && queue.length) return playQueued(queue.length - 1);
      if (activeAudio) return playAppleMusic(activeAudio);
    }
    const audio = player.getAudioElement();
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setTime(0);
      if (!playing) void audio.play().catch(() => {});
      return;
    }
    if (queueIndex > 0) return playQueued(queueIndex - 1);
    if (repeat === 'all' && queue.length) return playQueued(queue.length - 1);
    if (activeAudio) beginAudio(activeAudio, queueIndex);
  }, [activeAudio, beginAudio, playAppleMusic, playQueued, playing, queue.length, queueIndex, repeat, time, player.getAudioElement]);

  const toggle = useCallback(() => {
    if (activeVideo) { if (videoPlaying) videoControllerRef.current?.pauseVideo(); else videoControllerRef.current?.playVideo(); return; }
    if (activeAudio?.playbackKind === 'subscription') {
      const kit = musicKitRef.current;
      if (!kit) return;
      if (kit.player.isPlaying) kit.player.pause(); else void kit.player.play().catch(() => setError('Apple Music could not resume. Check the subscription and try again.'));
      return;
    }
    const audio = player.getAudioElement();
    if (!audio || !activeAudio) return;
    if (audio.paused) {
      attachAnalyser(audio);
      void audio.play().catch(() => setError('The audio could not resume. Try again or open the provider link.'));
    } else audio.pause();
  }, [activeAudio, activeVideo, player.getAudioElement, videoPlaying]);

  const seek = useCallback((seconds: number) => {
    if (activeAudio?.playbackKind === 'subscription') {
      void musicKitRef.current?.player.seekToTime(Math.max(0, Math.min(duration || seconds, seconds)));
      return;
    }
    const audio = player.getAudioElement();
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, seconds));
    setTime(audio.currentTime);
  }, [activeAudio, duration, player.getAudioElement]);

  const setVolume = useCallback((nextVolume: number) => {
    const normalized = Math.max(0, Math.min(1, nextVolume));
    setVolumeState(normalized);
    const audio = player.getAudioElement();
    if (audio) audio.volume = normalized;
    if (activeAudio?.playbackKind === 'subscription' && musicKitRef.current) musicKitRef.current.player.volume = normalized;
  }, [activeAudio, player.getAudioElement]);

  const setRepeatMode = useCallback((mode: RepeatMode) => {
    setRepeat(mode);
    const kit = musicKitRef.current;
    if (activeAudio?.playbackKind === 'subscription' && kit) kit.player.repeatMode = mode === 'off' ? 0 : mode === 'one' ? 1 : 2;
  }, [activeAudio]);

  const setShuffleMode = useCallback((enabled: boolean) => {
    setShuffle(enabled);
    if (activeAudio?.playbackKind === 'subscription' && musicKitRef.current) musicKitRef.current.player.shuffleMode = enabled ? 1 : 0;
  }, [activeAudio]);

  const syncAudio = useCallback((audio: HTMLAudioElement) => {
    setTime(audio.currentTime || 0);
    setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
  }, []);

  const onEnded = useCallback(() => {
    if (repeat === 'one') {
      const audio = player.getAudioElement();
      if (audio) { audio.currentTime = 0; void audio.play().catch(() => {}); }
      return;
    }
    next();
  }, [next, repeat, player.getAudioElement]);

  useEffect(() => {
    const audio = player.getAudioElement();
    if (!audio) return;
    const update = () => {
      if (activeAudio && activeAudio.playbackKind !== 'subscription') syncAudio(audio);
    };
    const playingEvent = () => {
      if (!activeAudio || activeAudio.playbackKind === 'subscription') return;
      setPlaying(true);
      setAudioActivity(`catalogue:${activeAudio.provider}:${activeAudio.id}`, true);
    };
    const pausedEvent = () => {
      if (!activeAudio || activeAudio.playbackKind === 'subscription') return;
      setPlaying(false);
      setAudioActivity(`catalogue:${activeAudio.provider}:${activeAudio.id}`, false);
    };
    const endedEvent = () => { if (activeAudio && activeAudio.playbackKind !== 'subscription') onEnded(); };
    const errorEvent = () => {
      if (!activeAudio || activeAudio.playbackKind === 'subscription') return;
      setPlaying(false);
      setAudioActivity(`catalogue:${activeAudio.provider}:${activeAudio.id}`, false);
      setError('This audio stream is unavailable in the current region or has expired. Open the provider page for options.');
    };
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('loadedmetadata', update);
    audio.addEventListener('durationchange', update);
    audio.addEventListener('play', playingEvent);
    audio.addEventListener('pause', pausedEvent);
    audio.addEventListener('ended', endedEvent);
    audio.addEventListener('error', errorEvent);
    return () => {
      audio.removeEventListener('timeupdate', update);
      audio.removeEventListener('loadedmetadata', update);
      audio.removeEventListener('durationchange', update);
      audio.removeEventListener('play', playingEvent);
      audio.removeEventListener('pause', pausedEvent);
      audio.removeEventListener('ended', endedEvent);
      audio.removeEventListener('error', errorEvent);
    };
  }, [activeAudio, onEnded, player.getAudioElement, syncAudio]);

  useEffect(() => {
    const stopExternalForAnotherSource = (event: Event) => {
      const owner = (event as CustomEvent<PlaybackOwner>).detail;
      if (owner === 'catalogue-audio' && !activeAudio && !activeVideo) return;
      if (activeAudio || activeVideo) {
        if (activeAudio) closeAudio();
        if (activeVideo) closeVideo();
      }
    };
    window.addEventListener('aak-playback-request', stopExternalForAnotherSource);
    return () => window.removeEventListener('aak-playback-request', stopExternalForAnotherSource);
  }, [activeAudio, activeVideo, closeAudio, closeVideo]);

  useEffect(() => {
    if (activeAudio?.playbackKind !== 'subscription' || !playing) return;
    const timer = window.setInterval(syncMusicKit, 500);
    return () => window.clearInterval(timer);
  }, [activeAudio, playing, syncMusicKit]);

  useEffect(() => () => {
    const kit = musicKitRef.current;
    for (const { name, listener } of musicKitListenersRef.current) kit?.removeEventListener(name, listener);
    kit?.player.stop();
    musicKitListenersRef.current = [];
  }, []);

  const value = useMemo<UniversalPlayerContextValue>(() => ({
    activeAudio, activeVideo, queue, queueIndex, playing, volume, repeat, shuffle, error,
    videoPlaying, videoReady, setVideoController, syncVideo, toggleVideo, seekVideo, setVideoVolume,
    playAudio, playAppleMusic, playVideo, addToQueue, clearQueue, playQueued, closeVideo, closeAudio, toggle, next, prev, seek, setVolume,
    setRepeat: setRepeatMode, setShuffle: setShuffleMode, setError, syncAudio, onEnded,
  }), [activeAudio, activeVideo, queue, queueIndex, playing, volume, repeat, shuffle, error, videoPlaying, videoReady,
    setVideoController, syncVideo, toggleVideo, seekVideo, setVideoVolume, playAudio, playAppleMusic, playVideo, addToQueue, clearQueue, playQueued, closeVideo, closeAudio, toggle, next, prev, seek, setVolume, setRepeatMode, setShuffleMode, syncAudio, onEnded]);

  const clock = useMemo(() => ({ time, duration, videoTime, videoDuration }), [time, duration, videoTime, videoDuration]);
  return (
    <Context.Provider value={value}>
      <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>
    </Context.Provider>
  );
}

export function useUniversalPlayer() {
  const value = useContext(Context);
  if (!value) throw new Error('useUniversalPlayer must be used inside UniversalPlayerProvider.');
  return value;
}

export function useUniversalPlayerTime() {
  return useContext(ClockContext);
}

export function useUniversalPlayerStatus() {
  const player = useUniversalPlayer();
  return { activeAudio: player.activeAudio, activeVideo: player.activeVideo, playing: player.playing, videoPlaying: player.videoPlaying };
}
