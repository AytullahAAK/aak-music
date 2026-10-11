import { useState } from 'react';
import RevealText from '../components/RevealText';
import Art from '../components/Art';
import Icon, { Eq } from '../components/Icon';
import { tracks } from '../data';
import { usePlayer, fmt } from '../hooks/usePlayer';

export default function Releases() {
  const p = usePlayer();
  const [genreFilter, setGenreFilter] = useState('All');

  const genres = ['All', 'EDM', 'Techno', 'hip-hop', 'Acoustic', 'Sad'];

  const filteredTracks =
    genreFilter === 'All'
      ? tracks
      : tracks.filter(
          (t) => t.genre.toLowerCase() === genreFilter.toLowerCase()
        );

  const lit = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    const s = e.currentTarget.style;
    s.setProperty('--px', String((e.clientX - r.left) / r.width));
    s.setProperty('--py', String((e.clientY - r.top) / r.height));
  };

  return (
    <section id="music" className="relative min-h-[100svh] px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1600px]">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3.5 py-1 text-xs font-mono font-medium tracking-widest text-cyan">
              <span>SCENE 06</span>
              <span>//</span>
              <span>AAK MUSIC CATALOGUE</span>
            </div>

            <div className="mt-4">
              <RevealText
                as="h2"
                className="font-display text-4xl font-extrabold leading-[.9] tracking-[-.03em] md:text-7xl"
                lines={['LATEST', 'RELEASES']}
              />
            </div>
          </div>

          <div className="max-w-md text-sm text-bone/70">
            <p>
              The complete original discography of AAK Music. Select any record to stream
              with full real-time audio analysis and 3D visual reactions.
            </p>
          </div>
        </div>

        {/* Genre Filter Pills */}
        <div className="mt-10 flex flex-wrap items-center gap-2 border-b border-bone/15 pb-6">
          <span className="mr-2 text-xs font-mono uppercase tracking-wider text-bone/50">
            Filter:
          </span>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setGenreFilter(g)}
              className={`rounded-full px-4 py-1.5 text-xs font-mono font-semibold transition-all duration-300 ${
                genreFilter.toLowerCase() === g.toLowerCase()
                  ? 'bg-bone text-ink shadow-[0_0_18px_rgba(255,255,255,0.4)]'
                  : 'border border-bone/20 bg-void/50 text-bone/70 hover:border-bone/50 hover:text-bone'
              }`}
            >
              {g}
            </button>
          ))}
          <span className="ml-auto text-xs font-mono text-bone/50">
            SHOWING {filteredTracks.length} OF {tracks.length} TRACKS
          </span>
        </div>

        {/* 3D Perspective Card Showcase Grid */}
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTracks.map((t) => {
            const originalIndex = tracks.findIndex((item) => item.id === t.id);
            const isSelected = p.i === originalIndex;
            const isPlaying = isSelected && p.playing;

            return (
              <div
                key={t.id}
                data-sel={isSelected}
                className="group relative flex flex-col justify-between rounded-3xl border border-bone/15 bg-void/60 p-4 transition-all duration-500 hover:border-cyan/50 hover:shadow-[0_20px_60px_-15px_rgba(95,212,255,0.25)]"
              >
                {/* Album Poster with 3D Tilt and Lighting Highlights */}
                <button
                  onClick={() =>
                    isPlaying ? p.toggle() : p.play(originalIndex)
                  }
                  aria-label={`${isPlaying ? 'Pause' : 'Play'} ${t.title} by ${t.artist}`}
                  aria-pressed={isPlaying}
                  onPointerMove={lit}
                  className="tilt relative block aspect-[4/5] w-full overflow-hidden rounded-2xl shadow-xl transition-transform duration-500 group-hover:scale-[1.02]"
                >
                  <Art
                    a={t.a}
                    b={t.b}
                    image={t.image}
                    className="h-full w-full object-cover transition-all duration-700 group-hover:brightness-110"
                  />

                  {/* Dynamic Pointer Light Glare */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background:
                        'radial-gradient(280px circle at calc(var(--px,.5)*100%) calc(var(--py,.5)*100%), rgb(var(--accent2) / .35), transparent 65%)',
                    }}
                  />

                  {/* Play Overlay Button */}
                  <span
                    className={`absolute inset-0 grid place-items-center transition-all duration-300 ${
                      isPlaying
                        ? 'bg-black/40 opacity-100'
                        : 'bg-black/20 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-bone text-ink shadow-2xl transition-transform duration-300 group-hover:scale-110">
                      <Icon n={isPlaying ? 'pause' : 'play'} s={24} />
                    </span>
                  </span>

                  {/* Playing Equalizer Indicator Badge */}
                  {isPlaying && (
                    <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-ink/80 px-3 py-1 text-xs font-mono font-medium text-cyan backdrop-blur-md">
                      <Eq on={true} />
                      <span>PLAYING</span>
                    </div>
                  )}

                  {/* BPM & Genre Badges */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <span className="rounded-md bg-ink/75 px-2.5 py-1 text-[11px] font-mono font-semibold text-bone backdrop-blur-md">
                      {t.bpm} BPM
                    </span>
                    <span className="rounded-md bg-ink/75 px-2.5 py-1 text-[11px] font-mono uppercase text-cyan backdrop-blur-md">
                      {t.genre}
                    </span>
                  </div>
                </button>

                {/* Track Details & Actions */}
                <div className="mt-4 flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="font-display text-xl font-bold tracking-tight text-bone group-hover:text-cyan transition-colors">
                      {t.title}
                    </h3>
                    <p className="mt-1 text-xs font-mono text-bone/60">
                      {t.artist} • {t.date}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-bone/10 pt-3 text-xs font-mono text-bone/60">
                    <span className="tabular-nums">{fmt(t.dur)}</span>
                    <button
                      onClick={() =>
                        isPlaying ? p.toggle() : p.play(originalIndex)
                      }
                      className="font-semibold text-cyan hover:underline"
                    >
                      {isPlaying ? 'PAUSE' : 'PLAY NOW'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
