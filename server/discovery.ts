export interface ProviderResponse {
  statusCode: number;
  body: unknown;
}

type Env = Record<string, string | undefined>;

interface SpotifyTrackResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  durationSeconds: number | null;
  trackUrl: string;
  releaseDate?: string;
  explicit: boolean;
  provider: 'Spotify';
  playbackKind: 'external only';
}

let spotifyToken: { value: string; expiresAt: number } | null = null;
const spotifySearchCache = new Map<string, { expiresAt: number; results: SpotifyTrackResult[] }>();
const youtubeSearchCache = new Map<string, { expiresAt: number; results: unknown[] }>();
const appleSearchCache = new Map<string, { expiresAt: number; results: unknown[] }>();

const cappedQuery = (url: URL) => (url.searchParams.get('q') || '').trim().slice(0, 100);
async function upstreamFetch(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try { return await fetch(url, { signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}

const errorMessage = (provider: string, status: number) => {
  if (status === 403) return `${provider} denied this request. Check API key restrictions, permissions, and quota.`;
  if (status === 429) return `${provider} is receiving too many requests. Try again shortly.`;
  return `${provider} returned HTTP ${status}. Try again shortly.`;
};

async function providerError(response: Response, provider: string) {
  let reason = '';
  try {
    const payload = await response.clone().json() as { error?: { message?: string; reason?: string; errors?: Array<{ reason?: string }> } };
    reason = `${payload.error?.reason || ''} ${payload.error?.errors?.[0]?.reason || ''} ${payload.error?.message || ''}`.toLowerCase();
  } catch { /* Provider may return a non-JSON gateway error. */ }
  if (provider.startsWith('YouTube') && /(quota|dailylimit|ratelimitexceeded)/.test(reason)) return 'YouTube daily API quota is exhausted. Check Google Cloud quota or try again after it resets.';
  if (provider.startsWith('YouTube') && /(keyinvalid|iprefererblocked|refererblocked|accessnotconfigured)/.test(reason)) return 'YouTube rejected the API key. Check that YouTube Data API v3 is enabled and key restrictions allow this server.';
  if (provider === 'Spotify' && reason.includes('quota_exceeded')) return 'Spotify developer app quota is exhausted. Check the app access mode and wait for the quota window to reset.';
  if (provider === 'Spotify' && response.status === 403) return 'Spotify denied catalog search. Check the developer app status, current access mode, and account requirements.';
  if (response.status === 429) return `${provider} is rate limiting requests. Try again shortly.`;
  if (response.status === 403) return `${provider} denied this request. Check API key restrictions, permissions, account access, and quota.`;
  return errorMessage(provider, response.status);
}

function cacheResults<T>(cache: Map<string, { expiresAt: number; results: T[] }>, key: string, results: T[], ttl = 120_000) {
  cache.set(key, { expiresAt: Date.now() + ttl, results });
  if (cache.size > 100) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest) cache.delete(oldest);
  }
}

function safeProviderUrl(value: string | undefined, allowedDomains: string[]) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return '';
    const host = url.hostname.toLowerCase();
    return allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`)) ? url.toString() : '';
  } catch { return ''; }
}

function durationSeconds(isoDuration?: string) {
  const match = isoDuration?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
  };
}

interface YouTubeVideoItem {
  id?: string;
  status?: { embeddable?: boolean };
  contentDetails?: { duration?: string };
}

export async function youtubeSearch(url: URL, env: Env): Promise<ProviderResponse> {
  const key = env.YOUTUBE_DATA_API_KEY?.trim();
  if (url.searchParams.has('status')) return { statusCode: 200, body: { configured: Boolean(key) } };
  if (!key) return { statusCode: 503, body: { error: 'YouTube search is not configured on this server.' } };

  const query = cappedQuery(url);
  if (query.length < 2) return { statusCode: 200, body: { results: [] } };
  const cacheKey = query.toLocaleLowerCase();
  const cached = youtubeSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { statusCode: 200, body: { results: cached.results } };

  const searchParams = new URLSearchParams({
    key,
    part: 'snippet',
    type: 'video',
    maxResults: '8',
    q: query,
  });

  try {
    const searchResponse = await upstreamFetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`);
    if (!searchResponse.ok) return { statusCode: searchResponse.status === 429 ? 429 : 502, body: { error: await providerError(searchResponse, 'YouTube search') } };
    const searchData = await searchResponse.json() as { items?: YouTubeSearchItem[] };
    const candidates = (searchData.items || []).flatMap((item) => {
      const id = item.id?.videoId;
      const title = item.snippet?.title;
      if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id) || !title) return [];
      return [{
        id,
        title,
        artist: item.snippet?.channelTitle || 'YouTube creator',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      }];
    });

    if (!candidates.length) {
      cacheResults(youtubeSearchCache, cacheKey, []);
      return { statusCode: 200, body: { results: [] } };
    }

    const detailParams = new URLSearchParams({ key, part: 'contentDetails,status', id: candidates.map(({ id }) => id).join(',') });
    const detailsResponse = await upstreamFetch(`https://www.googleapis.com/youtube/v3/videos?${detailParams}`);
    let details = new Map<string, YouTubeVideoItem>();
    const detailsAvailable = detailsResponse.ok;
    if (detailsResponse.ok) {
      const payload = await detailsResponse.json() as { items?: YouTubeVideoItem[] };
      details = new Map((payload.items || []).filter((item) => item.id).map((item) => [item.id as string, item]));
    }

    const results = candidates.flatMap((candidate) => {
      const detail = details.get(candidate.id);
      return [{
        ...candidate,
        durationSeconds: durationSeconds(detail?.contentDetails?.duration),
        watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(candidate.id)}`,
        // Only offer in-site playback after videos.list confirms the flag.
        // We keep non-embeddable hits searchable so their official page remains useful.
        embeddable: detail?.status?.embeddable === true,
        embeddingStatus: !detailsAvailable || detail?.status?.embeddable === undefined ? 'unknown' as const : detail.status.embeddable ? 'allowed' as const : 'blocked' as const,
        provider: 'YouTube',
      }];
    });
    cacheResults(youtubeSearchCache, cacheKey, results);
    return { statusCode: 200, body: { results } };
  } catch {
    return { statusCode: 502, body: { error: 'Could not reach YouTube. Check the server network and try again.' } };
  }
}

interface ITunesItem {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackViewUrl?: string;
  trackTimeMillis?: number;
  primaryGenreName?: string;
  releaseDate?: string;
  trackExplicitness?: string;
}

export async function itunesSearch(url: URL): Promise<ProviderResponse> {
  if (url.searchParams.has('status')) return { statusCode: 200, body: { configured: true } };
  const query = cappedQuery(url);
  if (query.length < 2) return { statusCode: 200, body: { results: [] } };
  const region = (url.searchParams.get('country') || 'us').toLowerCase();
  const country = /^[a-z]{2}$/.test(region) ? region : 'us';
  const cacheKey = `${country}:${query.toLocaleLowerCase()}`;
  const cached = appleSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { statusCode: 200, body: { results: cached.results } };
  const params = new URLSearchParams({ term: query, entity: 'song', limit: '12', country });

  try {
    const response = await upstreamFetch(`https://itunes.apple.com/search?${params}`);
    if (!response.ok) return { statusCode: response.status === 429 ? 429 : 502, body: { error: await providerError(response, 'Apple Music catalog') } };
    const payload = await response.json() as { results?: ITunesItem[] };
    const results = (payload.results || []).flatMap((item) => {
      if (!item.trackId || !item.trackName || !item.artistName) return [];
      const preview = safeProviderUrl(item.previewUrl?.replace(/^http:/, 'https:'), ['apple.com', 'mzstatic.com']);
      const trackUrl = safeProviderUrl(item.trackViewUrl?.replace(/^http:/, 'https:'), ['apple.com']) || 'https://music.apple.com/';
      return [{
        id: String(item.trackId),
        title: item.trackName,
        artist: item.artistName,
        album: item.collectionName || '',
        image: item.artworkUrl100?.replace(/^http:/, 'https:') || '',
        durationSeconds: typeof item.trackTimeMillis === 'number' ? Math.round(item.trackTimeMillis / 1000) : null,
        previewUrl: preview,
        trackUrl,
        genre: item.primaryGenreName || '',
        releaseDate: item.releaseDate || '',
        explicit: item.trackExplicitness === 'explicit',
        provider: 'Apple Music',
        catalogSource: 'iTunes Store',
        playbackKind: preview ? 'preview' : 'external only',
      }];
    });
    cacheResults(appleSearchCache, cacheKey, results);
    return { statusCode: 200, body: { results } };
  } catch {
    return { statusCode: 502, body: { error: 'Could not reach the Apple Music catalog. Check the server network and try again.' } };
  }
}

export async function spotifySearch(url: URL, env: Env): Promise<ProviderResponse> {
  const clientId = env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = env.SPOTIFY_CLIENT_SECRET?.trim();
  if (url.searchParams.has('status')) return { statusCode: 200, body: { configured: Boolean(clientId && clientSecret) } };
  if (!clientId || !clientSecret) return { statusCode: 503, body: { error: 'Spotify catalog search is not configured on this server.' } };

  const query = cappedQuery(url);
  if (query.length < 2) return { statusCode: 200, body: { results: [] } };
  const marketValue = (url.searchParams.get('market') || 'US').toUpperCase();
  const market = /^[A-Z]{2}$/.test(marketValue) ? marketValue : 'US';
  const cacheKey = `${market}:${query.toLocaleLowerCase()}`;
  const cached = spotifySearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { statusCode: 200, body: { results: cached.results } };

  try {
    if (!spotifyToken || spotifyToken.expiresAt <= Date.now() + 30_000) {
      const credentials = btoa(`${clientId}:${clientSecret}`);
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials' }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!tokenResponse.ok) {
        if (tokenResponse.status === 429) return { statusCode: 429, body: { error: 'Spotify is rate limiting requests. Try again shortly.' } };
        return { statusCode: 502, body: { error: 'Spotify could not authorize this catalog request. Check the server credentials and developer app access.' } };
      }
      const tokenData = await tokenResponse.json() as { access_token?: string; expires_in?: number };
      if (!tokenData.access_token) return { statusCode: 502, body: { error: 'Spotify returned an invalid authorization response.' } };
      spotifyToken = { value: tokenData.access_token, expiresAt: Date.now() + Math.max(60, tokenData.expires_in || 3600) * 1000 };
    }

    const params = new URLSearchParams({ q: query, type: 'track', limit: '8', market });
    const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
      headers: { Authorization: `Bearer ${spotifyToken.value}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      if (response.status === 429) return { statusCode: 429, body: { error: await providerError(response, 'Spotify') } };
      if (response.status === 401) spotifyToken = null;
      return { statusCode: 502, body: { error: await providerError(response, 'Spotify') } };
    }
    const payload = await response.json() as { tracks?: { items?: Array<{
      id?: string; name?: string; artists?: Array<{ name?: string }>; album?: { name?: string; images?: Array<{ url?: string }>; release_date?: string };
      duration_ms?: number; external_urls?: { spotify?: string }; explicit?: boolean;
    }> } };
    const results = (payload.tracks?.items || []).flatMap((item): SpotifyTrackResult[] => {
      if (!item.id || !item.name || !item.artists?.length) return [];
      return [{
        id: item.id,
        title: item.name,
        artist: item.artists.map((artist) => artist.name).filter(Boolean).join(', '),
        album: item.album?.name || '',
        image: item.album?.images?.[0]?.url || '',
        durationSeconds: typeof item.duration_ms === 'number' ? Math.round(item.duration_ms / 1000) : null,
        trackUrl: safeProviderUrl(item.external_urls?.spotify, ['open.spotify.com']) || `https://open.spotify.com/track/${encodeURIComponent(item.id)}`,
        releaseDate: item.album?.release_date || '',
        explicit: item.explicit === true,
        provider: 'Spotify',
        playbackKind: 'external only',
      }];
    });
    spotifySearchCache.set(cacheKey, { expiresAt: Date.now() + 90_000, results });
    if (spotifySearchCache.size > 100) {
      const oldest = spotifySearchCache.keys().next().value as string | undefined;
      if (oldest) spotifySearchCache.delete(oldest);
    }
    return { statusCode: 200, body: { results } };
  } catch {
    return { statusCode: 502, body: { error: 'Could not reach Spotify. Check the server network and try again.' } };
  }
}
