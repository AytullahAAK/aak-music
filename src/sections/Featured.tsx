import { useState } from 'react';
import Art from '../components/Art';
import Icon, { Eq } from '../components/Icon';
import { usePlayer, useTime, fmt, statusLabel } from '../hooks/usePlayer';
import { tracks } from '../data';
import { useReveal } from '../hooks/useReveal';
import { useParallax } from '../hooks/useParallax';
import Slider from '../components/Slider';

export default function Featured() {
  const p = usePlayer();
  const tm = useTime();
  // Display the currently selected track from the active player state!
  const k = p.track;
  const on = true; // Always synced to current track
  const d = tm.dur || k.dur;
  const pr = d > 0 ? Math.min(1, tm.t / d) : 0;
  const msg = !k.src ? 'Preview unavailable' : statusLabel(p.status);
  const ref = useReveal<HTMLDivElement>();
  const bpm = useParallax<HTMLSpanElement>(-0.07);

  const [trackListOpen, setTrackListOpen] = useState(false);
  const isFav = p.isFavorite(k.id);

  return (
    <section id="player" className="relative overflow-hidden px-4 py-20 sm:px-6 md:px-12 md:py-36">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-1/4 top-0 h-full w-3/4"
        style={{
          background: 'radial-gradient(closest-side,rgb(var(--accent) / var(--halo-a)),transparent)',
        }}
      />

      <div
        ref={ref}
        className="reveal relative mx-auto grid min-w-0 max-w-[1600px] grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-14"
      >
        {/* Left Column: Big Album Poster with 3D Parallax BPM */}
        <div className="relative mx-auto min-w-0 w-full max-w-full lg:col-span-6 lg:max-w-none">
          <div className="relative aspect-square w-full min-w-0 overflow-hidden rounded-3xl shadow-2xl lg:w-[92%]">
            <Art
              a={k.a}
              b={k.b}
              image={k.image}
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-102"
            />
            {/* Ambient vignette */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent"
            />

            {/* Playing Badge */}
            {p.playing && (
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-ink/80 px-3 py-1 font-mono text-xs text-cyan backdrop-blur-md">
                <Eq on={true} />
                <span>PLAYING LIVE</span>
              </div>
            )}

            {/* Favorite button on album poster */}
            <button
              onClick={() => p.toggleFavorite(k.id)}
              aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-ink/80 text-bone/80 backdrop-blur-md transition hover:scale-110 hover:text-pink-500"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={isFav ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                className={isFav ? 'text-pink-500' : 'text-bone/60'}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>

          <span
            ref={bpm}
            aria-hidden
            className="pointer-events-none absolute -bottom-4 left-2 font-display text-[clamp(3rem,9vw,10rem)] font-extrabold leading-none tracking-[-0.04em] text-white mix-blend-difference sm:-bottom-6 sm:left-4 lg:left-[40%]"
          >
            {k.bpm}
          </span>
        </div>

        {/* Right Column: Master Production Console */}
        <div className="lg:col-span-6 lg:col-start-7">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3.5 py-1 text-xs font-mono font-medium tracking-widest text-cyan">
              <span>STANDALONE MUSIC CONSOLE</span>
            </div>

            <button
              onClick={() => p.setIsExpanded(true)}
              className="text-xs font-mono text-cyan hover:underline flex items-center gap-1"
            >
              <span>FULL APP VIEW</span>
              <span>↗</span>
            </button>
          </div>

          <p className="text-xs font-mono text-bone/60 sm:text-sm">
            TRACK {p.i + 1} OF {tracks.length}
          </p>

          <h2 className="mt-2 font-display text-3xl font-extrabold leading-[0.92] tracking-[-0.03em] sm:text-5xl md:text-6xl">
            {k.title}
          </h2>
          <p className="mt-2 text-base text-bone/80 sm:text-xl">{k.artist}</p>

          {/* Track Metadata Specs */}
          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-bone/15 pt-5 sm:gap-6 sm:pt-6">
            {[
              ['Genre', k.genre],
              ['Tempo', `${k.bpm} BPM`],
              ['Released', k.date],
            ].map(([a, b]) => (
              <div key={a} className="rounded-xl border border-bone/10 bg-void/40 p-2.5 sm:p-3">
                <dt className="text-[10px] font-mono text-bone/50 sm:text-xs">{a}</dt>
                <dd className="mt-0.5 text-xs font-bold text-bone sm:text-sm">{b}</dd>
              </div>
            ))}
          </dl>

          {/* Transport & Interactive Audio Waveform */}
          <div className="mt-8 rounded-2xl border border-bone/15 bg-void/60 p-4 sm:p-6 backdrop-blur-xl">
            {/* Waveform Visualization Bars */}
            <div className="relative mb-3 flex h-14 items-center gap-[2px] sm:gap-[3px]">
              {Array.from({ length: 48 }, (_, i) => {
                const h = 18 + Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23)) * 82;
                return (
                  <i
                    key={i}
                    aria-hidden
                    className="w-full rounded-full transition-colors duration-200"
                    style={{
                      height: `${h}%`,
                      background:
                        i / 48 < pr
                          ? 'rgb(var(--accent2))'
                          : 'rgb(var(--fg) / 0.22)',
                    }}
                  />
                );
              })}
              <input
                aria-label="Seek track"
                disabled={!k.src || !tm.dur}
                type="range"
                min={0}
                max={d}
                step="any"
                value={tm.t}
                onChange={(e) => p.seek(+e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
              />
            </div>

            {/* Time stamps */}
            <div className="flex justify-between text-xs font-mono tabular-nums text-bone/60">
              <span>{fmt(tm.t)}</span>
              {msg && <span className="text-cyan">{msg}</span>}
              <span>{fmt(d)}</span>
            </div>

            {/* Main Controls Row: Shuffle, Prev, Play/Pause, Next, Repeat */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Shuffle */}
                <button
                  onClick={p.toggleShuffle}
                  aria-label="Shuffle"
                  title={`Shuffle: ${p.shuffle ? 'On' : 'Off'}`}
                  className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
                    p.shuffle ? 'text-cyan bg-cyan/15' : 'text-bone/50 hover:text-bone'
                  }`}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="16 3 21 3 21 8" />
                    <line x1="4" y1="20" x2="21" y2="3" />
                    <polyline points="21 16 21 21 16 21" />
                    <line x1="15" y1="15" x2="21" y2="21" />
                    <line x1="4" y1="4" x2="9" y2="9" />
                  </svg>
                </button>

                {/* Prev */}
                <button
                  onClick={p.prev}
                  aria-label="Previous track"
                  className="grid h-10 w-10 place-items-center text-bone/75 transition hover:text-cyan active:scale-95"
                >
                  <Icon n="prev" s={20} />
                </button>

                {/* Play / Pause */}
                <button
                  onClick={p.toggle}
                  aria-label={p.playing ? 'Pause' : 'Play'}
                  className="grid h-14 w-14 place-items-center rounded-full bg-bone text-ink shadow-xl transition duration-300 hover:scale-105 hover:bg-cyan active:scale-95"
                >
                  <Icon n={p.playing ? 'pause' : 'play'} s={22} />
                </button>

                {/* Next */}
                <button
                  onClick={p.next}
                  aria-label="Next track"
                  className="grid h-10 w-10 place-items-center text-bone/75 transition hover:text-cyan active:scale-95"
                >
                  <Icon n="next" s={20} />
                </button>

                {/* Repeat */}
                <button
                  onClick={p.toggleRepeat}
                  aria-label={`Repeat mode: ${p.repeat}`}
                  title={`Repeat: ${p.repeat}`}
                  className={`relative grid h-9 w-9 place-items-center rounded-lg transition-colors ${
                    p.repeat !== 'off' ? 'text-cyan bg-cyan/15' : 'text-bone/50 hover:text-bone'
                  }`}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="17 1 21 5 17 9" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <polyline points="7 23 3 19 7 15" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                  {p.repeat === 'one' && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan text-[8px] font-bold text-ink">
                      1
                    </span>
                  )}
                </button>
              </div>

              {/* Quick Tracklist Dropdown Toggle */}
              <button
                onClick={() => setTrackListOpen(!trackListOpen)}
                className={`rounded-xl border px-3 py-1.5 font-mono text-xs transition-colors ${
                  trackListOpen
                    ? 'border-cyan bg-cyan/15 text-cyan'
                    : 'border-bone/20 text-bone/70 hover:border-bone/50'
                }`}
              >
                {trackListOpen ? 'HIDE QUEUE' : 'SELECT TRACK ▾'}
              </button>
            </div>

            {/* Quick Track Selection Accordion */}
            {trackListOpen && (
              <div className="mt-4 border-t border-bone/10 pt-3 space-y-1 max-h-48 overflow-y-auto pr-1">
                {tracks.map((tr, idx) => {
                  const isCur = p.i === idx;
                  return (
                    <button
                      key={tr.id}
                      onClick={() => p.play(idx)}
                      className={`flex w-full items-center justify-between rounded-lg p-2 text-left font-mono text-xs transition-colors ${
                        isCur
                          ? 'bg-cyan/15 text-cyan font-bold'
                          : 'text-bone/70 hover:bg-bone/5 hover:text-bone'
                      }`}
                    >
                      <span className="truncate">
                        {isCur ? '▶ ' : `${idx + 1}. `}
                        {tr.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-bone/50">{tr.genre}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
