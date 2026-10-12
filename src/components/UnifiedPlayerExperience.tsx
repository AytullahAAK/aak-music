import { useEffect, useMemo, useState, memo } from 'react';
import { tracks, type Track } from '../data';
import Art from './Art';
import Icon, { Eq } from './Icon';
import Search from './Search';
import PlayerVisualizer from './PlayerVisualizer';
import VisualizerToolbar from './VisualizerToolbar';
import EqualizerControl from './EqualizerControl';
import LyricsAssistant from './LyricsAssistant';
import { usePlayer, useTime, fmt, statusLabel } from '../hooks/usePlayer';
import { useUniversalPlayer, useUniversalPlayerTime } from '../hooks/useUniversalPlayer';
import { getRecommendationsForTrack, toPlayableItem, type Recommendation, type PlayableItem } from '../services/music/recommendations';

function TimelineScrubber({
  current,
  duration,
  canSeek,
  onSeek,
}: {
  current: number;
  duration: number;
  canSeek: boolean;
  onSeek: (seconds: number) => void;
}) {
  const percent = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;

  return (
    <div className="w-full">
      <div className="group relative flex h-6 w-full cursor-pointer items-center">
        <div className="relative h-1.5 w-full rounded-full bg-bone/15 transition-all group-hover:h-2.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan via-accent to-pink-500 shadow-[0_0_12px_rgba(95,212,255,0.5)] transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <input
          aria-label="Seek track position"
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={Math.min(current, duration || 0)}
          disabled={!canSeek}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </div>
      <div className="mt-1 flex items-center justify-between font-mono text-[11px] tabular-nums text-bone/60">
        <span>{fmt(current)}</span>
        <span>{fmt(duration)}</span>
      </div>
    </div>
  );
}

