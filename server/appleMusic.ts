type Env = Record<string, string | undefined>;

type AppleSong = {
  id: string;
  type?: string;
  attributes?: {
    name?: string;
    artistName?: string;
    albumName?: string;
    artwork?: { url?: string };
    durationInMillis?: number;
    url?: string;
    genreNames?: string[];
    releaseDate?: string;
    contentRating?: string;
    previews?: Array<{ url?: string }>;
  };
};

let cachedToken: { token: string; expiresAt: number; origin: string } | null = null;
const utf8 = new TextEncoder();
const base64Url = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

export function appleMusicConfigured(env: Env) {
  return Boolean(env.APPLE_MUSIC_TEAM_ID?.trim() && env.APPLE_MUSIC_KEY_ID?.trim() && env.APPLE_MUSIC_PRIVATE_KEY_BASE64?.trim() && allowedOrigins(env).length);
}

function allowedOrigins(env: Env) {
  return (env.APPLE_MUSIC_ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter((origin) => {
    try { return ['https:', 'http:'].includes(new URL(origin).protocol) && new URL(origin).origin === origin; }
    catch { return false; }
  });
}

export function appleMusicOriginAllowed(env: Env, origin: string) {
  return Boolean(origin) && allowedOrigins(env).includes(origin);
}

function decodePrivateKey(env: Env) {
  const encoded = env.APPLE_MUSIC_PRIVATE_KEY_BASE64?.replace(/\s/g, '');
  if (!encoded) throw new Error('Apple Music credentials are not configured.');
  const pem = atob(encoded);
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function appleDeveloperToken(env: Env, requestOrigin = '') {
  if (!appleMusicConfigured(env)) throw new Error('Apple MusicKit is not configured on this server.');
  const permitted = allowedOrigins(env);
  if (requestOrigin && !permitted.includes(requestOrigin)) throw new Error('This website origin is not included in APPLE_MUSIC_ALLOWED_ORIGINS.');
  const origin = requestOrigin && permitted.includes(requestOrigin) ? requestOrigin : '';
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - now > 60 && cachedToken.origin === origin) return cachedToken.token;

  const expiresAt = now + 60 * 60;
  const header = base64Url(utf8.encode(JSON.stringify({ alg: 'ES256', kid: env.APPLE_MUSIC_KEY_ID!.trim(), typ: 'JWT' })));
  const claims: Record<string, unknown> = { iss: env.APPLE_MUSIC_TEAM_ID!.trim(), iat: now, exp: expiresAt };
  if (origin) claims.origin = [origin];
  const payload = base64Url(utf8.encode(JSON.stringify(claims)));
  const unsigned = `${header}.${payload}`;
  const privateKey = await crypto.subtle.importKey('pkcs8', decodePrivateKey(env), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, utf8.encode(unsigned)));
  const token = `${unsigned}.${base64Url(signature)}`;
  cachedToken = { token, expiresAt, origin };
  return token;
}

export async function appleCatalogSearch(url: URL, env: Env) {
  if (url.searchParams.has('status')) return { statusCode: 200, body: { configured: appleMusicConfigured(env) } };
  const query = (url.searchParams.get('q') || '').trim().slice(0, 100);
  if (query.length < 2) return { statusCode: 200, body: { results: [] } };
  if (!appleMusicConfigured(env)) return { statusCode: 503, body: { error: 'Apple Music catalog search needs an Apple MusicKit developer key configured on the server.' } };

  const country = (url.searchParams.get('country') || 'us').toLowerCase();
  const storefront = /^[a-z]{2}$/.test(country) ? country : 'us';
  let token: string;
  try { token = await appleDeveloperToken(env); }
  catch { return { statusCode: 503, body: { error: 'Apple Music could not sign a developer token. Check the MusicKit key, Key ID, Team ID, and allowed origins on the server.' } }; }

  try {
    const params = new URLSearchParams({ term: query, types: 'songs', limit: '12' });
    const response = await fetch(`https://api.music.apple.com/v1/catalog/${storefront}/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      if (response.status === 429) return { statusCode: 429, body: { error: 'Apple Music is rate limiting catalog requests. Try again shortly.' } };
      if (response.status === 401 || response.status === 403) return { statusCode: 502, body: { error: 'Apple rejected the developer token. Check the MusicKit identifier, key, team ID, and MusicKit service access.' } };
      return { statusCode: 502, body: { error: `Apple Music catalog returned HTTP ${response.status}.` } };
    }
    const payload = await response.json() as { results?: { songs?: { data?: AppleSong[] } } };
    const results = (payload.results?.songs?.data || []).flatMap((song) => {
      const attributes = song.attributes;
      if (!song.id || !attributes?.name || !attributes.artistName) return [];
      const artwork = attributes.artwork?.url?.replace('{w}', '600').replace('{h}', '600') || '';
      const url = attributes.url || `https://music.apple.com/${storefront}/song/${encodeURIComponent(song.id)}`;
      const previewUrl = attributes.previews?.find((preview) => preview.url)?.url || '';
      return [{
        id: song.id,
        title: attributes.name,
        artist: attributes.artistName,
        album: attributes.albumName || '',
        image: artwork,
        durationSeconds: typeof attributes.durationInMillis === 'number' ? Math.round(attributes.durationInMillis / 1000) : null,
        previewUrl,
        trackUrl: url,
        genre: attributes.genreNames?.[0] || '',
        releaseDate: attributes.releaseDate || '',
        explicit: attributes.contentRating === 'explicit',
        provider: 'Apple Music' as const,
        catalogSource: 'Apple Music' as const,
        playbackKind: 'subscription' as const,
      }];
    });
    return { statusCode: 200, body: { results } };
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError' ? 'Apple Music catalog timed out. Try again.' : 'Could not reach Apple Music catalog. Check the server network and try again.';
    return { statusCode: 502, body: { error: message } };
  }
}

