import { tracks, type Track } from '../../data';
import type { AudioCatalogTrack, YouTubeResult } from './types';
import { youtubeProvider, appleMusicProvider } from './discovery';

export type PlayableItem =
  | {
      kind: 'local';
      id: string;
      title: string;
      artist: string;
      album?: string;
      genre: string;
      bpm: number;
      image?: string;
      durationSeconds: number;
      provider: 'AAK Music';
      trackIndex: number;
      raw: Track;
    }
  | {
      kind: 'external';
      id: string;
      title: string;
      artist: string;
      album?: string;
      genre?: string;
      bpm?: number;
      image?: string;
      durationSeconds: number;
      provider: 'Apple Music' | 'iTunes Store';
      playbackKind: 'preview' | 'subscription';
      raw: AudioCatalogTrack;
    }
  | {
      kind: 'video';
      id: string;
      title: string;
      artist: string;
      album?: string;
      genre?: string;
      bpm?: number;
      image?: string;
      durationSeconds: number;
      provider: 'YouTube';
      watchUrl: string;
      embeddable: boolean;
      embeddingStatus?: 'allowed' | 'blocked' | 'unknown';
      raw: YouTubeResult;
    };

export function toPlayableItem(
  source: PlayableItem | Track | AudioCatalogTrack | YouTubeResult
): PlayableItem {
  if ('kind' in source) return source;
  if ('watchUrl' in source) {
    return {
      kind: 'video',
      id: source.id,
      title: source.title,
      artist: source.artist,
      image: source.thumbnail,
      durationSeconds: source.durationSeconds || 0,
      provider: 'YouTube',
      watchUrl: source.watchUrl,
      embeddable: source.embeddable,
      embeddingStatus: source.embeddingStatus,
      raw: source,
    };
  }
  if ('audioUrl' in source) {
    return {
      kind: 'external',
      id: source.id,
      title: source.title,
      artist: source.artist,
      album: source.album,
      genre: source.genre,
      image: source.image,
      durationSeconds: source.durationSeconds || 0,
      provider: source.provider,
      playbackKind: source.playbackKind,
      raw: source,
    };
  }
  // Local Track
  const index = tracks.findIndex((t: Track) => t.id === source.id);
  return {
    kind: 'local',
    id: source.id,
    title: source.title,
    artist: source.artist,
    genre: source.genre,
    bpm: source.bpm,
    album: `${source.genre} Release`,
    image: source.image,
    durationSeconds: source.dur,
    provider: 'AAK Music',
    trackIndex: index >= 0 ? index : 0,
    raw: source,
  };
}

export interface Recommendation {
  item: PlayableItem;
  reason: string;
  badge: string;
}

export async function getRecommendationsForTrack(
  current: PlayableItem,
  signal?: AbortSignal
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];
  const seenIds = new Set<string>([current.id]);

  // 1. Local Library Recommendations (Authentic metadata based: genre, BPM, and artist)
  const currentGenre = (current.genre || '').toLowerCase();
  const currentBpm = current.bpm || 126;

  // Filter local tracks not currently playing
  const otherLocalTracks = tracks.filter((t: Track) => t.id !== current.id);

  // Match same genre first
  for (const track of otherLocalTracks) {
    if (track.genre.toLowerCase() === currentGenre && !seenIds.has(track.id)) {
      seenIds.add(track.id);
      recommendations.push({
        item: toPlayableItem(track),
        reason: `Similar Style · ${track.genre}`,
        badge: 'GENRE MATCH',
      });
    }
  }

  // Match close BPM (within 4 BPM)
  for (const track of otherLocalTracks) {
    if (Math.abs(track.bpm - currentBpm) <= 4 && !seenIds.has(track.id)) {
      seenIds.add(track.id);
      recommendations.push({
        item: toPlayableItem(track),
        reason: `Matching Tempo · ${track.bpm} BPM`,
        badge: 'BPM SYNC',
      });
    }
  }

  // Other AAK master tracks
  for (const track of otherLocalTracks) {
    if (!seenIds.has(track.id)) {
      seenIds.add(track.id);
      recommendations.push({
        item: toPlayableItem(track),
        reason: `AAK Master Catalog · ${track.genre}`,
        badge: 'AAK CATALOG',
      });
    }
  }

  // 2. If Current Track is a YouTube Video or third-party, and online queries are possible:
  if (current.kind === 'video') {
    try {
      const query = `${current.artist} ${current.genre || 'electronic'}`.trim();
      const page = await youtubeProvider.search(query, signal);
      for (const video of page.results) {
        if (!seenIds.has(video.id) && video.id !== current.id) {
          seenIds.add(video.id);
          recommendations.push({
            item: toPlayableItem(video),
            reason: `More by ${video.artist || current.artist}`,
            badge: 'YOUTUBE RELATED',
          });
          if (recommendations.length >= 10) break;
        }
      }
    } catch {
      // Graceful fallback to local library recommendations
    }
  } else if (current.kind === 'external') {
    try {
      const query = current.artist || current.genre || 'Electronic';
      const results = await appleMusicProvider.search(query, signal);
      for (const track of results) {
        if (!seenIds.has(track.id) && track.id !== current.id) {
          seenIds.add(track.id);
          const audioTrack: AudioCatalogTrack = {
            id: track.id,
            title: track.title,
            artist: track.artist,
            album: track.album,
            image: track.image,
            durationSeconds: track.durationSeconds,
            audioUrl: track.previewUrl,
            trackUrl: track.trackUrl,
            provider: track.catalogSource === 'iTunes Store' ? 'iTunes Store' : 'Apple Music',
            playbackKind: track.playbackKind === 'external only' ? 'preview' : track.playbackKind,
            genre: track.genre,
            releaseDate: track.releaseDate,
            explicit: track.explicit,
          };
          recommendations.push({
            item: toPlayableItem(audioTrack),
            reason: `Catalog Track · ${track.artist}`,
            badge: 'CATALOG RELATED',
          });
          if (recommendations.length >= 10) break;
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  return recommendations;
}
