import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePlayer } from './usePlayer';
import { attachAnalyser } from './analyser';
import { claimPlayback, setAudioActivity, setPlaybackOwner, type PlaybackOwner } from '../utils/audioBus';
import type { AudioCatalogTrack, YouTubeResult } from '../services/music/types';
import type { PlayableItem } from '../services/music/recommendations';
import { toPlayableItem } from '../services/music/recommendations';
import { tracks, type Track } from '../data';
import { getMusicKitInstance, type MusicKitInstance } from '../services/music/appleMusicKit';

export interface YouTubeTransportController {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
}

export type RepeatMode = 'off' | 'all' | 'one';
type QueueContinuation =
  | { kind: 'video'; items: YouTubeResult[]; index: number }
  | { kind: 'audio'; items: AudioCatalogTrack[]; index: number }
  | { kind: 'local'; index: number; shuffle: boolean; repeat: RepeatMode };

interface UniversalPlayerClock {
  time: number;
  duration: number;
  videoTime: number;
  videoDuration: number;
}

export interface UniversalPlayerContextValue {
  activeAudio: AudioCatalogTrack | null;
  activeVideo: YouTubeResult | null;
  videoQueue: YouTubeResult[];
  videoQueueIndex: number;
  queue: AudioCatalogTrack[];
  queueIndex: number;
  userQueue: PlayableItem[];
  currentItem: PlayableItem;
  isQueueOpen: boolean;
  setIsQueueOpen: (open: boolean) => void;
  toggleQueue: () => void;
  addToUserQueue: (item: PlayableItem | Track | AudioCatalogTrack | YouTubeResult) => void;
  removeFromUserQueue: (index: number) => void;
  moveUserQueueItem: (fromIndex: number, toIndex: number) => void;
  clearUserQueue: () => void;
  playItem: (item: PlayableItem, preserveQueueContext?: boolean) => void;
  playing: boolean;
  volume: number;
  repeat: RepeatMode;
  shuffle: boolean;
  error: string;
  videoPlaying: boolean;
  videoReady: boolean;
  videoMode: boolean;
  setVideoController: (controller: YouTubeTransportController | null) => void;
  syncVideo: (state: number, currentTime: number, duration: number) => void;
  toggleVideo: () => void;
  seekVideo: (seconds: number) => void;
  setVideoVolume: (volume: number) => void;
  playAudio: (track: AudioCatalogTrack, sequence?: AudioCatalogTrack[], preserveQueueContext?: boolean) => void;
  playAppleMusic: (track: AudioCatalogTrack) => void;
  selectVideo: (video: YouTubeResult, sequence?: YouTubeResult[], preserveQueueContext?: boolean) => void;
  playVideo: (video: YouTubeResult, sequence?: YouTubeResult[], preserveQueueContext?: boolean) => void;
  setVideoQueue: (sequence: YouTubeResult[]) => void;
  nextVideo: () => void;
  prevVideo: () => void;
  enterVideoMode: () => void;
  exitVideoMode: () => void;
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
const randomIndexExcept = (length: number, current: number) => {
  if (length < 2) return current;
  const candidate = Math.floor(Math.random() * (length - 1));
  return candidate >= current ? candidate + 1 : candidate;
};

export function UniversalPlayerProvider({ children }: { children: ReactNode }) {
  const player = usePlayer();
  const musicKitRef = useRef<MusicKitInstance | null>(null);
  const musicKitListenersRef = useRef<Array<{ name: string; listener: (event?: unknown) => void }>>([]);
  const musicKitPlayingRef = useRef(false);
  const musicKitEndHandledRef = useRef(false);
  const suppressMusicKitEndRef = useRef(false);
  const musicKitEndedHandlerRef = useRef<() => void>(() => {});
  const videoControllerRef = useRef<YouTubeTransportController | null>(null);
  const [activeAudio, setActiveAudio] = useState<AudioCatalogTrack | null>(null);
  const [activeVideo, setActiveVideo] = useState<YouTubeResult | null>(null);
  const [videoQueue, setVideoQueueState] = useState<YouTubeResult[]>([]);
  const [videoQueueIndex, setVideoQueueIndex] = useState(-1);
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
  const [videoMode, setVideoMode] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [userQueue, setUserQueue] = useState<PlayableItem[]>([]);
  const queueContinuationRef = useRef<QueueContinuation | null>(null);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const toggleQueue = useCallback(() => setIsQueueOpen((open) => !open), []);

  const syncMusicKit = useCallback(() => {
    const kit = musicKitRef.current;
    if (!kit) return;
    const isPlaying = Boolean(kit.player.isPlaying);
    const current = kit.player.currentPlaybackTime;
    const total = kit.player.currentPlaybackDuration;
    if (isPlaying) {
      musicKitEndHandledRef.current = false;
      suppressMusicKitEndRef.current = false;
    }
    if (musicKitPlayingRef.current && !isPlaying && !suppressMusicKitEndRef.current && !musicKitEndHandledRef.current && Number.isFinite(total) && total > 0 && current >= total - 1) {
      musicKitEndHandledRef.current = true;
      musicKitEndedHandlerRef.current();
    }
    musicKitPlayingRef.current = isPlaying;
    setPlaying(isPlaying);
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
    if (activeAudio?.playbackKind === 'subscription') {
      suppressMusicKitEndRef.current = true;
      musicKitRef.current?.player.pause();
    }
    if (audio) audio.pause();
    if (activeAudio) setAudioActivity(`catalogue:${activeAudio.provider}:${activeAudio.id}`, false);
    setPlaybackOwner('none');
  }, [activeAudio, player.getAudioElement]);

  const beginAudio = useCallback((track: AudioCatalogTrack, index: number, preserveQueueContext = false) => {
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
    setVideoPlaying(false); setVideoReady(false); setVideoMode(false); setVideoTime(0); setVideoDuration(0); videoControllerRef.current = null;
    if (!preserveQueueContext) { setVideoQueueState([]); setVideoQueueIndex(-1); }
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

  const playAppleMusic = useCallback(async (track: AudioCatalogTrack, preserveQueueContext = false) => {
    claimPlayback('apple-musickit');
    const audio = player.getAudioElement();
    audio?.pause();
    if (activeAudio) setAudioActivity(`catalogue:${activeAudio.provider}:${activeAudio.id}`, false);
    if (player.playing) player.toggle();
    setPlaying(false); setTime(0); setDuration(0); setError('Connecting to Apple Music…');
    setActiveAudio(track);
    setActiveVideo(null); if (!preserveQueueContext) { setVideoQueueState([]); setVideoQueueIndex(-1); } setVideoPlaying(false); setVideoReady(false); setVideoMode(false); videoControllerRef.current = null;
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

  const playAudio = useCallback((track: AudioCatalogTrack, sequence: AudioCatalogTrack[] = [track], preserveQueueContext = false) => {
    const nextQueue = [...new Map([...sequence, track].map((item) => [`${item.provider}:${item.id}`, item])).values()];
    const selectedIndex = nextQueue.findIndex((item) => sameTrack(item, track));
    if (!preserveQueueContext) {
      queueContinuationRef.current = null;
      setQueue(nextQueue);
      setQueueIndex(selectedIndex);
    }

    // Replace the active source before starting another provider. The shared local
    // audio element and YouTube iframe are paused in place; neither is duplicated.
    pauseCurrent();
    videoControllerRef.current?.pauseVideo();
    setActiveVideo(null);
    if (!preserveQueueContext) {
      setVideoQueueState([]);
      setVideoQueueIndex(-1);
    }
    setVideoPlaying(false);
    setVideoReady(false);
    setVideoMode(false);
    setVideoTime(0);
    setVideoDuration(0);
    videoControllerRef.current = null;
    setPlaybackOwner('none');
    if (player.playing) player.toggle();
    if (track.playbackKind === 'subscription') {
      void playAppleMusic(track, preserveQueueContext);
      return;
    }
    beginAudio(track, preserveQueueContext ? queueIndex : selectedIndex, preserveQueueContext);
  }, [beginAudio, pauseCurrent, player, playAppleMusic, queueIndex]);

  const addToQueue = useCallback((track: AudioCatalogTrack) => {
    setQueue((current) => current.some((queued) => sameTrack(queued, track)) ? current : [...current, track]);
  }, []);

  const playQueued = useCallback((index: number) => {
    const track = queue[index];
    if (!track) return;
    playAudio(track, queue);
  }, [queue, playAudio]);

  const selectVideo = useCallback((video: YouTubeResult, sequence: YouTubeResult[] = [video], preserveQueueContext = false) => {
    pauseCurrent();
    claimPlayback('youtube-iframe');
    musicKitRef.current?.player.stop();
    if (player.playing) player.toggle();
    setActiveAudio(null);
    setActiveVideo(video);
    if (!preserveQueueContext) {
      queueContinuationRef.current = null;
      const uniqueSequence = [...new Map([...sequence, video].map((item) => [item.id, item])).values()];
      setVideoQueueState(uniqueSequence);
      setVideoQueueIndex(uniqueSequence.findIndex((item) => item.id === video.id));
    }
    setPlaybackOwner('youtube-iframe');
    setPlaying(false);
    setTime(0);
    setDuration(0);
    setVideoPlaying(false); setVideoReady(false); setVideoMode(false); setVideoTime(0); setVideoDuration(0); videoControllerRef.current = null;
    setError('');
    const audio = player.getAudioElement();
    if (audio) { audio.removeAttribute('src'); audio.load(); }
  }, [pauseCurrent, player]);

  const enterVideoMode = useCallback(() => {
    if (!activeVideo) return;
    if (activeVideo.embeddingStatus === 'blocked') {
      setError('This video owner has disabled embedded playback. Open it on YouTube instead.');
      return;
    }
    setError('');
    setVideoMode(true);
    setPlaybackOwner('youtube-iframe');
  }, [activeVideo]);

  const exitVideoMode = useCallback(() => {
    videoControllerRef.current?.pauseVideo();
    setVideoMode(false);
    setVideoPlaying(false);
    setError('');
    setPlaybackOwner('none');
  }, []);

  const playVideo = useCallback((video: YouTubeResult, sequence?: YouTubeResult[], preserveQueueContext = false) => {
    if (activeVideo?.id === video.id && videoMode && videoReady) {
      if (!videoPlaying) videoControllerRef.current?.playVideo();
      return;
    }
    selectVideo(video, sequence, preserveQueueContext);
    if (video.embeddingStatus === 'blocked' || (video.embeddable === false && video.embeddingStatus !== 'unknown')) {
      setVideoMode(false);
      setError('This video owner has disabled embedded playback. Open it on YouTube instead.');
      return;
    }
    setVideoMode(true);
  }, [activeVideo, selectVideo, videoMode, videoReady, videoPlaying]);

  const setVideoQueue = useCallback((sequence: YouTubeResult[]) => {
    if (!activeVideo) return;
    const uniqueSequence = [...new Map([...sequence, activeVideo].map((item) => [item.id, item])).values()];
    setVideoQueueState(uniqueSequence);
    setVideoQueueIndex(uniqueSequence.findIndex((item) => item.id === activeVideo.id));
  }, [activeVideo]);

  const nextVideo = useCallback(() => {
    if (!videoQueue.length || videoQueueIndex < 0) return;
    let index = videoQueueIndex + 1;
    if (shuffle && videoQueue.length > 1) {
      index = Math.floor(Math.random() * videoQueue.length);
      if (index === videoQueueIndex) index = (index + 1) % videoQueue.length;
    } else if (index >= videoQueue.length) {
      if (repeat !== 'all') return;
      index = 0;
    }
    playVideo(videoQueue[index], videoQueue);
  }, [playVideo, repeat, shuffle, videoQueue, videoQueueIndex]);

  const prevVideo = useCallback(() => {
    if (videoTime > 3) { videoControllerRef.current?.seekTo(0); setVideoTime(0); return; }
    if (!videoQueue.length || videoQueueIndex < 0) return;
    let index = videoQueueIndex - 1;
    if (index < 0) {
      if (repeat !== 'all') { videoControllerRef.current?.seekTo(0); setVideoTime(0); return; }
      index = videoQueue.length - 1;
    }
    playVideo(videoQueue[index], videoQueue);
  }, [playVideo, repeat, videoQueue, videoQueueIndex, videoTime]);

  const closeVideo = useCallback(() => { videoControllerRef.current?.pauseVideo(); setActiveVideo(null); setVideoQueueState([]); setVideoQueueIndex(-1); setVideoPlaying(false); setVideoReady(false); setVideoMode(false); setVideoTime(0); setVideoDuration(0); videoControllerRef.current = null; setPlaybackOwner('none'); }, []);

  const setVideoController = useCallback((controller: YouTubeTransportController | null) => { videoControllerRef.current = controller; setVideoReady(Boolean(controller)); }, []);
  const handleVideoEndedRef = useRef<() => void>(() => {});
  handleVideoEndedRef.current = () => {
    if (!activeVideo || !videoMode) return;
    if (userQueue.length > 0 || queueContinuationRef.current) { next(); return; }
    if (repeat === 'one') {
      videoControllerRef.current?.seekTo(0);
      videoControllerRef.current?.playVideo();
    } else nextVideo();
  };
  const syncVideo = useCallback((state: number, currentTime: number, total: number) => {
    setVideoPlaying(state === 1);
    setVideoTime(Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0);
    setVideoDuration(Number.isFinite(total) ? Math.max(0, total) : 0);
    if (state === 0) handleVideoEndedRef.current();
  }, []);
  const toggleVideo = useCallback(() => {
    if (!videoMode) return;
    if (videoPlaying) videoControllerRef.current?.pauseVideo(); else videoControllerRef.current?.playVideo();
  }, [videoMode, videoPlaying]);
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

  const playItem = useCallback((item: PlayableItem, preserveQueueContext = false) => {
    if (item.kind === 'video') {
      playVideo(item.raw, [item.raw], preserveQueueContext);
    } else if (item.kind === 'external') {
      playAudio(item.raw, undefined, preserveQueueContext);
    } else {
      if (!preserveQueueContext) queueContinuationRef.current = null;
      pauseCurrent();
      closeVideo();
      closeAudio();
      player.play(item.trackIndex);
    }
  }, [playVideo, playAudio, pauseCurrent, closeVideo, closeAudio, player]);

  const addToUserQueue = useCallback((source: PlayableItem | Track | AudioCatalogTrack | YouTubeResult) => {
    const item = toPlayableItem(source);
    setUserQueue((current) => [...current, item]);
  }, []);

  const removeFromUserQueue = useCallback((index: number) => {
    setUserQueue((current) => current.filter((_, i) => i !== index));
  }, []);

  const moveUserQueueItem = useCallback((fromIndex: number, toIndex: number) => {
    setUserQueue((current) => {
      if (fromIndex < 0 || fromIndex >= current.length || toIndex < 0 || toIndex >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const clearUserQueue = useCallback(() => {
    setUserQueue([]);
  }, []);

  const currentItem = useMemo<PlayableItem>(() => {
    if (activeVideo) {
      return {
        kind: 'video',
        id: activeVideo.id,
        title: activeVideo.title,
        artist: activeVideo.artist,
        image: activeVideo.thumbnail,
        durationSeconds: activeVideo.durationSeconds || videoDuration || 0,
        provider: 'YouTube',
        watchUrl: activeVideo.watchUrl,
        embeddable: activeVideo.embeddable,
        embeddingStatus: activeVideo.embeddingStatus,
        raw: activeVideo,
      };
    }
    if (activeAudio) {
      return {
        kind: 'external',
        id: activeAudio.id,
        title: activeAudio.title,
        artist: activeAudio.artist,
        album: activeAudio.album,
        image: activeAudio.image,
        durationSeconds: activeAudio.durationSeconds || duration || 0,
        provider: activeAudio.provider,
        playbackKind: activeAudio.playbackKind,
        genre: activeAudio.genre,
        raw: activeAudio,
      };
    }
    return toPlayableItem(player.track);
  }, [activeVideo, activeAudio, videoDuration, duration, player.track]);

  const next = useCallback(() => {
    if (userQueue.length > 0) {
      if (!queueContinuationRef.current) {
        if (activeVideo) queueContinuationRef.current = { kind: 'video', items: videoQueue, index: videoQueueIndex };
        else if (activeAudio) queueContinuationRef.current = { kind: 'audio', items: queue, index: queueIndex };
        else queueContinuationRef.current = { kind: 'local', index: player.i, shuffle: player.shuffle, repeat: player.repeat };
      }
      const [nextItem, ...remaining] = userQueue;
      setUserQueue(remaining);
      playItem(nextItem, true);
      return;
    }
    if (queueContinuationRef.current) {
      const continuation = queueContinuationRef.current;
      queueContinuationRef.current = null;
      if (continuation.kind === 'video' && continuation.items.length > 0) {
        let index = continuation.index;
        if (repeat !== 'one') {
          index = shuffle && continuation.items.length > 1
            ? randomIndexExcept(continuation.items.length, continuation.index)
            : continuation.index + 1;
          if (index >= continuation.items.length) {
            if (repeat !== 'all') index = -1;
            else index = 0;
          }
        }
        if (index >= 0) { playVideo(continuation.items[index], continuation.items); return; }
      } else if (continuation.kind === 'audio' && continuation.items.length > 0) {
        let index = continuation.index;
        if (repeat !== 'one') {
          index = shuffle && continuation.items.length > 1
            ? randomIndexExcept(continuation.items.length, continuation.index)
            : continuation.index + 1;
          if (index >= continuation.items.length) {
            if (repeat !== 'all') index = -1;
            else index = 0;
          }
        }
        if (index >= 0) { playAudio(continuation.items[index], continuation.items); return; }
      } else if (continuation.kind === 'local') {
        let index = continuation.index;
        if (continuation.repeat !== 'one') {
          index = continuation.shuffle && tracks.length > 1
            ? randomIndexExcept(tracks.length, continuation.index)
            : continuation.index + 1;
          if (index >= tracks.length) {
            if (continuation.repeat !== 'all') index = -1;
            else index = 0;
          }
        }
        if (index >= 0) {
          pauseCurrent();
          closeVideo();
          closeAudio();
          player.play(index);
          return;
        }
      }
      if (activeVideo) { videoControllerRef.current?.pauseVideo(); setVideoPlaying(false); }
      else if (activeAudio) { pauseCurrent(); setPlaying(false); }
      else if (player.playing) player.toggle();
      return;
    }
    if (activeVideo) {
      nextVideo();
      return;
    }
    if (activeAudio) {
      if (!queue.length) return;
      if (shuffle && queue.length > 1) {
        let index = queueIndex;
        while (index === queueIndex) index = Math.floor(Math.random() * queue.length);
        playQueued(index);
        return;
      }
      const index = queueIndex + 1;
      if (index >= queue.length) {
        if (repeat === 'all') { playQueued(0); return; }
        if (activeAudio.playbackKind === 'subscription') musicKitRef.current?.player.pause();
        else player.getAudioElement()?.pause();
        setPlaying(false);
        return;
      }
      playQueued(index);
      return;
    }
    player.next();
  }, [userQueue, activeVideo, videoQueue, videoQueueIndex, nextVideo, activeAudio, queue, shuffle, queueIndex, repeat, playQueued, player, playItem, playVideo, playAudio, pauseCurrent, closeVideo, closeAudio]);
  musicKitEndedHandlerRef.current = next;

  useEffect(() => {
    const onLocalTrackEnded = (event: Event) => {
      if (userQueue.length === 0 && !queueContinuationRef.current) return;
      event.preventDefault();
      next();
    };
    window.addEventListener('aak-local-audio-ended', onLocalTrackEnded);
    return () => window.removeEventListener('aak-local-audio-ended', onLocalTrackEnded);
  }, [next, userQueue.length]);

  const prev = useCallback(() => {
    const currentSeconds = activeVideo ? videoTime : activeAudio ? time : player.getAudioElement()?.currentTime || 0;
    if (currentSeconds > 3) {
      if (activeVideo) { videoControllerRef.current?.seekTo(0); setVideoTime(0); return; }
      if (activeAudio?.playbackKind === 'subscription') { void musicKitRef.current?.player.seekToTime(0); setTime(0); return; }
      const audio = player.getAudioElement();
      if (audio) { audio.currentTime = 0; setTime(0); if (!playing) void audio.play().catch(() => {}); return; }
    }
    if (activeVideo) {
      prevVideo();
      return;
    }
    if (activeAudio) {
      if (activeAudio.playbackKind === 'subscription') {
        if (queueIndex > 0) return playQueued(queueIndex - 1);
        if (repeat === 'all' && queue.length) return playQueued(queue.length - 1);
        if (activeAudio) return playAppleMusic(activeAudio);
      }
      if (queueIndex > 0) return playQueued(queueIndex - 1);
      if (repeat === 'all' && queue.length) return playQueued(queue.length - 1);
      if (activeAudio) beginAudio(activeAudio, queueIndex);
      return;
    }
    player.prev();
  }, [activeVideo, activeAudio, videoTime, time, player, playing, prevVideo, queueIndex, repeat, queue.length, playQueued, playAppleMusic, beginAudio]);

  const toggle = useCallback(() => {
    if (activeVideo) { if (!videoMode) return; if (videoPlaying) videoControllerRef.current?.pauseVideo(); else videoControllerRef.current?.playVideo(); return; }
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
  }, [activeAudio, activeVideo, player.getAudioElement, videoMode, videoPlaying]);

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
    if (userQueue.length > 0 || queueContinuationRef.current) { next(); return; }
    if (repeat === 'one') {
      const audio = player.getAudioElement();
      if (audio) { audio.currentTime = 0; void audio.play().catch(() => {}); }
      return;
    }
    next();
  }, [next, repeat, player.getAudioElement, userQueue.length]);

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
    activeAudio, activeVideo, queue, queueIndex, videoQueue, videoQueueIndex,
    userQueue, currentItem, isQueueOpen, setIsQueueOpen, toggleQueue,
    addToUserQueue, removeFromUserQueue, moveUserQueueItem, clearUserQueue, playItem,
    playing, volume, repeat, shuffle, error,
    videoPlaying, videoReady, videoMode, setVideoController, syncVideo, toggleVideo, seekVideo, setVideoVolume,
    playAudio, playAppleMusic, selectVideo, playVideo, setVideoQueue, nextVideo, prevVideo, enterVideoMode, exitVideoMode, addToQueue, clearQueue, playQueued, closeVideo, closeAudio, toggle, next, prev, seek, setVolume,
    setRepeat: setRepeatMode, setShuffle: setShuffleMode, setError, syncAudio, onEnded,
  }), [activeAudio, activeVideo, queue, queueIndex, videoQueue, videoQueueIndex,
    userQueue, currentItem, isQueueOpen, toggleQueue,
    addToUserQueue, removeFromUserQueue, moveUserQueueItem, clearUserQueue, playItem,
    playing, volume, repeat, shuffle, error, videoPlaying, videoReady, videoMode,
    setVideoController, syncVideo, toggleVideo, seekVideo, setVideoVolume, playAudio, playAppleMusic, selectVideo, playVideo, setVideoQueue, nextVideo, prevVideo, enterVideoMode, exitVideoMode, addToQueue, clearQueue, playQueued, closeVideo, closeAudio, toggle, next, prev, seek, setVolume, setRepeatMode, setShuffleMode, syncAudio, onEnded]);

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
