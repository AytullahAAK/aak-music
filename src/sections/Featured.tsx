import { tracks } from '../data';
import Art from '../components/Art';
import { usePlayer } from '../hooks/usePlayer';
import { RouteLink } from '../router';

export default function Featured() {
  const player = usePlayer();
  const track = tracks[0];
  return <section aria-labelledby="featured-release-title" className="px-4 py-14 sm:px-6 md:px-12 md:py-20">
    <div className="mx-auto grid max-w-6xl min-w-0 items-center gap-6 rounded-3xl border border-bone/10 bg-ink/65 p-4 shadow-xl sm:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)] sm:gap-9 sm:p-8">
      <Art a={track.a} b={track.b} image={track.image} className="aspect-square w-full max-w-[22rem] justify-self-center rounded-2xl" />
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[.22em] text-cyan">AAK MUSIC · FEATURED RELEASE</p>
        <h2 id="featured-release-title" className="mt-3 break-words font-display text-2xl font-extrabold sm:text-4xl">{track.title}</h2>
        <p className="mt-2 text-sm text-bone/65">{track.artist} · {track.genre} · {track.bpm} BPM</p>
        <p className="mt-4 max-w-xl text-sm leading-6 text-bone/60">Open the shared player to browse all seven AAK releases and connected music catalogs in one place.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => player.play(0)} className="min-h-11 rounded-full bg-bone px-5 text-sm font-bold text-ink transition hover:bg-cyan">Play release</button>
          <RouteLink to="/player" className="inline-flex min-h-11 items-center rounded-full border border-bone/20 px-5 text-sm text-bone/80 transition hover:border-cyan hover:text-cyan">Open music player</RouteLink>
          <RouteLink to="/music" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-bone/60 underline underline-offset-4 transition hover:text-cyan">Browse library</RouteLink>
        </div>
      </div>
    </div>
  </section>;
}
