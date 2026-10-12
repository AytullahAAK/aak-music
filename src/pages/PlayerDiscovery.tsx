import { useCallback, useEffect, useRef, useState } from 'react';
import { tracks } from '../data';
import { usePlayer } from '../hooks/usePlayer';
import { useUniversalPlayer } from '../hooks/useUniversalPlayer';
import { getRecommendationsForTrack, type Recommendation } from '../services/music/recommendations';
import { youtubeProvider } from '../services/music/discovery';
import type { YouTubeResult } from '../services/music/types';
import { RouteLink } from '../router';
import Art from '../components/Art';
import Search from '../components/Search';

const categories = [
  { id: 'all', label: 'All', query: 'electronic music official video' },
  { id: 'music', label: 'Music videos', query: 'official music video' },
  { id: 'mixes', label: 'Mixes', query: 'electronic music mix' },
  { id: 'electronic', label: 'Electronic', query: 'electronic music official video' },
] as const;
type Category = typeof categories[number]['id'] | 'aak' | 'related';

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return '';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function PlayerDiscovery() {
  const local = usePlayer();
  const player = useUniversalPlayer();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [videos, setVideos] = useState<YouTubeResult[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedRetry, setFeedRetry] = useState(0);
  const [feedError, setFeedError] = useState('');
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreError, setMoreError] = useState('');
  const [related, setRelated] = useState<Recommendation[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState('');
  const moreRequest = useRef<AbortController | null>(null);
  const moreInFlight = useRef(false);
  const hasSelection = Boolean(player.activeAudio || player.activeVideo || local.hasInitiatedPlayback);
  const activeItem = player.currentItem;
  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    if (hasQuery || category === 'aak' || category === 'related') return;
    const selectedCategory = categories.find((item) => item.id === category) ?? categories[0];
    const controller = new AbortController();
    setVideos([]);
    setNextPageToken(null);
    setFeedError('');
    setFeedLoading(true);
    setMoreError('');
    void youtubeProvider.search(selectedCategory.query, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        setVideos(page.results);
        setNextPageToken(page.nextPageToken);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        setFeedError(error instanceof Error ? error.message : 'YouTube discovery is unavailable. Try again.');
      })
      .finally(() => { if (!controller.signal.aborted) setFeedLoading(false); });
    return () => {
      controller.abort();
      moreRequest.current?.abort();
      moreInFlight.current = false;
      setMoreLoading(false);
    };
  }, [category, feedRetry, hasQuery]);

  useEffect(() => {
    if (category !== 'related' || !hasSelection) return;
    const controller = new AbortController();
    setRelated([]);
    setRelatedError('');
    setRelatedLoading(true);
    void getRecommendationsForTrack(activeItem, controller.signal)
      .then((items) => { if (!controller.signal.aborted) setRelated(items); })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        setRelatedError(error instanceof Error ? error.message : `Related music for ${activeItem.provider} is unavailable right now.`);
      })
      .finally(() => { if (!controller.signal.aborted) setRelatedLoading(false); });
    return () => controller.abort();
  }, [activeItem, activeItem.id, activeItem.kind, activeItem.provider, category, hasSelection]);

  const loadMore = useCallback(() => {
    if (!nextPageToken || moreInFlight.current || category === 'aak' || category === 'related') return;
    const selectedCategory = categories.find((item) => item.id === category) ?? categories[0];
    const controller = new AbortController();
    moreRequest.current?.abort();
    moreRequest.current = controller;
    moreInFlight.current = true;
    setMoreLoading(true);
    setMoreError('');
    void youtubeProvider.search(selectedCategory.query, controller.signal, nextPageToken)
      .then((page) => {
        if (controller.signal.aborted) return;
        const seen = new Set(videos.map((item) => item.id));
        const combined = [...videos, ...page.results.filter((item) => !seen.has(item.id))];
        setVideos(combined);
        if (player.activeVideo) player.setVideoQueue(combined);
        setNextPageToken(page.nextPageToken);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        setMoreError(error instanceof Error ? error.message : 'Could not load more YouTube results.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          moreInFlight.current = false;
          setMoreLoading(false);
        }
      });
  }, [category, nextPageToken, player.activeVideo, player.setVideoQueue, videos]);

  useEffect(() => () => { moreRequest.current?.abort(); }, []);

  const selectVideo = (video: YouTubeResult, sequence: YouTubeResult[]) => {
    player.playVideo(video, sequence);
  };
  const selectRecommendation = (item: Recommendation['item']) => {
    player.playItem(item);
  };

  const setCategoryAndReset = (value: Category) => {
    moreRequest.current?.abort();
    moreInFlight.current = false;
    setMoreLoading(false);
    setMoreError('');
    setCategory(value);
  };

  const videoGrid = (items: YouTubeResult[]) => <div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
    {items.map((video) => {
      const selected = player.activeVideo?.id === video.id;
      return <article key={video.id} className={`min-w-0 rounded-2xl transition ${selected ? 'ring-1 ring-cyan/40' : ''}`}>
        <button type="button" onClick={() => selectVideo(video, items)} aria-label={`Play ${video.title} by ${video.artist}`} className="group block w-full min-w-0 rounded-2xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan">
          <span className="relative block aspect-video overflow-hidden rounded-2xl bg-raised">
            {video.thumbnail ? <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025] motion-reduce:transition-none" /> : <span className="block h-full w-full bg-gradient-to-br from-raised to-ink" />}
            {formatDuration(video.durationSeconds) && <span className="absolute bottom-2 right-2 rounded bg-black/85 px-1.5 py-1 font-mono text-[10px] text-white">{formatDuration(video.durationSeconds)}</span>}
            {selected && <span className="absolute left-2 top-2 rounded-full bg-ink/90 px-2.5 py-1 font-mono text-[9px] text-cyan">{player.videoPlaying ? 'NOW PLAYING' : 'SELECTED'}</span>}
          </span>
          <span className="mt-3 block min-w-0 px-1">
            <span className="line-clamp-2 block font-display text-sm font-semibold leading-5 text-bone group-hover:text-cyan sm:text-base">{video.title}</span>
            <span className="mt-1 block truncate text-xs text-bone/60">{video.artist}</span>
            <span className="mt-1 block font-mono text-[9px] uppercase tracking-[.12em] text-bone/40">YouTube · search discovery</span>
          </span>
        </button>
        <div className="mt-2 flex justify-end px-1">
          <button type="button" onClick={() => player.addToUserQueue(video)} className="min-h-9 rounded-full border border-bone/12 px-3 text-[10px] font-semibold text-bone/60 transition hover:border-cyan/40 hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan">Add to queue</button>
        </div>
      </article>;
    })}
  </div>;

  return <main className="mx-auto min-h-[70svh] w-full max-w-[1480px] min-w-0 px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24 xl:px-10">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9">
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[.24em] text-cyan">AAK MUSIC · PLAYER</p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-bone sm:text-5xl">Discover music</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-bone/60">Find a sound, choose a source, and keep listening while you explore AAK Music.</p>
      </div>
      <RouteLink to="/music" className="inline-flex min-h-10 items-center rounded-full border border-bone/15 px-4 text-xs font-semibold text-bone/75 transition hover:border-cyan/50 hover:text-cyan">Browse AAK releases</RouteLink>
    </header>

    <Search q="" embedded showDownloads={false} onQueryChange={setQuery} />

    {!hasQuery && <section className="mt-8" aria-label="Music discovery feed">
      <div className="mb-6 flex flex-wrap items-center gap-2" role="tablist" aria-label="Discovery categories">
        {[
          ...categories.map(({ id, label }) => ({ id, label })),
          ...(hasSelection ? [{ id: 'related' as const, label: 'Related' }] : []),
          { id: 'aak' as const, label: 'AAK releases' },
        ].map((item) => <button key={item.id} type="button" role="tab" aria-selected={category === item.id} onClick={() => setCategoryAndReset(item.id)} className={`min-h-10 rounded-full px-4 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan ${category === item.id ? 'bg-bone text-ink' : 'border border-bone/12 bg-raised/45 text-bone/65 hover:border-bone/25 hover:text-bone'}`}>{item.label}</button>)}
      </div>

      {category === 'aak' && <section aria-labelledby="aak-releases-heading">
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="font-mono text-[9px] uppercase tracking-[.18em] text-cyan">Official AAK Music library</p><h2 id="aak-releases-heading" className="mt-1 font-display text-xl font-bold text-bone sm:text-2xl">AAK releases</h2></div><span className="text-xs text-bone/45">{tracks.length} tracks</span></div>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tracks.map((track) => <article key={track.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-bone/10 bg-raised/35 p-3 transition hover:border-bone/20">
            <button type="button" onClick={() => selectRecommendation({ kind: 'local', id: track.id, title: track.title, artist: track.artist, genre: track.genre, bpm: track.bpm, image: track.image, durationSeconds: track.dur, provider: 'AAK Music', trackIndex: tracks.indexOf(track), raw: track })} className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan">
              <Art a={track.a} b={track.b} image={track.image} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-bone group-hover:text-cyan">{track.title}</span><span className="mt-1 block truncate text-xs text-bone/60">{track.artist} · {track.genre}</span><span className="mt-1 block font-mono text-[9px] text-bone/40">AAK MUSIC · {formatDuration(track.dur)}</span></span>
            </button>
            <button type="button" onClick={() => player.addToUserQueue(track)} className="min-h-9 shrink-0 rounded-full border border-bone/12 px-3 text-[10px] text-bone/60 hover:border-cyan/40 hover:text-cyan">Queue</button>
          </article>)}
        </div>
      </section>}

      {category === 'related' && <section aria-labelledby="related-heading">
        <div className="mb-4"><p className="font-mono text-[9px] uppercase tracking-[.18em] text-cyan">Based on the selected track</p><h2 id="related-heading" className="mt-1 font-display text-xl font-bold text-bone sm:text-2xl">Related music</h2><p className="mt-1 text-xs text-bone/50">Catalog search suggestions are labeled by source; these are not claimed as official recommendations.</p></div>
        {relatedLoading && <div role="status" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="aspect-video animate-pulse rounded-2xl bg-bone/[.06] motion-reduce:animate-none" />)}</div>}
        {relatedError && <div role="alert" className="rounded-2xl border border-amber-200/15 bg-raised/40 p-4 text-sm text-amber-100/80">{relatedError}</div>}
        {!relatedLoading && !relatedError && related.length === 0 && <p className="rounded-2xl border border-bone/10 bg-raised/30 p-5 text-sm text-bone/55">No related tracks were returned for this source. Try another provider or browse the AAK library.</p>}
        {related.length > 0 && <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{related.map((recommendation) => <article key={`${recommendation.item.provider}:${recommendation.item.id}`} className="min-w-0 rounded-2xl border border-bone/10 bg-raised/30 p-3">
          <button type="button" onClick={() => selectRecommendation(recommendation.item)} className="flex w-full min-w-0 items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan">
            {recommendation.item.image ? <img src={recommendation.item.image} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-xl object-cover" /> : recommendation.item.kind === 'local' ? <Art a={recommendation.item.raw.a} b={recommendation.item.raw.b} image={recommendation.item.raw.image} className="h-16 w-16 shrink-0 rounded-xl object-cover" /> : <span className="h-16 w-16 shrink-0 rounded-xl bg-raised" />}
            <span className="min-w-0"><span className="block line-clamp-2 text-sm font-semibold text-bone">{recommendation.item.title}</span><span className="mt-1 block truncate text-xs text-bone/60">{recommendation.item.artist}</span><span className="mt-1 block font-mono text-[9px] uppercase text-cyan/75">{recommendation.badge}</span></span>
          </button>
          <div className="mt-3 flex items-center justify-between gap-2"><span className="line-clamp-1 text-[10px] text-bone/45">{recommendation.reason}</span><button type="button" onClick={() => player.addToUserQueue(recommendation.item)} className="min-h-9 shrink-0 rounded-full border border-bone/12 px-3 text-[10px] text-bone/60 hover:border-cyan/40 hover:text-cyan">Queue</button></div>
        </article>)}</div>}
      </section>}

      {category !== 'aak' && category !== 'related' && <section aria-labelledby="feed-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.18em] text-cyan">YouTube · search-based discovery</p><h2 id="feed-heading" className="mt-1 font-display text-xl font-bold text-bone sm:text-2xl">{categories.find((item) => item.id === category)?.label ?? 'Music'} to explore</h2><p className="mt-1 text-xs text-bone/50">Real YouTube search results, ranked by YouTube. This is not a personalized recommendation feed.</p></div>{videos.length > 0 && <span className="text-xs text-bone/45">{videos.length} loaded</span>}</div>
        {feedLoading && <div role="status" aria-label="Loading YouTube discovery" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index}><div className="aspect-video animate-pulse rounded-2xl bg-bone/[.06] motion-reduce:animate-none" /><div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-bone/[.06] motion-reduce:animate-none" /><div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-bone/[.04] motion-reduce:animate-none" /></div>)}</div>}
        {feedError && <div className="rounded-2xl border border-bone/12 bg-raised/35 p-5"><p role="alert" className="text-sm leading-6 text-bone/70">{feedError}</p><p className="mt-2 text-xs text-bone/45">Discovery uses the official YouTube Data API through this site’s server endpoint. Check server configuration or search another provider above.</p><button type="button" onClick={() => setFeedRetry((value) => value + 1)} className="mt-4 min-h-10 rounded-full border border-bone/15 px-4 text-xs font-semibold text-bone/75 hover:border-cyan hover:text-cyan">Retry YouTube discovery</button></div>}
        {!feedLoading && !feedError && videos.length === 0 && <p className="rounded-2xl border border-bone/10 bg-raised/30 p-5 text-sm text-bone/55">YouTube returned no discovery results for this category.</p>}
        {videos.length > 0 && videoGrid(videos)}
        {nextPageToken && <div className="mt-7 flex flex-col items-center gap-2"><button type="button" onClick={loadMore} disabled={moreLoading} className="min-h-11 rounded-full border border-cyan/35 bg-cyan/[.08] px-5 text-xs font-semibold text-cyan transition hover:bg-cyan/[.14] disabled:cursor-wait disabled:opacity-55">{moreLoading ? 'Loading more…' : 'Load more music'}</button>{moreError && <p role="alert" className="text-xs text-amber-100/80">{moreError}</p>}<p className="text-center text-[10px] text-bone/40">Results are ranked and limited by YouTube availability, filters, and API pagination.</p></div>}
      </section>}
    </section>}
    {hasQuery && query.trim().length < 2 && <p className="mx-auto mt-6 max-w-xl text-center text-xs text-bone/50">Enter at least two characters to search. The discovery feed returns when the field is cleared.</p>}
  </main>;
}

export default PlayerDiscovery;
