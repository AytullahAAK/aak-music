import { tracks, type Track } from '../../data';
import type { AudioCatalogTrack, YouTubeResult } from './types';
import { youtubeProvider, appleMusicProvider } from './discovery';

export type PlayableItem =
  | {
      kind: 'local'; id: string; title: string; artist: string; album?: string;
      genre: string; bpm: number; image?: string; durationSeconds: number;
      provider: 'AAK Music'; trackIndex: number; raw: Track;
    }
  | {
      kind: 'external'; id: string; title: string; artist: string; album?: string;
      genre?: string; bpm?: number; image?: string; durationSeconds: number;
      provider: 'Apple Music' | 'iTunes Store'; playbackKind: 'preview' | 'subscription'; raw: AudioCatalogTrack;
    }
  | {
      kind: 'video'; id: string; title: string; artist: string; album?: string;
      genre?: string; bpm?: number; image?: string; durationSeconds: number;
      provider: 'YouTube'; watchUrl: string; embeddable: boolean;
      embeddingStatus?: 'allowed' | 'blocked' | 'unknown'; raw: YouTubeResult;
    };

export function toPlayableItem(source: PlayableItem | Track | AudioCatalogTrack | YouTubeResult): PlayableItem {
  if ('kind' in source) return source;
  if ('watchUrl' in source) return {
    kind: 'video', id: source.id, title: source.title, artist: source.artist,
    image: source.thumbnail, durationSeconds: source.durationSeconds || 0, provider: 'YouTube',
    watchUrl: source.watchUrl, embeddable: source.embeddable,
    embeddingStatus: source.embeddingStatus, raw: source,
  };
  if ('audioUrl' in source) return {
    kind: 'external', id: source.id, title: source.title, artist: source.artist,
    album: source.album, genre: source.genre, image: source.image,
    durationSeconds: source.durationSeconds || 0, provider: source.provider,
    playbackKind: source.playbackKind, raw: source,
  };
  const index = tracks.findIndex((track) => track.id === source.id);
  return {
    kind: 'local', id: source.id, title: source.title, artist: source.artist,
    genre: source.genre, bpm: source.bpm, album: `${source.genre} Release`,
    image: source.image, durationSeconds: source.dur, provider: 'AAK Music',
    trackIndex: index >= 0 ? index : 0, raw: source,
  };
}

export interface Recommendation {
  item: PlayableItem;
  reason: string;
  badge: string;
}

const CACHE_TTL_MS = 2 * 60 * 1000;
const recommendationCache = new Map<string, { at: number; items: Recommendation[] }>();
const requests = new Map<string, Promise<Recommendation[]>>();

function localRecommendations(current: PlayableItem): Recommendation[] {
  const others = tracks.filter((track) => track.id !== current.id);
  const genre = current.kind === 'local' ? current.genre.trim().toLocaleLowerCase() : '';
  return others
    .map((track) => ({
      item: toPlayableItem(track),
      reason: genre && track.genre.trim().toLocaleLowerCase() === genre
        ? `Same genre · ${track.genre}`
        : `Another release by ${track.artist}`,
      badge: genre && track.genre.trim().toLocaleLowerCase() === genre
        ? 'AAK GENRE MATCH'
        : 'AAK MUSIC LIBRARY',
      rank: genre && track.genre.trim().toLocaleLowerCase() === genre ? 0 : 1,
    }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item, reason, badge }) => ({ item, reason, badge }));
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Recommendation request was cancelled.', 'AbortError');
}

async function fetchProviderRecommendations(current: PlayableItem): Promise<Recommendation[]> {
  if (current.kind === 'video') {
    // This is an honest catalog-search fallback, not a claim that YouTube returned an
    // official "related videos" recommendation feed.
    const query = `${current.artist} other music`.trim();
    const page = await youtubeProvider.search(query);
    const seen = new Set([current.id]);
    return page.results
      .filter((video) => {
        if (seen.has(video.id) || !video.embeddable || video.embeddingStatus === 'blocked') return false;
        seen.add(video.id);
        return true;
      })
      .map((video) => ({
        item: toPlayableItem(video),
        reason: `YouTube catalog search · ${query}`,
        badge: 'RELATED SEARCH',
      }))
      .slice(0, 8);
  }

  if (current.kind === 'external') {
    const query = `${current.artist} ${current.title}`.trim();
    const useAppleCatalog = current.provider === 'Apple Music';
    const results = await appleMusicProvider.search(query, undefined, useAppleCatalog);
    const seen = new Set([`${current.provider}:${current.id}`]);
    return results
      .filter((track) => {
        const id = `${track.catalogSource}:${track.id}`;
        if (seen.has(id) || !((track.playbackKind === 'preview' && Boolean(track.previewUrl)) || track.playbackKind === 'subscription')) return false;
        seen.add(id);
        return true;
      })
      .map((track) => {
        const audioTrack: AudioCatalogTrack = {
          id: track.id, title: track.title, artist: track.artist, album: track.album,
          image: track.image, durationSeconds: track.durationSeconds,
          audioUrl: track.previewUrl, trackUrl: track.trackUrl,
          provider: track.catalogSource === 'iTunes Store' ? 'iTunes Store' : 'Apple Music',
          playbackKind: track.playbackKind === 'subscription' ? 'subscription' : 'preview',
          genre: track.genre, releaseDate: track.releaseDate, explicit: track.explicit,
        };
        return {
          item: toPlayableItem(audioTrack),
          reason: `Catalog search · ${query}`,
          badge: track.catalogSource === 'iTunes Store' ? 'ITUNES PREVIEW' : 'APPLE CATALOG',
        };
      })
      .slice(0, 8);
  }

  return [];
}

export async function getRecommendationsForTrack(
  current: PlayableItem,
  signal?: AbortSignal,
): Promise<Recommendation[]> {
  if (current.kind === 'local') return localRecommendations(current);

  const queryKey = current.kind === 'video'
    ? `youtube:${current.artist.toLocaleLowerCase()}`
    : `${current.provider.toLocaleLowerCase()}:${current.artist.toLocaleLowerCase()}:${current.title.toLocaleLowerCase()}`;
  const cached = recommendationCache.get(queryKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.items;

  let request = requests.get(queryKey);
  if (!request) {
    request = fetchProviderRecommendations(current).then((items) => {
      recommendationCache.set(queryKey, { at: Date.now(), items });
      return items;
    }).finally(() => requests.delete(queryKey));
    requests.set(queryKey, request);
  }
  const result = await request;
  throwIfAborted(signal);
  return result;
}
