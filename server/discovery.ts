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
  explicit: boolean;
  provider: 'Spotify';
  playbackKind: 'external only';
}

let spotifyToken: { value: string; expiresAt: number } | null = null;
const spotifySearchCache = new Map<string, { expiresAt: number; results: SpotifyTrackResult[] }>();

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

  const searchParams = new URLSearchParams({
    key,
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    maxResults: '8',
    q: query,
  });

  try {
    const searchResponse = await upstreamFetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`);
    if (!searchResponse.ok) return { statusCode: 502, body: { error: errorMessage('YouTube search', searchResponse.status) } };
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

    if (!candidates.length) return { statusCode: 200, body: { results: [] } };

    const detailParams = new URLSearchParams({ key, part: 'contentDetails,status', id: candidates.map(({ id }) => id).join(',') });
    const detailsResponse = await upstreamFetch(`https://www.googleapis.com/youtube/v3/videos?${detailParams}`);
    let details = new Map<string, YouTubeVideoItem>();
    if (detailsResponse.ok) {
      const payload = await detailsResponse.json() as { items?: YouTubeVideoItem[] };
      details = new Map((payload.items || []).filter((item) => item.id).map((item) => [item.id as string, item]));
    }

    const results = candidates.flatMap((candidate) => {
      const detail = details.get(candidate.id);
      // Search is already filtered for embeddable videos; when status details are
      // available, enforce that status again before offering in-site playback.
      if (detail && detail.status?.embeddable === false) return [];
      return [{
        ...candidate,
        durationSeconds: durationSeconds(detail?.contentDetails?.duration),
        watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(candidate.id)}`,
        embeddable: true,
        provider: 'YouTube',
      }];
    });
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
  const params = new URLSearchParams({ term: query, entity: 'song', limit: '12', country });

  try {
    const response = await upstreamFetch(`https://itunes.apple.com/search?${params}`);
    if (!response.ok) return { statusCode: 502, body: { error: errorMessage('Apple Music catalog', response.status) } };
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
      }];
    });
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
      if (response.status === 429) return { statusCode: 429, body: { error: 'Spotify is rate limiting requests. Try again shortly.' } };
      if (response.status === 401) spotifyToken = null;
      return { statusCode: 502, body: { error: response.status === 403 ? 'Spotify denied catalog search. Check the app dashboard and API access.' : `Spotify catalog search failed (HTTP ${response.status}). Try again shortly.` } };
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
