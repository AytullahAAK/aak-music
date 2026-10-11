import type { AppleMusicResult, SpotifyTrackResult, YouTubeResult } from './types';

type ApiPayload<T> = { configured?: boolean; results?: T[]; error?: string };

async function request<T>(endpoint: string, query: string, signal?: AbortSignal) {
  const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, { signal });
  const data = await response.json() as ApiPayload<T>;
  if (!response.ok) throw new Error(data.error || `Search returned HTTP ${response.status}.`);
  return data.results || [];
}

async function check(endpoint: string, signal?: AbortSignal) {
  const response = await fetch(`${endpoint}?status=1`, { signal });
  if (!response.ok) return false;
  const data = await response.json() as { configured?: boolean };
  return data.configured === true;
}

export const checkYouTubeConfiguration = (signal?: AbortSignal) => check('/api/youtube-search', signal);
export const checkAppleCatalog = (signal?: AbortSignal) => check('/api/itunes-search', signal);
export const checkAppleMusicCatalogConfiguration = (signal?: AbortSignal) => check('/api/apple-music-search', signal);
export const checkAppleMusicKitConfiguration = async (signal?: AbortSignal) => {
  const response = await fetch('/api/apple-music-token?status=1', { signal });
  if (!response.ok) return false;
  const data = await response.json() as { configured?: boolean; originAllowed?: boolean };
  return data.configured === true && data.originAllowed === true;
};
export const checkSpotifyConfiguration = (signal?: AbortSignal) => check('/api/spotify-search', signal);

export const appleMusicProvider = {
  async search(query: string, signal?: AbortSignal, useAppleMusicCatalog = false) {
    const country = typeof navigator !== 'undefined' ? navigator.language.split('-')[1]?.toLowerCase() : undefined;
    const endpoint = useAppleMusicCatalog ? '/api/apple-music-search' : '/api/itunes-search';
    const base = `${endpoint}?q=${encodeURIComponent(query)}${country ? `&country=${encodeURIComponent(country)}` : ''}`;
    const response = await fetch(base, { signal });
    const data = await response.json() as ApiPayload<AppleMusicResult>;
    if (!response.ok) throw new Error(data.error || `Apple Music search returned HTTP ${response.status}.`);
    return data.results || [];
  },
};

export const youtubeProvider = {
  search: (query: string, signal?: AbortSignal) => request<YouTubeResult>('/api/youtube-search', query, signal),
};

export const spotifyProvider = {
  search: async (query: string, signal?: AbortSignal) => {
    const market = typeof navigator !== 'undefined' ? navigator.language.split('-')[1]?.toUpperCase() : undefined;
    const params = new URLSearchParams({ q: query });
    if (market && /^[A-Z]{2}$/.test(market)) params.set('market', market);
    const response = await fetch(`/api/spotify-search?${params}`, { signal });
    const data = await response.json() as ApiPayload<SpotifyTrackResult>;
    if (!response.ok) throw new Error(data.error || `Spotify search returned HTTP ${response.status}.`);
    return data.results || [];
  },
};
