import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { tracks } from '../data';
import { fmt, usePlayer, useTime } from '../hooks/usePlayer';
import { useUniversalPlayer, useUniversalPlayerTime } from '../hooks/useUniversalPlayer';
import Art from './Art';
import Icon from './Icon';
import VisualizerToolbar from './VisualizerToolbar';
import EqualizerControl from './EqualizerControl';
import FullPlayerModal from './FullPlayerModal';
import YouTubeVideoModal from './YouTubeVideoModal';
import QueuePanel from './QueuePanel';

export default function UniversalPlayer() {
  const local = usePlayer();
  const localTime = useTime();
  const player = useUniversalPlayer();
  const playerClock = useUniversalPlayerTime();

  const [dismissed, setDismissed] = useState(false);
  const [videoFrameStyle, setVideoFrameStyle] = useState<CSSProperties | null>(null);

  const dockRef = useRef<HTMLDivElement>(null);
  const videoVolumeRef = useRef(player.volume);
  const previousVolume = useRef(0.85);

  const localRef = useRef(local);
  const universalRef = useRef(player);
  const clockRef = useRef(playerClock);
  localRef.current = local;
  universalRef.current = player;
  clockRef.current = playerClock;
  videoVolumeRef.current = player.volume;

  const video = player.activeVideo;
  const isVideoMode = Boolean(video && player.videoMode);
  const compactYouTubeDock = Boolean(video && player.videoMode && !local.isExpanded);

  // When playback starts or new track is selected, un-dismiss the dock
  useEffect(() => {
    if (player.playing || player.videoPlaying || local.playing) {
      setDismissed(false);
    }
  }, [player.playing, player.videoPlaying, local.playing]);

  const showDock = Boolean(
    (player.activeAudio || player.activeVideo || local.hasInitiatedPlayback || local.playing) &&
    !dismissed
  );

  const onVideoPlayback = useCallback(
    (state: number, time: number, total: number) => player.syncVideo(state, time, total),
    [player.syncVideo]
  );

  const onVideoController = useCallback(
    (controller: Parameters<typeof player.setVideoController>[0]) => {
      player.setVideoController(controller);
      if (controller) controller.setVolume(videoVolumeRef.current);
    },
    [player.setVideoController]
  );

  const onVideoError = useCallback(
    (message: string) => player.setError(message),
    [player.setError]
  );

  // Synchronize YouTube video placement over the dock or full player slot
  useEffect(() => {
    if (!isVideoMode) {
      setVideoFrameStyle(null);
      return;
    }
    let animation = 0;
    const updateFrame = () => {
      cancelAnimationFrame(animation);
      animation = requestAnimationFrame(() => {
        const slot = document.querySelector<HTMLElement>('[data-aak-youtube-player-slot]');
        if (!slot) {
          setVideoFrameStyle(null);
          return;
        }
        const rect = slot.getBoundingClientRect();
        if (rect.width < 180 || rect.height < 120) {
          setVideoFrameStyle(null);
          return;
        }
        setVideoFrameStyle({
          position: 'fixed',
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          zIndex: 120,
        });
      });
    };

    const slot = document.querySelector<HTMLElement>('[data-aak-youtube-player-slot]');
    const observer = slot && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateFrame) : null;
    const mutations = typeof MutationObserver !== 'undefined' ? new MutationObserver(updateFrame) : null;
    if (slot) observer?.observe(slot);
    mutations?.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });

    window.addEventListener('resize', updateFrame);
    window.addEventListener('scroll', updateFrame, true);
    updateFrame();

    return () => {
      cancelAnimationFrame(animation);
      observer?.disconnect();
      mutations?.disconnect();
      window.removeEventListener('resize', updateFrame);
      window.removeEventListener('scroll', updateFrame, true);
    };
  }, [isVideoMode, video?.id, local.isExpanded]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (event.code === 'Space') {
        event.preventDefault();
        if (universalRef.current.activeAudio || universalRef.current.activeVideo) universalRef.current.toggle();
        else localRef.current.toggle();
      } else if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        if (universalRef.current.activeVideo || universalRef.current.activeAudio) {
          const currentVol = universalRef.current.volume;
          if (currentVol > 0.01) previousVolume.current = currentVol;
          const nextVolume = currentVol > 0.01 ? 0 : previousVolume.current || 0.85;
          if (universalRef.current.activeVideo) universalRef.current.setVideoVolume(nextVolume);
          else universalRef.current.setVolume(nextVolume);
        } else if (localRef.current.vol > 0) {
          previousVolume.current = localRef.current.vol;
          localRef.current.setVol(0);
        } else {
          localRef.current.setVol(previousVolume.current || 0.85);
        }
      } else if (event.code === 'ArrowRight' && (event.metaKey || event.ctrlKey || event.altKey)) {
        event.preventDefault();
        universalRef.current.next();
      } else if (event.code === 'ArrowLeft' && (event.metaKey || event.ctrlKey || event.altKey)) {
        event.preventDefault();
        universalRef.current.prev();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const external = player.activeAudio;
  const currentItem = player.currentItem;
  const title = currentItem.title;
  const artist = currentItem.artist;
  const provider = currentItem.provider;
  const isPlaying = video ? player.videoPlaying : external ? player.playing : local.playing;
  const currentTime = video ? playerClock.videoTime : external ? playerClock.time : localTime.t;
  const duration = video
    ? playerClock.videoDuration || video.durationSeconds || 0
    : external
    ? playerClock.duration || external.durationSeconds || 0
    : localTime.dur || currentItem.durationSeconds;

  const volume = video || external ? player.volume : local.vol;
  const repeat = video || external ? player.repeat : local.repeat;
  const shuffle = video || external ? player.shuffle : local.shuffle;

  const canSeek = video
    ? player.videoMode && player.videoReady && playerClock.videoDuration > 0
    : external
    ? playerClock.duration > 0
    : Boolean(local.track.src && localTime.dur > 0);

  const playToggle = video ? player.toggleVideo : external ? player.toggle : local.toggle;
  const setVolume = video ? player.setVideoVolume : external ? player.setVolume : local.setVol;
  const seek = video ? player.seekVideo : external ? player.seek : local.seek;
  const previous = () => player.prev();
  const next = () => player.next();

  const toggleShuffle = () =>
    video || external ? player.setShuffle(!shuffle) : local.toggleShuffle();

  const toggleRepeat = () =>
    video || external
      ? player.setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')
      : local.toggleRepeat();

  const changeVolume = (value: number) => {
    if (value > 0.01) previousVolume.current = value;
    setVolume(value);
  };

  const toggleMute = () => {
    if (volume > 0.01) {
      previousVolume.current = volume;
      setVolume(0);
    } else {
      setVolume(previousVolume.current || 0.85);
    }
  };

  const handleDismiss = () => {
    if (isPlaying) playToggle();
    setDismissed(true);
  };

  const isFavorite = local.isFavorite(currentItem.id);
  const queueCount = player.userQueue.length;

  return (
    <>
      {/* Full Player Modal */}
      {local.isExpanded && <FullPlayerModal />}

      {/* Shared Playback Queue Drawer */}
      <QueuePanel />

      {/* Mini-Player Dock */}
      {showDock && !local.isExpanded && (
        <div
          ref={dockRef}
          role="region"
          aria-label="AAK Music Mini Player"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-bone/15 bg-ink/95 text-bone shadow-[0_-10px_35px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all"
        >
          {/* Active YouTube Video Slot (when in video mode) */}
          {video && player.videoMode && (
            <div
              data-aak-youtube-player-slot
              aria-label={`Official YouTube player: ${video.title}`}
              className={`mx-auto aspect-video w-full bg-black ${
                compactYouTubeDock ? 'max-w-[200px] min-h-[112px]' : 'max-w-[560px] min-h-[180px]'
              }`}
            />
          )}

          {/* Interactive Top Scrub Bar (when not YouTube video) */}
          {!video && (
            <div className="group relative h-1 w-full cursor-pointer bg-bone/10 transition-all hover:h-2">
              <div
                className="h-full bg-gradient-to-r from-cyan to-accent transition-all"
                style={{ width: `${Math.min(100, duration > 0 ? (currentTime / duration) * 100 : 0)}%` }}
              />
              <input
                aria-label="Seek track position"
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                disabled={!canSeek}
                onChange={(e) => seek(Number(e.target.value))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
          )}

          {/* MAIN DOCK CONTAINER */}
          <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-3 py-2.5 pb-[max(env(safe-area-inset-bottom),0.625rem)] sm:px-6 md:px-8">
            {/* 1. LEFT: TRACK IDENTITY & ARTWORK */}
            <div className="flex min-w-0 max-w-[38%] items-center gap-3 sm:max-w-[32%] md:max-w-[30%]">
              <button
                type="button"
                onClick={() => local.setIsExpanded(true)}
                aria-label="Open full expanded player"
                className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-bone/15 bg-raised shadow-md transition hover:scale-105 sm:h-13 sm:w-13"
              >
                {currentItem.image ? (
                  <img src={currentItem.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Art a={240} b={190} className="h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
                  <Icon n="expand" s={16} />
                </div>
              </button>

              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => local.setIsExpanded(true)}
                  className="block w-full truncate text-left font-display text-xs font-bold text-bone transition hover:text-cyan sm:text-sm"
                  title={title}
                >
                  {title}
                </button>
                <p className="truncate text-[10px] text-bone/60 sm:text-xs" title={artist}>
                  {artist}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="truncate rounded bg-cyan/15 px-1.5 py-0.2 text-[8px] font-mono uppercase tracking-wider text-cyan sm:text-[9px]">
                    {provider}
                  </span>
                  {!video && currentItem.kind === 'local' && (
                    <span className="hidden font-mono text-[9px] text-bone/40 sm:inline">
                      {local.track.bpm} BPM
                    </span>
                  )}
                </div>
              </div>

              {!video && currentItem.kind === 'local' && (
                <button
                  type="button"
                  onClick={() => local.toggleFavorite(currentItem.id)}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  className={`hidden h-8 w-8 shrink-0 place-items-center rounded-full transition sm:grid ${
                    isFavorite ? 'text-pink-400' : 'text-bone/45 hover:text-pink-300'
                  }`}
                >
                  <Icon n="heart" s={16} />
                </button>
              )}
            </div>

            {/* 2. CENTER: PRIMARY PLAYBACK CONTROLS */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={toggleShuffle}
                aria-label={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'}
                aria-pressed={shuffle}
                className={`hidden h-9 w-9 place-items-center rounded-full transition sm:grid ${
                  shuffle ? 'text-cyan bg-cyan/10' : 'text-bone/50 hover:text-bone'
                }`}
                title="Shuffle"
              >
                <Icon n="shuffle" s={16} />
              </button>

              <button
                type="button"
                onClick={previous}
                aria-label="Previous track"
                className="hidden xs:grid h-9 w-9 min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 place-items-center rounded-full text-bone/75 transition hover:bg-bone/10 hover:text-cyan active:scale-95 sm:h-10 sm:w-10"
              >
                <Icon n="prev" s={18} />
              </button>

              <button
                type="button"
                onClick={playToggle}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="grid h-10 w-10 min-h-[40px] min-w-[40px] place-items-center rounded-full bg-bone text-ink shadow-lg transition hover:bg-cyan hover:scale-105 active:scale-95 sm:h-12 sm:w-12"
              >
                <Icon n={isPlaying ? 'pause' : 'play'} s={20} />
              </button>

              <button
                type="button"
                onClick={next}
                aria-label="Next track"
                className="grid h-9 w-9 min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 place-items-center rounded-full text-bone/75 transition hover:bg-bone/10 hover:text-cyan active:scale-95 sm:h-10 sm:w-10"
              >
                <Icon n="next" s={18} />
              </button>

              <button
                type="button"
                onClick={toggleRepeat}
                aria-label={`Repeat ${repeat}`}
                aria-pressed={repeat !== 'off'}
                className={`relative hidden h-9 w-9 place-items-center rounded-full transition sm:grid ${
                  repeat !== 'off' ? 'text-cyan bg-cyan/10' : 'text-bone/50 hover:text-bone'
                }`}
                title={`Repeat: ${repeat}`}
              >
                <Icon n="repeat" s={16} />
                {repeat === 'one' && (
                  <span className="absolute bottom-1 right-1 text-[8px] font-bold">1</span>
                )}
              </button>
            </div>

            {/* 3. RIGHT: PROGRESS, VOLUME, QUEUE & ACTIONS */}
            <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2.5">
              {/* Monospace time readout on medium+ screens */}
              <div className="hidden font-mono text-[10px] tabular-nums text-bone/55 md:block">
                <span>{fmt(currentTime)}</span>
                <span className="mx-1 text-bone/30">/</span>
                <span>{fmt(duration)}</span>
              </div>

              {/* Volume Slider & Mute Toggle */}
              <div className="hidden items-center gap-1.5 lg:flex">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={volume <= 0.01 ? 'Unmute' : 'Mute'}
                  className="grid h-8 w-8 place-items-center rounded text-bone/50 transition hover:text-cyan"
                >
                  <Icon n={volume <= 0.01 ? 'muted' : 'volume'} s={16} />
                </button>
                <input
                  aria-label="Player volume"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => changeVolume(Number(e.target.value))}
                  className="h-1.5 w-20 cursor-pointer accent-cyan"
                />
              </div>

              {/* Quick Equalizer & Visualizer buttons on large screens */}
              {!video && (
                <div className="hidden xl:flex items-center gap-1">
                  <VisualizerToolbar embedded />
                  <EqualizerControl available={!external || external.playbackKind !== 'subscription'} />
                </div>
              )}

              {/* Queue Button with Count Badge */}
              <button
                type="button"
                onClick={player.toggleQueue}
                aria-label={`Open playback queue, ${queueCount} upcoming songs`}
                className={`relative grid h-9 w-9 min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 place-items-center rounded-xl border border-bone/15 transition hover:border-cyan hover:text-cyan ${
                  player.isQueueOpen ? 'bg-cyan/15 border-cyan text-cyan' : 'text-bone/70'
                }`}
                title="Playback Queue"
              >
                <Icon n="queue" s={16} />
                {queueCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan px-1 font-mono text-[9px] font-bold text-ink shadow">
                    {queueCount}
                  </span>
                )}
              </button>

              {/* Expand to Full Player Button */}
              <button
                type="button"
                onClick={() => local.setIsExpanded(true)}
                aria-label="Expand player to full view"
                className="grid h-9 w-9 min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 place-items-center rounded-xl border border-bone/15 text-bone/70 transition hover:border-cyan hover:text-cyan"
                title="Expand Player"
              >
                <Icon n="expand" s={15} />
              </button>

              {/* Dismiss / Close Button */}
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Pause and close player dock"
                className="grid h-9 w-9 min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 place-items-center rounded-xl text-bone/45 transition hover:bg-bone/10 hover:text-bone"
                title="Close mini player"
              >
                <Icon n="close" s={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official YouTube video host frame */}
      {video && player.videoMode && videoFrameStyle && (
        <div className="fixed bg-black youtube-player-host" style={videoFrameStyle}>
          <YouTubeVideoModal
            key={video.id}
            inline
            autoPlay
            video={video}
            onClose={player.exitVideoMode}
            startSeconds={playerClock.videoTime}
            onPlayback={onVideoPlayback}
            onController={onVideoController}
            onError={onVideoError}
          />
        </div>
      )}
    </>
  );
}
