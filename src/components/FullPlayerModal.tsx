import { useState, useEffect } from 'react';
import { usePlayer, useTime, fmt, statusLabel, RepeatMode } from '../hooks/usePlayer';
import { tracks } from '../data';
import Art from './Art';
import Icon, { Eq } from './Icon';
import Slider from './Slider';
import { useUI } from '../hooks/useUI';
import { useUniversalPlayer } from '../hooks/useUniversalPlayer';
import VisualizerToolbar from './VisualizerToolbar';

export default function FullPlayerModal() {
  const p = usePlayer();
  const ui = useUI();
  const universal = useUniversalPlayer();
  const { t, dur } = useTime();
  const { track: k, isExpanded, setIsExpanded } = p;
  const d = dur || k.dur;
  const msg = statusLabel(p.status);

  const [activeTab, setActiveTab] = useState<'queue' | 'search' | 'favorites'>('queue');
  const [searchQuery, setSearchQuery] = useState('');

  // Lock background scroll when full player is expanded on mobile
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsExpanded(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isExpanded, setIsExpanded]);

  if (!isExpanded || universal.activeAudio || universal.activeVideo) return null;

  // Filtered tracks for search tab
  const filteredTracks = tracks.filter((tr) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      tr.title.toLowerCase().includes(q) ||
      tr.artist.toLowerCase().includes(q) ||
      tr.genre.toLowerCase().includes(q) ||
      String(tr.bpm).includes(q)
    );
  });

  // Favorite tracks
  const favoriteTracks = tracks.filter((tr) => p.isFavorite(tr.id));

  const isCurrentFavorite = p.isFavorite(k.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Dedicated Music Player"
      className="fixed inset-0 z-[100] flex flex-col bg-ink/95 backdrop-blur-3xl overflow-y-auto text-bone"
    >
      {/* Top App Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-bone/10 bg-ink/80 px-4 py-3 backdrop-blur-xl sm:px-8 sm:py-4">
        {/* Collapse Button */}
        <button
          onClick={() => setIsExpanded(false)}
          aria-label="Collapse player"
          className="flex items-center gap-2 rounded-full border border-bone/15 px-3 py-1.5 text-xs font-mono text-bone/80 transition hover:border-cyan hover:text-cyan"
        >
          <span className="text-base leading-none">⌄</span>
          <span className="hidden sm:inline">MINIMIZE</span>
        </button>

        {/* Center Title */}
        <div className="text-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-cyan">
            AAK MUSIC CONSOLE
          </span>
          <p className="font-display text-xs font-bold sm:text-sm">NOW PLAYING</p>
        </div>

        {/* Right Favorite Toggle */}
        <button
          onClick={() => p.toggleFavorite(k.id)}
          aria-label={isCurrentFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className="grid h-9 w-9 place-items-center rounded-full border border-bone/15 transition hover:border-pink-500 hover:text-pink-500"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={isCurrentFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            className={isCurrentFavorite ? 'text-pink-500' : 'text-bone/70'}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Main Player Workspace */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-6 sm:px-8 lg:grid lg:grid-cols-12 lg:gap-12 lg:py-10">
        {/* Left Column: Big Album Poster & Metadata */}
        <div className="flex flex-col items-center justify-center lg:col-span-6">
          <div className="relative aspect-square w-full max-w-[280px] overflow-hidden rounded-3xl shadow-2xl sm:max-w-[360px] lg:max-w-[420px]">
            <Art
              a={k.a}
              b={k.b}
              image={k.image}
              className="h-full w-full object-cover shadow-2xl transition duration-700"
            />
            {/* Ambient Corner Reflection */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent"
            />

            {/* Equalizer Badge */}
            {p.playing && (
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-ink/80 px-3 py-1 font-mono text-xs text-cyan backdrop-blur-md">
                <Eq on={true} />
                <span>ACTIVE</span>
              </div>
            )}
          </div>

          {/* Title & Artist */}
          <div className="mt-6 text-center w-full max-w-md">
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
              {k.title}
            </h2>
            <p className="mt-1 font-mono text-xs text-cyan sm:text-sm">{k.artist}</p>
            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-mono text-bone/60">
              <span className="rounded bg-bone/10 px-2 py-0.5">{k.genre}</span>
              <span>•</span>
              <span>{k.bpm} BPM</span>
              <span>•</span>
              <span>{k.date}</span>
            </div>
            {msg && <p className="mt-2 text-xs font-mono text-cyan">{msg}</p>}
          </div>
        </div>

        {/* Right Column: Controls, Queue & Library Navigation */}
        <div className="mt-8 flex flex-col justify-between rounded-3xl border border-bone/15 bg-void/50 p-5 backdrop-blur-xl sm:p-7 lg:col-span-6 lg:mt-0">
          {/* Tabs: Queue / Search / Favorites */}
          <div className="flex items-center justify-between border-b border-bone/10 pb-3">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('queue')}
                className={`rounded-lg px-3 py-1 text-xs font-mono transition-colors ${
                  activeTab === 'queue'
                    ? 'bg-bone text-ink font-bold'
                    : 'text-bone/60 hover:text-bone'
                }`}
              >
                Queue ({tracks.length})
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`rounded-lg px-3 py-1 text-xs font-mono transition-colors ${
                  activeTab === 'search'
                    ? 'bg-bone text-ink font-bold'
                    : 'text-bone/60 hover:text-bone'
                }`}
              >
                Search & Library
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`rounded-lg px-3 py-1 text-xs font-mono transition-colors ${
                  activeTab === 'favorites'
                    ? 'bg-bone text-ink font-bold'
                    : 'text-bone/60 hover:text-bone'
                }`}
              >
                Favorites ({favoriteTracks.length})
              </button>
            </div>
          </div>

          <div className="relative flex justify-end py-2"><VisualizerToolbar embedded /></div>

          {/* Tab Content Box */}
          <div className="my-4 h-48 overflow-y-auto pr-1 sm:h-56">
            {/* 1. Queue Tab */}
            {activeTab === 'queue' && (
              <div className="space-y-1.5">
                {tracks.map((tr, idx) => {
                  const isCur = p.i === idx;
                  return (
                    <button
                      key={tr.id}
                      onClick={() => p.play(idx)}
                      className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-colors ${
                        isCur
                          ? 'bg-cyan/15 border border-cyan/30 text-cyan'
                          : 'hover:bg-bone/5 text-bone/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs text-bone/40 w-4 text-center">
                          {isCur && p.playing ? <Eq on={true} /> : idx + 1}
                        </span>
                        <div className="min-w-0 truncate">
                          <p className="truncate text-xs font-semibold sm:text-sm">
                            {tr.title}
                          </p>
                          <p className="truncate text-[10px] font-mono text-bone/50">
                            {tr.artist} • {tr.genre}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs tabular-nums text-bone/50">
                        {fmt(tr.dur)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. Search Tab */}
            {activeTab === 'search' && (
              <div>
                <input
                  type="text"
                  placeholder="Search tracks by title, genre, BPM…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-bone/20 bg-ink/80 px-3.5 py-2 font-mono text-xs text-bone placeholder:text-bone/40 focus:border-cyan focus:outline-none"
                />
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    ui.openSearch(searchQuery);
                  }}
                  className="mt-2 min-h-11 rounded-lg border border-cyan/30 px-3 text-left text-xs font-mono text-cyan transition hover:bg-cyan/10"
                >
                  Search AAK and external catalogue
                </button>
                <div className="mt-3 space-y-1.5">
                  {filteredTracks.map((tr) => {
                    const originalIdx = tracks.findIndex((t) => t.id === tr.id);
                    const isCur = p.i === originalIdx;
                    return (
                      <button
                        key={tr.id}
                        onClick={() => p.play(originalIdx)}
                        className={`flex w-full items-center justify-between rounded-xl p-2 text-left transition-colors ${
                          isCur
                            ? 'bg-cyan/15 border border-cyan/30 text-cyan'
                            : 'hover:bg-bone/5 text-bone/80'
                        }`}
                      >
                        <div className="min-w-0 truncate">
                          <p className="truncate text-xs font-semibold">{tr.title}</p>
                          <p className="truncate text-[10px] font-mono text-bone/50">
                            {tr.genre} • {tr.bpm} BPM
                          </p>
                        </div>
                        <span className="font-mono text-xs tabular-nums text-bone/50">
                          {fmt(tr.dur)}
                        </span>
                      </button>
                    );
                  })}
                  {filteredTracks.length === 0 && (
                    <p className="py-6 text-center font-mono text-xs text-bone/50">
                      No tracks found matching “{searchQuery}”.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 3. Favorites Tab */}
            {activeTab === 'favorites' && (
              <div className="space-y-1.5">
                {favoriteTracks.map((tr) => {
                  const originalIdx = tracks.findIndex((t) => t.id === tr.id);
                  const isCur = p.i === originalIdx;
                  return (
                    <button
                      key={tr.id}
                      onClick={() => p.play(originalIdx)}
                      className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-colors ${
                        isCur
                          ? 'bg-cyan/15 border border-cyan/30 text-cyan'
                          : 'hover:bg-bone/5 text-bone/80'
                      }`}
                    >
                      <div className="min-w-0 truncate">
                        <p className="truncate text-xs font-semibold sm:text-sm">
                          {tr.title}
                        </p>
                        <p className="truncate text-[10px] font-mono text-bone/50">
                          {tr.genre} • {tr.bpm} BPM
                        </p>
                      </div>
                      <span className="font-mono text-xs tabular-nums text-bone/50">
                        {fmt(tr.dur)}
                      </span>
                    </button>
                  );
                })}
                {favoriteTracks.length === 0 && (
                  <div className="py-8 text-center font-mono text-xs text-bone/50">
                    No favorite tracks yet. Click the heart icon on any track to save it here!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progress Seek Bar */}
          <div className="mt-2">
            <Slider
              label="Seek"
              value={t}
              max={d}
              disabled={!k.src || !dur}
              onChange={p.seek}
              className="w-full cursor-pointer"
            />
            <div className="mt-1 flex justify-between text-xs font-mono tabular-nums text-bone/60">
              <span>{fmt(t)}</span>
              <span>{fmt(d)}</span>
            </div>
          </div>

          {/* Full Transport Controls: Shuffle, Prev, Play/Pause, Next, Repeat */}
          <div className="mt-4 flex items-center justify-between px-2 sm:px-6">
            {/* Shuffle Button */}
            <button
              onClick={p.toggleShuffle}
              aria-label={p.shuffle ? 'Shuffle on' : 'Shuffle off'}
              title={`Shuffle: ${p.shuffle ? 'On' : 'Off'}`}
              className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${
                p.shuffle ? 'text-cyan bg-cyan/15' : 'text-bone/50 hover:text-bone'
              }`}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
            </button>

            {/* Prev Track */}
            <button
              onClick={p.prev}
              aria-label="Previous track"
              className="grid h-11 w-11 place-items-center text-bone/80 transition hover:text-cyan active:scale-90"
            >
              <Icon n="prev" s={22} />
            </button>

            {/* Primary Play/Pause Button */}
            <button
              onClick={p.toggle}
              aria-label={p.playing ? 'Pause' : 'Play'}
              className="grid h-16 w-16 place-items-center rounded-full bg-bone text-ink shadow-2xl transition duration-300 hover:scale-105 hover:bg-cyan active:scale-95"
            >
              <Icon n={p.playing ? 'pause' : 'play'} s={26} />
            </button>

            {/* Next Track */}
            <button
              onClick={p.next}
              aria-label="Next track"
              className="grid h-11 w-11 place-items-center text-bone/80 transition hover:text-cyan active:scale-90"
            >
              <Icon n="next" s={22} />
            </button>

            {/* Repeat Button (Off / All / One) */}
            <button
              onClick={p.toggleRepeat}
              aria-label={`Repeat mode: ${p.repeat}`}
              title={`Repeat: ${p.repeat}`}
              className={`relative grid h-10 w-10 place-items-center rounded-full transition-colors ${
                p.repeat !== 'off' ? 'text-cyan bg-cyan/15' : 'text-bone/50 hover:text-bone'
              }`}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              {p.repeat === 'one' && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan text-[9px] font-bold text-ink">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Volume Control Bar */}
          <div className="mt-5 flex items-center gap-3 border-t border-bone/10 pt-4">
            <button
              onClick={() => p.setVol(p.vol === 0 ? 0.85 : 0)}
              aria-label={p.vol === 0 ? 'Unmute' : 'Mute'}
              className="text-bone/60 hover:text-cyan transition-colors"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
              className="flex-1 cursor-pointer"
            />
            <span className="font-mono text-xs tabular-nums text-bone/50 w-8 text-right">
              {Math.round(p.vol * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

