import { useEffect, useState, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { useUniversalPlayer, useUniversalPlayerTime } from '../hooks/useUniversalPlayer';
import { usePlayer, useTime, fmt } from '../hooks/usePlayer';
import { getRecommendationsForTrack, type Recommendation, type PlayableItem } from '../services/music/recommendations';
import { tracks } from '../data';
import Icon, { Eq } from './Icon';
import Art from './Art';

function QueuePanel() {
  const universal = useUniversalPlayer();
  const universalTime = useUniversalPlayerTime();
  const localPlayer = usePlayer();
  const localTime = useTime();

  const [activeTab, setActiveTab] = useState<'queue' | 'related'>('queue');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [queuedNotification, setQueuedNotification] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const isOpen = universal.isQueueOpen;
  const current = universal.currentItem;
  const userQueue = universal.userQueue;

  const isPlaying = universal.activeVideo
    ? universal.videoPlaying
    : universal.activeAudio
    ? universal.playing
    : localPlayer.playing;

  const currentSeconds = universal.activeVideo
    ? universalTime.videoTime
    : universal.activeAudio
    ? universalTime.time
    : localTime.t;

  const currentDuration = universal.activeVideo
    ? universalTime.videoDuration || current.durationSeconds
    : universal.activeAudio
    ? universalTime.duration || current.durationSeconds
    : localTime.dur || current.durationSeconds;

  // Upcoming in playlist context when userQueue finishes
  const upcomingInContext = tracks.filter((t) => t.id !== current.id);

  // Fetch recommendations when current track changes or tab opened
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setLoadingRecs(true);
    getRecommendationsForTrack(current, controller.signal)
      .then((recs) => {
        if (!controller.signal.aborted) {
          setRecommendations(recs);
          setLoadingRecs(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadingRecs(false);
      });
    return () => controller.abort();
  }, [isOpen, current.id, current.kind]);

  // Trap focus and handle escape
  useEffect(() => {
    if (!isOpen) return;
    const prevActive = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        universal.setIsQueueOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      prevActive?.focus();
    };
  }, [isOpen, universal.setIsQueueOpen]);

  const handleAddToQueue = (item: PlayableItem) => {
    universal.addToUserQueue(item);
    setQueuedNotification(`Added "${item.title}" to Up Next`);
    setTimeout(() => setQueuedNotification(null), 2500);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex justify-end" role="dialog" aria-modal="true" aria-label="Playback Queue">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-[2px] transition-opacity"
        onClick={() => universal.setIsQueueOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={panelRef}
        className="relative z-10 flex h-full w-full max-w-[460px] flex-col border-l border-bone/15 bg-ink text-bone shadow-2xl"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-bone/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">Playback Queue</h2>
            <span className="rounded-full bg-cyan/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan">
              {userQueue.length + 1}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {userQueue.length > 0 && !showClearConfirm && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="rounded-lg px-2 py-1 text-[11px] font-mono text-bone/55 transition hover:bg-bone/10 hover:text-amber-300"
              >
                Clear
              </button>
            )}

            {showClearConfirm && (
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2 py-0.5 text-[11px]">
                <span className="text-amber-200">Clear queue?</span>
                <button
                  type="button"
                  onClick={() => {
                    universal.clearUserQueue();
                    setShowClearConfirm(false);
                  }}
                  className="font-bold text-amber-300 hover:underline"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="text-bone/60 hover:text-bone"
                >
                  No
                </button>
              </div>
            )}

            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => universal.setIsQueueOpen(false)}
              aria-label="Close queue"
              className="grid h-9 w-9 place-items-center rounded-xl text-bone/60 transition hover:bg-bone/10 hover:text-bone"
            >
              <Icon n="close" s={18} />
            </button>
          </div>
        </header>

        {/* View Tabs */}
        <div className="flex shrink-0 border-b border-bone/10 px-5">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`border-b-2 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'queue'
                ? 'border-cyan text-cyan'
                : 'border-transparent text-bone/55 hover:text-bone'
            }`}
          >
            Up Next ({userQueue.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('related')}
            className={`ml-6 border-b-2 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'related'
                ? 'border-cyan text-cyan'
                : 'border-transparent text-bone/55 hover:text-bone'
            }`}
          >
            Related Music
          </button>
        </div>

        {/* Toast Notification */}
        {queuedNotification && (
          <div className="mx-4 mt-3 flex items-center justify-between rounded-xl border border-cyan/30 bg-cyan/15 px-3 py-2 text-xs font-medium text-cyan shadow-lg">
            <span>✓ {queuedNotification}</span>
            <button
              type="button"
              onClick={() => setQueuedNotification(null)}
              className="ml-2 text-cyan/70 hover:text-cyan"
            >
              ×
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {activeTab === 'queue' ? (
            <div className="space-y-6">
              {/* NOW PLAYING CARD */}
              <section aria-labelledby="now-playing-heading">
                <p id="now-playing-heading" className="text-[10px] font-mono uppercase tracking-widest text-cyan">
                  Now Playing
                </p>
                <div className="mt-2.5 flex items-center gap-3.5 rounded-2xl border border-cyan/30 bg-cyan/[0.07] p-3 shadow-md">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-raised shadow-inner">
                    {current.image ? (
                      <img src={current.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Art a={240} b={200} className="h-full w-full object-cover" />
                    )}
                    {isPlaying && (
                      <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[1px]">
                        <Eq on={true} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-sm text-bone">{current.title}</p>
                    <p className="truncate text-xs text-bone/60">{current.artist}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded bg-cyan/20 px-1.5 py-0.5 text-[9px] font-mono uppercase text-cyan">
                        {current.provider}
                      </span>
                      <span className="text-[10px] font-mono tabular-nums text-bone/50">
                        {fmt(currentSeconds)} / {fmt(currentDuration)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* USER QUEUED TRACKS */}
              <section aria-labelledby="up-next-user-heading">
                <div className="flex items-center justify-between">
                  <p id="up-next-user-heading" className="text-[10px] font-mono uppercase tracking-widest text-bone/55">
                    Up Next In Queue ({userQueue.length})
                  </p>
                  {userQueue.length > 0 && (
                    <span className="text-[10px] text-bone/40">Plays before playlist</span>
                  )}
                </div>

                {userQueue.length === 0 ? (
                  <div className="mt-2.5 rounded-2xl border border-dashed border-bone/15 p-6 text-center">
                    <p className="text-xs font-medium text-bone/75">Your Up Next queue is empty</p>
                    <p className="mt-1 text-[11px] leading-5 text-bone/45">
                      Search for songs or tap “+ Queue” in Related Music to add upcoming tracks.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('related')}
                      className="mt-3.5 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-bone/20 px-3 py-1 text-xs text-cyan transition hover:border-cyan hover:bg-cyan/10"
                    >
                      <Icon n="sparkles" s={13} />
                      <span>Explore Related Music</span>
                    </button>
                  </div>
                ) : (
                  <ul className="mt-2.5 space-y-1.5" role="list">
                    {userQueue.map((item, index) => (
                      <li
                        key={`${item.id}-${index}`}
                        className="group flex items-center gap-2.5 rounded-xl border border-bone/10 bg-raised/40 p-2.5 transition hover:border-bone/20 hover:bg-raised/70"
                      >
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-void">
                          {item.image ? (
                            <img src={item.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="grid h-full w-full place-items-center bg-raised text-[10px] text-bone/40">
                              AAK
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => {
                              universal.removeFromUserQueue(index);
                              universal.playItem(item);
                            }}
                            className="block w-full text-left"
                          >
                            <p className="truncate text-xs font-semibold text-bone transition group-hover:text-cyan">
                              {item.title}
                            </p>
                            <p className="truncate text-[10px] text-bone/55">
                              {item.artist} · <span className="font-mono text-cyan/70">{item.provider}</span>
                            </p>
                          </button>
                        </div>

                        {/* Reorder and remove buttons */}
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => universal.moveUserQueueItem(index, index - 1)}
                            aria-label={`Move ${item.title} up in queue`}
                            className="grid h-8 w-8 place-items-center rounded-lg text-bone/45 transition hover:bg-bone/10 hover:text-bone disabled:opacity-20"
                          >
                            <Icon n="arrowUp" s={14} />
                          </button>
                          <button
                            type="button"
                            disabled={index === userQueue.length - 1}
                            onClick={() => universal.moveUserQueueItem(index, index + 1)}
                            aria-label={`Move ${item.title} down in queue`}
                            className="grid h-8 w-8 place-items-center rounded-lg text-bone/45 transition hover:bg-bone/10 hover:text-bone disabled:opacity-20"
                          >
                            <Icon n="arrowDown" s={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => universal.removeFromUserQueue(index)}
                            aria-label={`Remove ${item.title} from queue`}
                            className="grid h-8 w-8 place-items-center rounded-lg text-bone/45 transition hover:bg-amber-500/20 hover:text-amber-300"
                          >
                            <Icon n="close" s={14} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* UPCOMING IN ALBUM / PLAYLIST */}
              <section aria-labelledby="playlist-sequence-heading">
                <p id="playlist-sequence-heading" className="text-[10px] font-mono uppercase tracking-widest text-bone/55">
                  Next in AAK Master Catalog
                </p>
                <ul className="mt-2.5 space-y-1.5" role="list">
                  {upcomingInContext.slice(0, 4).map((track) => (
                    <li
                      key={track.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-bone/5 bg-raised/20 p-2.5 transition hover:bg-raised/40"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Art a={track.a} b={track.b} image={track.image} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-bone">{track.title}</p>
                          <p className="truncate text-[10px] text-bone/50">{track.genre} · {track.bpm} BPM</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
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
                          aria-label={`Add ${track.title} to queue`}
                          className="rounded-lg border border-bone/15 px-2.5 py-1 text-[10px] font-mono text-bone/70 transition hover:border-cyan hover:text-cyan"
                        >
                          + Queue
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : (
            /* RELATED MUSIC TAB */
            <div className="space-y-4">
              <div className="rounded-xl border border-bone/10 bg-raised/30 p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-cyan">Smart Recommendations</p>
                <p className="mt-1 text-xs text-bone/60">
                  Curated based on tempo ({current.bpm} BPM), genre ({current.genre}), and artist catalog for "{current.title}".
                </p>
              </div>

              {loadingRecs ? (
                <div className="space-y-3 py-6 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
                  <p className="text-xs text-bone/50">Analyzing catalog & recommendations…</p>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="rounded-2xl border border-bone/10 p-6 text-center text-xs text-bone/55">
                  No related recommendations available for this track right now.
                </div>
              ) : (
                <ul className="space-y-2" role="list">
                  {recommendations.map(({ item, reason, badge }, idx) => (
                    <li
                      key={`${item.id}-${idx}`}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-bone/10 bg-raised/35 p-3 transition hover:border-bone/25 hover:bg-raised/60"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-void shadow-sm">
                          {item.image ? (
                            <img src={item.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Art a={220} b={180} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-bone group-hover:text-cyan">
                            {item.title}
                          </p>
                          <p className="truncate text-[10px] text-bone/60">{item.artist}</p>
                          <span className="mt-1 inline-block rounded bg-cyan/10 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider text-cyan">
                            {badge} · {reason}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => universal.playItem(item)}
                          aria-label={`Play ${item.title}`}
                          className="grid h-8 w-8 place-items-center rounded-full bg-bone text-ink shadow transition hover:bg-cyan hover:scale-105 active:scale-95"
                        >
                          <Icon n="play" s={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddToQueue(item)}
                          aria-label={`Add ${item.title} to queue`}
                          className="rounded-full border border-bone/15 px-2.5 py-1 text-[10px] font-mono text-bone/70 transition hover:border-cyan hover:text-cyan"
                        >
                          + Queue
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default memo(QueuePanel);
