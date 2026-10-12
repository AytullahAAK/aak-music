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

      {/* One persistent mini-player presentation for every route. */}
      {showDock && !local.isExpanded && (
        <section
          ref={dockRef}
          role="region"
          aria-label="AAK Music mini player"
          className={`aak-mini-player fixed z-50 text-bone ${video && player.videoMode ? 'aak-mini-player--video' : ''}`}
        >
          {video && player.videoMode && (
            <div
              data-aak-youtube-player-slot
              aria-label={`Official YouTube player: ${video.title}`}
              className="aak-mini-player__video-slot mx-auto aspect-video w-full bg-black"
            />
          )}

          {!video && (
            <div className="aak-mini-player__progress group relative h-1.5 w-full cursor-pointer bg-bone/10 transition-[height] hover:h-2">
              <div
                className="h-full rounded-r-full bg-gradient-to-r from-cyan to-accent"
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
                onChange={(event) => seek(Number(event.target.value))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
            </div>
          )}

          <div className="aak-mini-player__body">
            <div className="aak-mini-player__identity min-w-0">
              <button
                type="button"
                onClick={() => local.setIsExpanded(true)}
                aria-label="Expand full player"
                className="aak-mini-player__art group relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-bone/15 bg-raised sm:h-14 sm:w-14"
              >
                {currentItem.image ? <img src={currentItem.image} alt="" className="h-full w-full object-cover" /> : <Art a={240} b={190} className="h-full w-full object-cover" />}
                <span className="absolute inset-0 grid place-items-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <Icon n="expand" s={16} />
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => local.setIsExpanded(true)} className="block w-full truncate text-left font-display text-sm font-bold leading-tight text-bone transition hover:text-cyan" title={title}>{title}</button>
                <p className="mt-1 truncate text-xs text-bone/60" title={artist}>{artist}</p>
                <span className="mt-1 inline-flex max-w-full truncate rounded-md bg-cyan/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan">{provider}</span>
              </div>
              {!video && currentItem.kind === 'local' && (
                <button type="button" onClick={() => local.toggleFavorite(currentItem.id)} aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={isFavorite} className={`hidden h-9 w-9 shrink-0 place-items-center rounded-full transition sm:grid ${isFavorite ? 'text-pink-400' : 'text-bone/45 hover:text-pink-300'}`}>
                  <Icon n="heart" s={17} />
                </button>
              )}
            </div>

            <div className="aak-mini-player__transport" aria-label="Playback controls">
              <button type="button" onClick={previous} disabled={currentItem.kind === 'video' ? player.videoQueue.length < 2 && player.userQueue.length === 0 : external ? player.queue.length < 2 && player.userQueue.length === 0 : tracks.length < 2} aria-label="Previous track" title="Previous track" className="aak-mini-player__control text-bone/70 hover:bg-bone/10 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-30"><Icon n="prev" s={18} /></button>
              <button type="button" onClick={playToggle} aria-label={isPlaying ? 'Pause' : 'Play'} title={isPlaying ? 'Pause' : 'Play'} className="aak-mini-player__play"><Icon n={isPlaying ? 'pause' : 'play'} s={19} /></button>
              <button type="button" onClick={next} disabled={player.userQueue.length === 0 && (currentItem.kind === 'video' ? player.videoQueue.length < 2 : external ? player.queue.length < 2 : tracks.length < 2)} aria-label="Next track" title="Next track" className="aak-mini-player__control text-bone/70 hover:bg-bone/10 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-30"><Icon n="next" s={18} /></button>
              <span className="aak-mini-player__time hidden font-mono text-[10px] tabular-nums text-bone/45 md:inline-flex">{fmt(currentTime)} / {fmt(duration)}</span>
            </div>

            <div className="aak-mini-player__actions">
              <button type="button" onClick={toggleShuffle} aria-label={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'} aria-pressed={shuffle} title="Shuffle" className={`aak-mini-player__control aak-mini-player__secondary ${shuffle ? 'bg-cyan/10 text-cyan' : 'text-bone/55 hover:text-bone'}`}><Icon n="shuffle" s={16} /></button>
              <button type="button" onClick={toggleRepeat} aria-label={`Repeat ${repeat}`} aria-pressed={repeat !== 'off'} title={`Repeat: ${repeat}`} className={`aak-mini-player__control aak-mini-player__secondary relative ${repeat !== 'off' ? 'bg-cyan/10 text-cyan' : 'text-bone/55 hover:text-bone'}`}><Icon n="repeat" s={16} />{repeat === 'one' && <span className="absolute bottom-1 right-1 text-[8px] font-bold">1</span>}</button>
              <div className="aak-mini-player__volume hidden items-center gap-1.5 lg:flex">
                <button type="button" onClick={toggleMute} aria-label={volume <= 0.01 ? 'Unmute' : 'Mute'} className="aak-mini-player__control text-bone/55 hover:text-cyan"><Icon n={volume <= 0.01 ? 'muted' : 'volume'} s={16} /></button>
                <input aria-label="Player volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => changeVolume(Number(event.target.value))} className="h-1.5 w-16 cursor-pointer accent-cyan" />
              </div>
              {!video && <div className="aak-mini-player__audio-tools hidden items-center gap-1 xl:flex"><VisualizerToolbar embedded /><div className="aak-mini-player__equalizer"><EqualizerControl available={!external} /></div></div>}
              {video && <div className="aak-mini-player__equalizer"><EqualizerControl available={false} /></div>}
              <button type="button" onClick={player.toggleQueue} aria-label={`Open playback queue, ${queueCount} user queued tracks`} aria-pressed={player.isQueueOpen} title="Playback queue" className={`aak-mini-player__control relative rounded-xl border border-bone/15 ${player.isQueueOpen ? 'border-cyan bg-cyan/10 text-cyan' : 'text-bone/65 hover:border-cyan hover:text-cyan'}`}>
                <Icon n="queue" s={17} />
                {queueCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan px-1 font-mono text-[9px] font-bold text-ink">{queueCount}</span>}
              </button>
              <button type="button" onClick={() => local.setIsExpanded(true)} aria-label="Expand player" title="Expand player" className="aak-mini-player__control rounded-xl border border-bone/15 text-bone/65 hover:border-cyan hover:text-cyan"><Icon n="expand" s={16} /></button>
              <button type="button" onClick={handleDismiss} aria-label="Pause and hide mini player" title="Pause and hide mini player" className="aak-mini-player__control aak-mini-player__dismiss rounded-xl text-bone/45 hover:bg-bone/10 hover:text-bone"><Icon n="close" s={16} /></button>
            </div>
          </div>
        </section>
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