function UnifiedPlayerExperience({ onReturnToDiscovery }: { onReturnToDiscovery?: () => void } = {}) {
  const local = usePlayer();
  const universal = useUniversalPlayer();
  const universalTime = useUniversalPlayerTime();
  const localTime = useTime();

  const [activeTab, setActiveTab] = useState<'queue' | 'related' | 'search' | 'lyrics'>('queue');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentItem = universal.currentItem;
  const external = universal.activeAudio;
  const video = universal.activeVideo;
  const videoMode = universal.videoMode;

  const title = currentItem.title;
  const artist = currentItem.artist;
  const image = currentItem.image;
  const isVideo = Boolean(video && videoMode);
  const isVideoSelected = Boolean(video && !videoMode);
  // Only AAK-owned media is known to be same-origin and connected to our shared
  // analyser. Do not assume third-party preview URLs expose samples to Web Audio.
  const analyserAvailable = !video && !external;

  const isPlaying = isVideo
    ? universal.videoPlaying
    : external
    ? universal.playing
    : local.playing;

  const currentSeconds = isVideo
    ? universalTime.videoTime
    : external
    ? universalTime.time
    : localTime.t;

  const currentDuration = isVideo
    ? universalTime.videoDuration || currentItem.durationSeconds
    : external
    ? universalTime.duration || currentItem.durationSeconds
    : localTime.dur || currentItem.durationSeconds;

  const volume = video || external ? universal.volume : local.vol;
  const repeat = video || external ? universal.repeat : local.repeat;
  const shuffle = video || external ? universal.shuffle : local.shuffle;

  const canSeek = isVideo
    ? universal.videoMode && universal.videoReady && universalTime.videoDuration > 0
    : external
    ? universalTime.duration > 0
    : Boolean(local.track.src && localTime.dur > 0);

  const toggle = () => (isVideo ? universal.toggleVideo() : external ? universal.toggle() : local.toggle());
  const previous = () => universal.prev();
  const next = () => universal.next();
  const seek = (seconds: number) =>
    isVideo ? universal.seekVideo(seconds) : external ? universal.seek(seconds) : local.seek(seconds);

  const setVolume = (value: number) =>
    video ? universal.setVideoVolume(value) : external ? universal.setVolume(value) : local.setVol(value);

  const toggleShuffle = () =>
    video || external ? universal.setShuffle(!shuffle) : local.toggleShuffle();

  const toggleRepeat = () =>
    video || external
      ? universal.setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')
      : local.toggleRepeat();

  const isFavorite = local.isFavorite(currentItem.id);

  // Provider-backed related search is lazy and shared with the queue drawer cache.
  useEffect(() => {
    if (activeTab !== 'related') return;
    const controller = new AbortController();
    setLoadingRecs(true);
    setRecommendationError('');
    getRecommendationsForTrack(currentItem, controller.signal)
      .then((recs) => {
        if (!controller.signal.aborted) {
          setRecommendations(recs);
          setLoadingRecs(false);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadingRecs(false);
          setRecommendationError(error instanceof Error ? error.message : currentItem.kind === 'local'
            ? 'The AAK Music library could not be read. Please try again.'
            : `The ${currentItem.provider} catalog search failed. Check provider configuration or network and retry.`);
        }
      });
    return () => controller.abort();
  }, [activeTab, currentItem.id, currentItem.kind, currentItem.provider]);

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleAddToQueue = (item: PlayableItem) => {
    universal.addToUserQueue(item);
    notify(`Added "${item.title}" to Up Next queue`);
  };

  const lyricsContext = video
    ? { title: video.title, artist: video.artist, provider: 'YouTube', sourceUrl: video.watchUrl, sourceKind: 'third-party' as const }
    : external
    ? { title: external.title, artist: external.artist, provider: external.provider, sourceUrl: external.trackUrl, sourceKind: 'third-party' as const }
    : { title: local.track.title, artist: local.track.artist, provider: 'AAK Music', sourceKind: 'local' as const };

  const upcomingInContext = currentItem.kind === 'local' ? tracks.filter((t) => t.id !== currentItem.id) : [];
  const providerContextItems = video
    ? universal.videoQueue.slice(universal.videoQueueIndex + 1)
    : external
    ? universal.queue.slice(universal.queueIndex + 1)
    : [];
  const providerContextLabel = video ? 'Remaining YouTube search results' : `Remaining ${external?.provider ?? 'provider'} search results`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-10">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[160] flex items-center gap-2 rounded-xl border border-cyan/40 bg-ink/95 px-4 py-2.5 text-xs font-semibold text-cyan shadow-2xl backdrop-blur-xl animate-fade-in">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,.9fr)] xl:gap-7">
      <section className="min-w-0">
      <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[.2em] text-cyan">AAK MUSIC · PLAYER</p>
          <p className="mt-1 text-xs text-bone/55">Source · {currentItem.provider}</p>
        </div>
        <button
          type="button"
          onClick={() => onReturnToDiscovery ? onReturnToDiscovery() : local.setIsExpanded(false)}
          aria-label={onReturnToDiscovery ? 'Return to music discovery' : 'Minimize player'}
          title={onReturnToDiscovery ? 'Return to music discovery' : 'Minimize player'}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-bone/15 bg-raised/60 px-3 text-xs font-semibold text-bone/75 transition hover:border-cyan/50 hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan sm:px-4"
        >
          <Icon n="minimize" s={15} />
          <span className="hidden sm:inline">{onReturnToDiscovery ? 'Discover more' : 'Minimize'}</span>
        </button>
      </div>

      {/* Watch-page stage: media, identity, and transport stay together. */}
      <div className="grid grid-cols-1 items-start gap-5">
        {/* LEFT COLUMN: ARTWORK & IDENTITY */}
        <div className="min-w-0">
          <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-2xl border border-bone/15 bg-raised/30 shadow-[0_20px_55px_rgba(0,0,0,0.32)] sm:rounded-3xl">
            {/* Ambient Backlight Glow */}
            <div
              className="absolute -inset-4 opacity-40 blur-2xl transition-opacity"
              style={{
                background: currentItem.kind === 'local'
                  ? `radial-gradient(circle, hsl(${local.track.a}, 80%, 50%) 0%, transparent 70%)`
                  : 'radial-gradient(circle, rgba(95,212,255,0.4) 0%, transparent 70%)',
              }}
              aria-hidden="true"
            />

            {isVideo ? (
              <div
                data-aak-youtube-player-slot
                aria-label={`Official YouTube player: ${video?.title}`}
                className="relative z-10 h-full w-full bg-black"
              />
            ) : (
              <>
                {image && <img src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl" />}
                {image ? (
                  <img src={image} alt={`${title} artwork`} className="relative z-10 h-full w-full object-contain p-3 drop-shadow-2xl sm:p-5" />
                ) : (
                  <Art a={local.track.a} b={local.track.b} className="relative z-10 h-full w-full object-cover" />
                )}
                <div aria-hidden className="absolute inset-0 z-10 bg-gradient-to-t from-ink/85 via-transparent to-black/30" />
              </>
            )}

            {/* Badges on Artwork */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <span className="rounded-full border border-bone/20 bg-ink/80 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan backdrop-blur-md">
                {isVideoSelected ? 'YouTube · Selected' : isPlaying ? 'Now Playing' : currentItem.provider}
              </span>
            </div>

            {/* Favorite button */}
            {!video && currentItem.kind === 'local' && (
              <button
                type="button"
                onClick={() => local.toggleFavorite(currentItem.id)}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                className={`absolute top-4 right-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-bone/20 bg-ink/80 text-lg backdrop-blur-md transition hover:scale-110 active:scale-95 ${
                  isFavorite ? 'text-pink-400' : 'text-bone/70 hover:text-pink-300'
                }`}
              >
                <Icon n="heart" s={18} />
              </button>
            )}

            {/* Video Mode Button when YouTube selected but in Audio Mode */}
            {isVideoSelected && (
              <div className="absolute inset-x-4 bottom-4 z-20 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={video?.embeddingStatus === 'blocked'}
                  onClick={universal.enterVideoMode}
                  className="min-h-11 rounded-full bg-cyan px-5 text-xs font-bold text-ink shadow-lg transition hover:brightness-110 disabled:opacity-50"
                >
                  {video?.embeddingStatus === 'blocked' ? 'Embedding Disabled' : 'Enter Official Video Mode'}
                </button>
                {video?.watchUrl && (
                  <a
                    href={video.watchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center rounded-full border border-white/20 bg-ink/90 px-4 text-xs font-semibold text-bone hover:border-cyan hover:text-cyan"
                  >
                    Open on YouTube ↗
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Track Typography & Details directly below Artwork */}
          <div className="mt-5 space-y-2">
            <h1 className="break-words font-display text-2xl font-extrabold leading-tight text-bone sm:text-3xl lg:text-4xl">
              {title}
            </h1>
            <p className="text-base font-medium text-bone/75 sm:text-lg">
              {artist}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="rounded-lg border border-bone/15 bg-raised/50 px-2.5 py-1 font-mono text-[10px] text-cyan">
                {currentItem.provider}
              </span>
              {currentItem.genre && (
                <span className="rounded-lg border border-bone/15 bg-raised/50 px-2.5 py-1 font-mono text-[10px] text-bone/70">
                  {currentItem.genre}
                </span>
              )}
              {typeof currentItem.bpm === 'number' && currentItem.bpm > 0 && (
                <span className="rounded-lg border border-bone/15 bg-raised/50 px-2.5 py-1 font-mono text-[10px] text-bone/70">
                  {currentItem.bpm} BPM
                </span>
              )}
              {currentItem.durationSeconds > 0 && (
                <span className="rounded-lg border border-bone/15 bg-raised/50 px-2.5 py-1 font-mono text-[10px] text-bone/70">
                  {fmt(currentDuration)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Transport and visualizer remain immediately below the media. */}
        <div className="min-w-0 space-y-4">
          {/* AUDIO VISUALIZER CANVAS */}
          <div className="relative overflow-hidden rounded-2xl border border-bone/12 bg-raised/30 p-4 shadow-lg sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-bone/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan">{analyserAvailable ? 'Live Spectrum' : 'Playback activity'}</span>
                {analyserAvailable && isPlaying && <Eq on={true} />}
              </div>
              <VisualizerToolbar embedded />
            </div>
            {!analyserAvailable && <p className="mt-2 text-[10px] text-bone/45">This provider does not expose audio samples to AAK Music. The visualizer remains idle rather than showing simulated spectrum data.</p>}
            <div className="mt-3 h-24 w-full">
              <PlayerVisualizer analyserAvailable={analyserAvailable} />
            </div>
          </div>

          {/* MAIN PLAYBACK CONTROL CARD */}
          <div className="rounded-2xl border border-bone/15 bg-ink/95 p-4 shadow-xl sm:rounded-3xl sm:p-6">
            {/* Timeline Scrubber */}
            <TimelineScrubber
              current={currentSeconds}
              duration={currentDuration}
              canSeek={canSeek}
              onSeek={seek}
            />

            {/* PRIMARY TRANSPORT BUTTONS (CENTER STAGE) */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-5">
              {/* Shuffle */}
              <button
                type="button"
                onClick={toggleShuffle}
                aria-label={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'}
                aria-pressed={shuffle}
                className={`grid h-11 w-11 place-items-center rounded-full transition ${
                  shuffle ? 'bg-cyan/15 text-cyan ring-1 ring-cyan/40' : 'text-bone/50 hover:bg-bone/10 hover:text-bone'
                }`}
                title="Shuffle"
              >
                <Icon n="shuffle" s={20} />
              </button>

              {/* Previous */}
              <button
                type="button"
                onClick={previous}
                aria-label="Previous track"
                className="grid h-12 w-12 place-items-center rounded-full text-bone/80 transition hover:bg-bone/10 hover:text-cyan active:scale-95"
                title="Previous Track"
              >
                <Icon n="prev" s={24} />
              </button>

              {/* Primary Play / Pause Button (Hero Circle) */}
              <button
                type="button"
                onClick={toggle}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="grid h-16 w-16 place-items-center rounded-full bg-bone text-ink shadow-[0_0_25px_rgba(255,255,255,0.25)] transition hover:bg-cyan hover:scale-105 active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                <Icon n={isPlaying ? 'pause' : 'play'} s={28} />
              </button>

              {/* Next */}
              <button
                type="button"
                onClick={next}
                aria-label="Next track"
                className="grid h-12 w-12 place-items-center rounded-full text-bone/80 transition hover:bg-bone/10 hover:text-cyan active:scale-95"
                title="Next Track"
              >
                <Icon n="next" s={24} />
              </button>

              {/* Repeat */}
              <button
                type="button"
                onClick={toggleRepeat}
                aria-label={`Repeat mode: ${repeat}`}
                aria-pressed={repeat !== 'off'}
                className={`relative grid h-11 w-11 place-items-center rounded-full transition ${
                  repeat !== 'off' ? 'bg-cyan/15 text-cyan ring-1 ring-cyan/40' : 'text-bone/50 hover:bg-bone/10 hover:text-bone'
                }`}
                title={`Repeat: ${repeat}`}
              >
                <Icon n="repeat" s={20} />
                {repeat === 'one' && (
                  <span className="absolute bottom-1.5 right-1.5 text-[9px] font-bold">1</span>
                )}
              </button>
            </div>

            {/* SECONDARY UTILITY BAR */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-bone/10 pt-4">
              {/* Volume Scrubber */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVolume(volume > 0.01 ? 0 : 1)}
                  aria-label={volume <= 0.01 ? 'Unmute' : 'Mute'}
                  className="grid h-8 w-8 place-items-center rounded text-bone/55 transition hover:text-cyan"
                >
                  <Icon n={volume <= 0.01 ? 'muted' : 'volume'} s={18} />
                </button>
                <input
                  aria-label="Volume slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="h-1.5 w-24 cursor-pointer accent-cyan sm:w-28"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Equalizer */}
                <EqualizerControl available={analyserAvailable} />

                {/* Video Mode Toggle if Available */}
                {external?.videoVersion && (
                  <button
                    type="button"
                    onClick={() => universal.playVideo(external.videoVersion!)}
                    className="rounded-full border border-cyan/40 px-3 py-1.5 text-xs font-semibold text-cyan transition hover:bg-cyan/15"
                  >
                    Watch Video
                  </button>
                )}

                {/* External Provider Link */}
                {video?.watchUrl && (
                  <a
                    href={video.watchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-bone/15 px-3 py-1.5 text-xs text-bone/70 hover:border-cyan hover:text-cyan"
                  >
                    <span>YouTube</span>
                    <Icon n="external" s={13} />
                  </a>
                )}
                {external?.trackUrl && (
                  <a
                    href={external.trackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-bone/15 px-3 py-1.5 text-xs text-bone/70 hover:border-cyan hover:text-cyan"
                  >
                    <span>{external.provider}</span>
                    <Icon n="external" s={13} />
                  </a>
                )}

                {/* Add to Up Next Queue button */}
                <button
                  type="button"
                  onClick={() => handleAddToQueue(currentItem)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-bone/15 px-3 py-1.5 text-xs text-bone/80 transition hover:border-cyan hover:text-cyan"
                >
                  <Icon n="listPlus" s={14} />
                  <span>+ Queue</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </section>

      {/* FEATURE TABS DECK (QUEUES, RELATED, SEARCH, LYRICS) */}
      <aside className="mt-8 min-w-0 rounded-2xl border border-bone/15 bg-ink/95 p-4 shadow-xl sm:rounded-3xl sm:p-5 xl:sticky xl:top-24 xl:mt-0 xl:max-h-[calc(100svh-7rem)] xl:overflow-y-auto xl:overscroll-contain">
        {/* TAB NAVIGATION */}
        <div className="flex flex-wrap gap-1.5 border-b border-bone/10 pb-4" role="tablist" aria-label="Player details">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'queue'}
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider transition sm:text-xs ${
              activeTab === 'queue'
                ? 'bg-cyan text-ink shadow-md'
                : 'border border-bone/15 text-bone/60 hover:border-cyan hover:text-bone'
            }`}
          >
            <span>Up Next & Queue</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === 'queue' ? 'bg-ink/20 text-ink' : 'bg-bone/10 text-cyan'}`}>
              {universal.userQueue.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'related'}
            onClick={() => setActiveTab('related')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider transition sm:text-xs ${
              activeTab === 'related'
                ? 'bg-cyan text-ink shadow-md'
                : 'border border-bone/15 text-bone/60 hover:border-cyan hover:text-bone'
            }`}
          >
            <Icon n="sparkles" s={14} />
            <span>Related Music</span>
            {recommendations.length > 0 && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === 'related' ? 'bg-ink/20 text-ink' : 'bg-bone/10 text-cyan'}`}>
                {recommendations.length}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'search'}
            onClick={() => setActiveTab('search')}
            className={`rounded-full px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider transition sm:text-xs ${
              activeTab === 'search'
                ? 'bg-cyan text-ink shadow-md'
                : 'border border-bone/15 text-bone/60 hover:border-cyan hover:text-bone'
            }`}
          >
            Universal Search
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'lyrics'}
            onClick={() => setActiveTab('lyrics')}
            className={`rounded-full px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider transition sm:text-xs ${
              activeTab === 'lyrics'
                ? 'bg-cyan text-ink shadow-md'
                : 'border border-bone/15 text-bone/60 hover:border-cyan hover:text-bone'
            }`}
          >
            Lyrics & Notes
          </button>
        </div>

        {/* TAB PANELS */}
        <div className="mt-5 min-h-[300px]">
          {/* TAB 1: UP NEXT & QUEUE */}
          {activeTab === 'queue' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-bone">Up Next Playback Order</h3>
                  <p className="text-xs text-bone/55">
                    User-queued tracks play first, followed by the active track's real playback sequence.
                  </p>
                </div>
                {universal.userQueue.length > 0 && (
                  <button
                    type="button"
                    onClick={() => universal.clearUserQueue()}
                    className="rounded-full border border-bone/15 px-4 py-1.5 text-xs font-mono text-bone/60 transition hover:border-amber-300 hover:text-amber-300"
                  >
                    Clear Up Next
                  </button>
                )}
              </div>

              {/* USER QUEUE ITEMS */}
              {universal.userQueue.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-bone/20 p-8 text-center">
                  <p className="font-semibold text-sm text-bone/80">No tracks in your Up Next queue</p>
                  <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-bone/50">
                    Use the "Related Music" tab or "Universal Search" to add tracks directly to your upcoming queue.
                  </p>
                  <div className="mt-4 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('related')}
                      className="rounded-full bg-cyan px-4 py-2 text-xs font-bold text-ink hover:brightness-110"
                    >
                      Browse Related Music
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('search')}
                      className="rounded-full border border-bone/20 px-4 py-2 text-xs font-semibold text-bone hover:border-cyan hover:text-cyan"
                    >
                      Search All Music
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="space-y-2">
                  {universal.userQueue.map((item, index) => (
                    <li
                      key={`${item.id}-${index}`}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-bone/10 bg-raised/40 p-3 transition hover:border-bone/25 hover:bg-raised/70"
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span className="font-mono text-xs text-bone/40">{index + 1}</span>
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-void shadow">
                          {item.image ? (
                            <img src={item.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Art a={200} b={160} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-bone group-hover:text-cyan">
                            {item.title}
                          </p>
                          <p className="truncate text-xs text-bone/60">
                            {item.artist} · <span className="font-mono text-cyan/70">{item.provider}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            universal.removeFromUserQueue(index);
                            universal.playItem(item);
                          }}
                          className="grid h-9 w-9 place-items-center rounded-full bg-bone text-ink shadow transition hover:bg-cyan hover:scale-105 active:scale-95"
                          title="Play Now"
                        >
                          <Icon n="play" s={16} />
                        </button>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => universal.moveUserQueueItem(index, index - 1)}
                          aria-label={`Move ${item.title} up`}
                          className="grid h-8 w-8 place-items-center rounded text-bone/50 transition hover:bg-bone/10 hover:text-bone disabled:opacity-20"
                        >
                          <Icon n="arrowUp" s={16} />
                        </button>
                        <button
                          type="button"
                          disabled={index === universal.userQueue.length - 1}
                          onClick={() => universal.moveUserQueueItem(index, index + 1)}
                          aria-label={`Move ${item.title} down`}
                          className="grid h-8 w-8 place-items-center rounded text-bone/50 transition hover:bg-bone/10 hover:text-bone disabled:opacity-20"
                        >
                          <Icon n="arrowDown" s={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => universal.removeFromUserQueue(index)}
                          aria-label={`Remove ${item.title} from queue`}
                          className="grid h-8 w-8 place-items-center rounded text-bone/50 transition hover:bg-amber-500/20 hover:text-amber-300"
                        >
                          <Icon n="close" s={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Local library browsing stays separate from external provider queues. */}
              {currentItem.kind === 'local' && <div className="mt-8 border-t border-bone/10 pt-6">
                <h4 className="font-mono text-xs uppercase tracking-widest text-bone/50">
                  Browse AAK Master Releases
                </h4>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                  {upcomingInContext.slice(0, 6).map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-bone/10 bg-void/40 p-3 transition hover:border-bone/20 hover:bg-void/70"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Art a={track.a} b={track.b} image={track.image} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-bone">{track.title}</p>
                          <p className="truncate text-[10px] text-bone/55">{track.genre} · {track.bpm} BPM</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => universal.playItem({
                            kind: 'local',
                            id: track.id,
                            title: track.title,
                            artist: track.artist,
                            album: track.genre,
                            genre: track.genre,
                            bpm: track.bpm,
                            image: track.image,
                            durationSeconds: track.dur,
                            provider: 'AAK Music',
                            trackIndex: tracks.findIndex((t) => t.id === track.id),
                            raw: track,
                          })}
                          className="grid h-8 w-8 place-items-center rounded-full bg-bone/10 text-bone hover:bg-cyan hover:text-ink"
                          title="Play Track"
                        >
                          <Icon n="play" s={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddToQueue({
                            kind: 'local',
                            id: track.id,
                            title: track.title,
                            artist: track.artist,
                            album: track.genre,
                            genre: track.genre,
                            bpm: track.bpm,
                            image: track.image,
                            durationSeconds: track.dur,
                            provider: 'AAK Music',
                            trackIndex: tracks.findIndex((t) => t.id === track.id),
                            raw: track,
                          })}
                          className="rounded-full border border-bone/15 px-2.5 py-1 font-mono text-[10px] text-bone/70 hover:border-cyan hover:text-cyan"
                        >
                          + Queue
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>}
              {providerContextItems.length > 0 && (
                <section className="mt-8 border-t border-bone/10 pt-6" aria-label="Provider playback sequence">
                  <h4 className="font-mono text-xs uppercase tracking-widest text-bone/50">{video ? 'Remaining YouTube search results' : `Remaining ${external?.provider ?? 'provider'} search results`}</h4>
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                    {providerContextItems.slice(0, 8).map((item) => (
                      <div key={`${item.provider}:${item.id}`} className="flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-bone/10 bg-void/40 p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-raised">{('thumbnail' in item ? item.thumbnail : item.image) ? <img src={'thumbnail' in item ? item.thumbnail : item.image} alt="" className="h-full w-full object-cover" /> : <Art a={220} b={180} className="h-full w-full object-cover" />}</div>
                          <div className="min-w-0"><p className="truncate text-xs font-semibold text-bone">{item.title}</p><p className="truncate text-[10px] text-bone/55">{item.artist} · {item.provider}</p></div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" onClick={() => { if ('watchUrl' in item) universal.playVideo(item, universal.videoQueue); else universal.playAudio(item, universal.queue); }} aria-label={`Play ${item.title}`} className="grid h-9 w-9 place-items-center rounded-full bg-bone/10 text-bone hover:bg-cyan hover:text-ink"><Icon n="play" s={13} /></button>
                          <button type="button" onClick={() => handleAddToQueue(toPlayableItem(item))} aria-label={`Add ${item.title} to queue`} className="rounded-full border border-bone/15 px-2 py-1 text-[9px] font-mono text-bone/70 hover:border-cyan hover:text-cyan">+ Queue</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* TAB 2: RELATED MUSIC DISCOVERY */}
          {activeTab === 'related' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-lg font-bold text-bone">Related music</h3>
                <p className="text-xs text-bone/55">
                  {currentItem.kind === 'local'
                    ? 'Suggestions are drawn from the existing AAK Music catalog and its track metadata.'
                    : `These are real ${currentItem.provider} catalog search results based on this track, not a guaranteed recommendation feed.`}
                </p>
              </div>

              {loadingRecs ? (
                <div className="py-12 text-center space-y-3">
                  <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
                  <p className="text-xs text-bone/50">Searching available catalog data…</p>
                </div>
              ) : recommendationError ? (
                <div role="alert" className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-8 text-center text-xs text-bone/70">{recommendationError}</div>
              ) : recommendations.length === 0 ? (
                <div className="rounded-2xl border border-bone/15 p-8 text-center text-xs text-bone/55">
                  No playable related items were returned for this track.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {recommendations.map(({ item, reason, badge }, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="group flex items-center justify-between gap-3.5 rounded-2xl border border-bone/10 bg-raised/35 p-3.5 transition hover:border-bone/25 hover:bg-raised/60"
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-void shadow">
                          {item.image ? (
                            <img src={item.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Art a={240} b={190} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-bone group-hover:text-cyan">
                            {item.title}
                          </p>
                          <p className="truncate text-xs text-bone/60">{item.artist}</p>
                          <span className="mt-1 inline-block rounded bg-cyan/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan">
                            {badge} · {reason}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => universal.playItem(item)}
                          className="grid h-9 w-9 place-items-center rounded-full bg-bone text-ink shadow transition hover:bg-cyan hover:scale-105 active:scale-95"
                          title="Play Now"
                        >
                          <Icon n="play" s={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddToQueue(item)}
                          className="rounded-full border border-bone/15 px-3 py-1.5 font-mono text-[11px] text-bone/80 transition hover:border-cyan hover:text-cyan"
                        >
                          + Queue
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: UNIVERSAL SEARCH */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <Search q="" embedded />
            </div>
          )}

          {/* TAB 4: LYRICS & NOTES */}
          {activeTab === 'lyrics' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <section aria-label="Track Information" className="rounded-2xl border border-bone/10 bg-raised/30 p-5">
                <h4 className="font-mono text-xs uppercase tracking-wider text-cyan">Audio Specifications</h4>
                <div className="mt-4 space-y-3 text-xs leading-6 text-bone/70">
                  <p><strong>Title:</strong> {title}</p>
                  <p><strong>Artist:</strong> {artist} (Ayatullah Al Khomeini)</p>
                  <p><strong>Provider:</strong> {currentItem.provider}</p>
                  {currentItem.genre && <p><strong>Genre:</strong> {currentItem.genre}</p>}
                  {typeof currentItem.bpm === 'number' && currentItem.bpm > 0 && <p><strong>BPM:</strong> {currentItem.bpm}</p>}
                  {currentItem.durationSeconds > 0 && <p><strong>Duration:</strong> {fmt(currentDuration)}</p>}
                  {currentItem.kind === 'local' && (
                    <p className="text-cyan font-mono text-[11px]">
                      Master Release: High-Definition 24-Bit / 96kHz Local Master
                    </p>
                  )}
                  {video?.watchUrl && (
                    <a
                      href={video.watchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block pt-2 text-cyan underline underline-offset-2 hover:text-bone"
                    >
                      Open Official YouTube Page ↗
                    </a>
                  )}
                  {external?.trackUrl && (
                    <a
                      href={external.trackUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block pt-2 text-cyan underline underline-offset-2 hover:text-bone"
                    >
                      Open Original {external.provider} Listing ↗
                    </a>
                  )}
                </div>
              </section>

              <section aria-label="Lyrics & Vocal Notes" className="rounded-2xl border border-bone/10 bg-raised/30 p-5">
                <LyricsAssistant context={lyricsContext} />
              </section>
            </div>
          )}
        </div>
      </aside>
      </div>
    </div>
  );
}

export default memo(UnifiedPlayerExperience);
