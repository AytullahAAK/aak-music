import Hero from '../sections/Hero';
import Featured from '../sections/Featured';
import { tracks } from '../data';
import Art from '../components/Art';
import { usePlayer } from '../hooks/usePlayer';
import { RouteLink } from '../router';

export default function HomePage() {
  const player = usePlayer();
  const selected = tracks.slice(1, 4);
  return <>
    <Hero />
    <Featured />
    <section aria-labelledby="selected-releases-title" className="px-4 pb-14 sm:px-6 md:px-12 md:pb-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-cyan">SELECTED RELEASES</p><h2 id="selected-releases-title" className="mt-1 font-display text-xl font-bold sm:text-2xl">A few from the catalog</h2></div>
          <RouteLink to="/music" className="inline-flex min-h-10 items-center rounded-full border border-bone/15 px-4 text-xs text-bone/70 transition hover:border-cyan hover:text-cyan">Explore all seven releases</RouteLink>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-3 sm:gap-4">
          {selected.map((track) => {
            const index = tracks.findIndex((item) => item.id === track.id);
            return <article key={track.id} className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-bone/10 bg-ink/45 p-3 sm:grid-cols-1 sm:p-4">
              <Art a={track.a} b={track.b} image={track.image} className="aspect-square w-[4.5rem] rounded-xl sm:w-full" />
              <div className="min-w-0"><h3 className="truncate font-semibold">{track.title}</h3><p className="mt-1 truncate text-xs text-bone/55">{track.artist} · {track.genre}</p><button type="button" onClick={() => player.play(index)} className="mt-2 min-h-9 rounded-full border border-bone/15 px-3 text-[10px] text-bone/70 transition hover:border-cyan hover:text-cyan">Play release</button></div>
            </article>;
          })}
        </div>
        <nav aria-label="More AAK Music sections" className="mt-5 flex flex-wrap gap-2 border-t border-bone/10 pt-4">
          <RouteLink to="/studio" className="inline-flex min-h-10 items-center rounded-full px-3 text-xs text-bone/55 hover:text-cyan">Loop Studio ↗</RouteLink>
          <RouteLink to="/about" className="inline-flex min-h-10 items-center rounded-full px-3 text-xs text-bone/55 hover:text-cyan">About the artist ↗</RouteLink>
          <RouteLink to="/player" className="inline-flex min-h-10 items-center rounded-full px-3 text-xs text-bone/55 hover:text-cyan">Universal player ↗</RouteLink>
        </nav>
      </div>
    </section>
  </>;
}
