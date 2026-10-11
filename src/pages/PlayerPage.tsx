import { usePlayer } from '../hooks/usePlayer';

export default function PlayerPage() {
  const { isExpanded, setIsExpanded } = usePlayer();
  return <section className="mx-auto grid min-h-[70svh] max-w-5xl place-items-center px-5 py-24 text-center">
    <div><p className="font-mono text-[10px] tracking-[.22em] text-cyan">AAK MUSIC PLAYER</p><h1 className="mt-3 font-display text-3xl font-bold sm:text-5xl">Your music, one player.</h1><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-bone/60">Search the AAK library and connected catalogs, switch supported sources, and manage your queue in the shared player.</p>{!isExpanded && <button type="button" onClick={() => setIsExpanded(true)} className="mt-7 min-h-11 rounded-full bg-bone px-5 text-sm font-bold text-ink hover:bg-cyan">Open player</button>}</div>
  </section>;
}
