import type { AppleMusicResult, SpotifyTrackResult, YouTubeSearchPage } from './types';

type ApiPayload<T> = { configured?: boolean; results?: T[]; error?: string };

async function jsonResponse<T>(response: Response, endpoint: string) {
  try { return await response.json() as T; }
  catch {
    throw new Error(`${endpoint} did not return JSON. Verify that the same-origin Vercel API function is deployed.`);
  }
}

async function request<T>(endpoint: string, query: string, signal?: AbortSignal) {
  const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, { signal });
  const data = await jsonResponse<ApiPayload<T>>(response, endpoint);
  if (!response.ok) throw new Error(data.error || `Search returned HTTP ${response.status}.`);
  return data.results || [];
}

async function check(endpoint: string, signal?: AbortSignal) {
  const response = await fetch(`${endpoint}?status=1`, { signal });
  const data = await jsonResponse<{ configured?: boolean; error?: string }>(response, endpoint);
  if (!response.ok) throw new Error(data.error || `${endpoint} returned HTTP ${response.status}.`);
  return data.configured === true;
}

export const checkYouTubeConfiguration = (signal?: AbortSignal) => check('/api/youtube-search', signal);
export const checkAppleCatalog = (signal?: AbortSignal) => check('/api/itunes-search', signal);
export const checkAppleMusicCatalogConfiguration = (signal?: AbortSignal) => check('/api/apple-music-search', signal);
export const checkAppleMusicKitConfiguration = async (signal?: AbortSignal) => {
  const response = await fetch('/api/apple-music-token?status=1', { signal });
  const data = await jsonResponse<{ configured?: boolean; originAllowed?: boolean; error?: string }>(response, '/api/apple-music-token');
  if (!response.ok) throw new Error(data.error || `/api/apple-music-token returned HTTP ${response.status}.`);
  return data.configured === true && data.originAllowed === true;
};
export const checkSpotifyConfiguration = (signal?: AbortSignal) => check('/api/spotify-search', signal);

export const appleMusicProvider = {
  async search(query: string, signal?: AbortSignal, useAppleMusicCatalog = false) {
    const country = typeof navigator !== 'undefined' ? navigator.language.split('-')[1]?.toLowerCase() : undefined;
    const endpoint = useAppleMusicCatalog ? '/api/apple-music-search' : '/api/itunes-search';
    const base = `${endpoint}?q=${encodeURIComponent(query)}${country ? `&country=${encodeURIComponent(country)}` : ''}`;
    const response = await fetch(base, { signal });
    const data = await jsonResponse<ApiPayload<AppleMusicResult>>(response, endpoint);
    if (!response.ok) throw new Error(data.error || `Apple Music search returned HTTP ${response.status}.`);
    return data.results || [];
  },
};

export const youtubeProvider = {
  async search(query: string, signal?: AbortSignal, pageToken?: string | null) {
    const params = new URLSearchParams({ q: query, maxResults: '25' });
    if (pageToken) params.set('pageToken', pageToken);
    const response = await fetch(`/api/youtube-search?${params}`, { signal });
    const data = await jsonResponse<YouTubeSearchPage & { error?: string }>(response, '/api/youtube-search');
    if (!response.ok) throw new Error(data.error || `YouTube search returned HTTP ${response.status}.`);
    return { results: data.results || [], nextPageToken: data.nextPageToken || null } satisfies YouTubeSearchPage;
  },
};

export const spotifyProvider = {
  search: async (query: string, signal?: AbortSignal) => {
    const market = typeof navigator !== 'undefined' ? navigator.language.split('-')[1]?.toUpperCase() : undefined;
    const params = new URLSearchParams({ q: query });
    if (market && /^[A-Z]{2}$/.test(market)) params.set('market', market);
    const response = await fetch(`/api/spotify-search?${params}`, { signal });
    const data = await jsonResponse<ApiPayload<SpotifyTrackResult>>(response, '/api/spotify-search');
    if (!response.ok) throw new Error(data.error || `Spotify search returned HTTP ${response.status}.`);
    return data.results || [];
  },
};
