import { useState, useEffect, useRef } from 'react';
import { usePlayer, useTime, fmt, statusLabel } from '../hooks/usePlayer';
import { tracks } from '../data';
import Art from './Art';
import Icon, { Eq } from './Icon';
import Slider from './Slider';
import { useUniversalPlayer } from '../hooks/useUniversalPlayer';

export default function MiniPlayer() {
  const p = usePlayer();
  const universal = useUniversalPlayer();
  const { t, dur } = useTime();
  const { track: k, setIsExpanded } = p;
  const d = dur || k.dur;
  const msg = statusLabel(p.status);

  const [queueOpen, setQueueOpen] = useState(false);
  const prevVol = useRef(p.vol);
  const playerRef = useRef(p);
  const universalRef = useRef(universal);
  playerRef.current = p;
  universalRef.current = universal;

  // Global Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (universalRef.current.activeAudio) universalRef.current.toggle();
        else if (!universalRef.current.activeVideo) playerRef.current.toggle();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (p.vol > 0) {
          prevVol.current = p.vol;
          p.setVol(0);
        } else {
          p.setVol(prevVol.current || 0.85);
        }
      } else if (e.code === 'ArrowRight' && (e.metaKey || e.ctrlKey || e.altKey)) {
        e.preventDefault();
        if (universalRef.current.activeAudio) universalRef.current.next();
        else if (!universalRef.current.activeVideo) playerRef.current.next();
      } else if (e.code === 'ArrowLeft' && (e.metaKey || e.ctrlKey || e.altKey)) {
        e.preventDefault();
        if (universalRef.current.activeAudio) universalRef.current.prev();
        else if (!universalRef.current.activeVideo) playerRef.current.prev();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const toggleMute = () => {
    if (p.vol > 0) {
      prevVol.current = p.vol;
      p.setVol(0);
    } else {
      p.setVol(prevVol.current || 0.85);
    }
  };

  const isFav = p.isFavorite(k.id);

  if (p.isExpanded || universal.activeAudio || universal.activeVideo) return null;

  return (
    <>
      {/* Quick Queue Popover (when not in full player modal) */}
      {queueOpen && (
        <div
          role="dialog"
          aria-label="Playback queue"
          className="fixed bottom-[4.8rem] right-2 z-50 w-80 max-w-[calc(100vw-1rem)] rounded-2xl border border-bone/15 bg-ink/95 p-4 shadow-2xl backdrop-blur-2xl sm:bottom-20 sm:right-6 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-bone/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-bone">PLAYLIST QUEUE</span>
              <span className="rounded bg-cyan/15 px-2 py-0.5 font-mono text-[10px] text-cyan">
                {tracks.length} TRACKS
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setQueueOpen(false);
                  setIsExpanded(true);
                }}
                className="font-mono text-[10px] text-cyan hover:underline"
              >
                FULL PLAYER ↗
              </button>
              <button
                onClick={() => setQueueOpen(false)}
                aria-label="Close queue"
                className="text-xs font-mono text-bone/60 hover:text-cyan"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {tracks.map((tr, idx) => {
              const isCur = p.i === idx;
              return (
                <button
                  key={tr.id}
                  onClick={() => p.play(idx)}
                  className={`flex w-full items-center justify-between rounded-xl p-2 text-left transition-colors ${
                    isCur
                      ? 'bg-cyan/15 border border-cyan/30 text-cyan'
                      : 'hover:bg-bone/5 text-bone/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[10px] text-bone/40 w-4 text-center">
                      {isCur && p.playing ? <Eq on={true} /> : idx + 1}
                    </span>
                    <div className="min-w-0 truncate">
                      <p className="truncate text-xs font-semibold">{tr.title}</p>
                      <p className="truncate text-[10px] font-mono text-bone/50">
                        {tr.genre} • {tr.bpm} BPM
                      </p>
                    </div>
                  </div>
                  <span className="ml-2 shrink-0 font-mono text-[10px] tabular-nums text-bone/50">
                    {fmt(tr.dur)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main MiniPlayer Bottom Bar */}
      <div
        role="region"
        aria-label="Music player bar"
        className="fixed inset-x-0 bottom-0 z-50 w-full max-w-[100vw] overflow-hidden border-t border-bone/15 bg-ink/95 backdrop-blur-2xl mobile-player-safe"
      >
        {/* Seek Progress Bar */}
        <Slider
          label="Seek"
          value={t}
          max={d}
          disabled={!k.src || !dur}
          onChange={p.seek}
          className="absolute inset-x-0 -top-2 cursor-pointer"
        />

        <div className="mx-auto flex w-full min-w-0 max-w-[1600px] items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6 md:px-12 md:py-2.5">
          {/* Left: Track Info & Artwork (Clicking expands to full player!) */}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 flex-1 md:flex-initial md:w-80">
            <button
              onClick={() => setIsExpanded(true)}
              aria-label="Open full music player"
              title="Expand to Full Player"
              className="group relative shrink-0 overflow-hidden rounded-lg shadow-md transition hover:scale-105"
            >
              <Art
                a={k.a}
                b={k.b}
                image={k.image}
                className="h-10 w-10 sm:h-11 sm:w-11 object-cover"
              />
              <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white">
                ⛶
              </span>
            </button>

            <button
              onClick={() => setIsExpanded(true)}
              aria-label="Open full music player"
              title="Click to open Full Player"
              className="min-w-0 flex-1 overflow-hidden text-left"
            >
              <p className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold sm:text-sm hover:text-cyan transition-colors">
                <Eq on={p.playing} />
                <span className="min-w-0 truncate text-bone">{k.title}</span>
              </p>
              <p className={`truncate text-[10px] font-mono sm:text-xs ${msg ? 'text-cyan' : 'text-bone/60'}`}>
                {msg ?? `${k.artist} • ${k.genre}`}
              </p>
            </button>

            {/* Favorite Quick Button */}
            <button
              onClick={() => p.toggleFavorite(k.id)}
              aria-label={isFav ? 'Remove favorite' : 'Add to favorites'}
              className="hidden sm:grid h-8 w-8 place-items-center rounded-full text-bone/50 hover:text-pink-500 transition-colors"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill={isFav ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                className={isFav ? 'text-pink-500' : 'text-bone/40'}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>

          {/* Center: Playback Transport Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Shuffle (desktop) */}
            <button
              onClick={p.toggleShuffle}
              aria-label="Shuffle"
              title={`Shuffle: ${p.shuffle ? 'On' : 'Off'}`}
              className={`hidden md:grid h-8 w-8 place-items-center transition-colors ${
                p.shuffle ? 'text-cyan' : 'text-bone/40 hover:text-bone'
              }`}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
            </button>

            <button
              aria-label="Previous track"
              onClick={p.prev}
              className="grid h-9 w-9 shrink-0 place-items-center text-bone/75 transition hover:text-cyan active:scale-95"
            >
              <Icon n="prev" s={19} />
            </button>

            <button
              aria-label={p.playing ? 'Pause' : 'Play'}
              onClick={p.toggle}
              className="grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-bone text-ink shadow-lg transition duration-200 hover:scale-105 hover:bg-cyan active:scale-95"
            >
              <Icon n={p.playing ? 'pause' : 'play'} s={19} />
            </button>

            <button
              aria-label="Next track"
              onClick={p.next}
              className="grid h-9 w-9 shrink-0 place-items-center text-bone/75 transition hover:text-cyan active:scale-95"
            >
              <Icon n="next" s={19} />
            </button>

            {/* Repeat (desktop) */}
            <button
              onClick={p.toggleRepeat}
              aria-label="Repeat"
              title={`Repeat: ${p.repeat}`}
              className={`relative hidden md:grid h-8 w-8 place-items-center transition-colors ${
                p.repeat !== 'off' ? 'text-cyan' : 'text-bone/40 hover:text-bone'
              }`}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              {p.repeat === 'one' && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-cyan text-[8px] font-bold text-ink">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Right: Time, Queue & Expand to Full Player */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Time Indicator */}
            <span className="hidden text-xs font-mono tabular-nums text-bone/60 md:block">
              {fmt(t)} / {fmt(d)}
            </span>

            {/* Queue Toggle Button */}
            <button
              onClick={() => setQueueOpen(!queueOpen)}
              aria-label="Toggle playlist queue"
              title="Playlist Queue"
              className={`hidden sm:flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-mono transition-colors ${
                queueOpen
                  ? 'border-cyan bg-cyan/15 text-cyan'
                  : 'border-bone/15 text-bone/70 hover:border-bone/40 hover:text-bone'
              }`}
            >
              <span>QUEUE</span>
              <span className="hidden lg:inline">({tracks.length})</span>
            </button>

            {/* Expand into Full Player Button */}
            <button
              onClick={() => setIsExpanded(true)}
              aria-label="Open full player view"
              title="Open Full Music Application View"
              className="flex items-center gap-1 rounded-lg border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-[11px] font-mono text-cyan transition hover:bg-cyan hover:text-ink"
            >
              <span>EXPAND</span>
              <span>↗</span>
            </button>

            {/* Volume & Mute Control (Desktop) */}
            <div className="hidden items-center gap-2 lg:flex">
              <button
                onClick={toggleMute}
                aria-label={p.vol === 0 ? 'Unmute' : 'Mute'}
                className="text-bone/70 hover:text-cyan transition-colors"
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  {p.vol === 0 ? (
                    <>
                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </>
                  ) : (
                    <>
                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </>
                  )}
                </svg>
              </button>
              <Slider
                label="Volume"
                value={p.vol}
                max={1}
                onChange={p.setVol}
                className="w-18 xl:w-22"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
