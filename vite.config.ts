import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { itunesSearch, spotifySearch, youtubeSearch } from './server/discovery';
import { appleCatalogSearch, appleDeveloperToken, appleMusicConfigured, appleMusicOriginAllowed } from './server/appleMusic';
import { lyricsStatus, transcribeLyrics, translateLyrics } from './server/lyrics';
import { clientKey, consumeSearchLimit } from './server/requestGuard';

type DevRequest = { method?: string; url?: string; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } };
type DevResponse = { statusCode?: number; setHeader: (key: string, value: string) => void; end: (body?: string) => void };
const serverEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;

function discoveryDevProxy(): Plugin {
  let env = { ...(serverEnv || {}) };
  const useProxy = async (req: DevRequest, res: DevResponse, next: () => void) => {
    if (!req.url?.startsWith('/api/youtube-search') && !req.url?.startsWith('/api/itunes-search') && !req.url?.startsWith('/api/apple-music-search') && !req.url?.startsWith('/api/apple-music-token') && !req.url?.startsWith('/api/spotify-search') && !req.url?.startsWith('/api/lyrics-transcribe') && !req.url?.startsWith('/api/lyrics-translate')) return next();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/apple-music-token') {
      if (req.method !== 'GET') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'Use GET for Apple MusicKit configuration.' })); }
      const originHeader = req.headers?.origin;
      let origin = Array.isArray(originHeader) ? originHeader[0] : originHeader || '';
      if (!origin) {
        const refererHeader = req.headers?.referer;
        const referer = Array.isArray(refererHeader) ? refererHeader[0] : refererHeader || '';
        try { origin = new URL(referer).origin; } catch { origin = ''; }
      }
      if (url.searchParams.has('status')) return res.end(JSON.stringify({ configured: appleMusicConfigured(env), originAllowed: appleMusicOriginAllowed(env, origin) }));
      if (!appleMusicOriginAllowed(env, origin)) { res.statusCode = 403; return res.end(JSON.stringify({ error: 'This website origin is not included in APPLE_MUSIC_ALLOWED_ORIGINS.' })); }
      try { return res.end(JSON.stringify({ developerToken: await appleDeveloperToken(env, origin) })); }
      catch (error) { res.statusCode = appleMusicConfigured(env) ? 500 : 503; return res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Apple MusicKit is not configured.' })); }
    }
    if (url.pathname === '/api/lyrics-transcribe' || url.pathname === '/api/lyrics-translate') {
      if (req.method === 'GET' && url.pathname === '/api/lyrics-transcribe') {
        const status = lyricsStatus(env);
        res.statusCode = status.statusCode;
        return res.end(JSON.stringify(status.body));
      }
      if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'Use POST for this lyrics service.' })); }
      let raw = '';
      let size = 0;
      const decoder = new TextDecoder();
      try {
        for await (const chunk of req as unknown as AsyncIterable<Uint8Array | string>) {
          if (typeof chunk === 'string') { size += chunk.length; raw += chunk; }
          else { size += chunk.byteLength; raw += decoder.decode(chunk, { stream: true }); }
          if (size > 4_000_000) { res.statusCode = 413; return res.end(JSON.stringify({ error: 'The request is too large. Choose a smaller audio file.' })); }
        }
        raw += decoder.decode();
        const payload = raw ? JSON.parse(raw) as unknown : null;
        const kind = url.pathname.endsWith('transcribe') ? 'transcribe' : 'translate';
        const retryAfter = consumeSearchLimit(`lyrics-${kind}:${clientKey(req.headers, req.socket?.remoteAddress)}`, kind === 'transcribe' ? 4 : 8, 60_000);
        if (retryAfter) { res.statusCode = 429; res.setHeader('Retry-After', String(retryAfter)); return res.end(JSON.stringify({ error: 'Lyrics request limit reached. Try again shortly.' })); }
        const result = kind === 'transcribe' ? await transcribeLyrics(payload, env) : await translateLyrics(payload, env);
        res.statusCode = result.statusCode;
        return res.end(JSON.stringify(result.body));
      } catch {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'The lyrics request body must be valid JSON.' }));
      }
    }
    if (req.method !== 'GET') {
      res.statusCode = 405;
      return res.end(JSON.stringify({ error: 'Use GET for music search.' }));
    }
    if (!url.searchParams.has('status') && (url.searchParams.get('q') || '').trim().length >= 2) {
      const provider = url.pathname === '/api/youtube-search' ? 'youtube' : url.pathname === '/api/spotify-search' ? 'spotify' : 'apple';
      const retryAfter = consumeSearchLimit(`${provider}:${clientKey(req.headers, req.socket?.remoteAddress)}`);
      if (retryAfter) { res.statusCode = 429; res.setHeader('Retry-After', String(retryAfter)); return res.end(JSON.stringify({ error: `${provider} search request limit reached. Try again shortly.` })); }
    }
    const result = url.pathname === '/api/apple-music-search'
      ? await appleCatalogSearch(url, env)
      : url.pathname === '/api/youtube-search'
      ? await youtubeSearch(url, env)
      : url.pathname === '/api/spotify-search'
        ? await spotifySearch(url, env)
        : url.pathname === '/api/itunes-search' && appleMusicConfigured(env)
          ? await appleCatalogSearch(url, env)
          : await itunesSearch(url);
    res.statusCode = result.statusCode;
    return res.end(JSON.stringify(result.body));
  };
  return {
    name: 'aak-discovery-dev-proxy',
    config(_config, { mode }) { env = { ...env, ...loadEnv(mode, '.', '') }; },
    configureServer(server) { server.middlewares.use((req, res, next) => { void useProxy(req as unknown as DevRequest, res as unknown as DevResponse, next); }); },
    configurePreviewServer(server) { server.middlewares.use((req, res, next) => { void useProxy(req as unknown as DevRequest, res as unknown as DevResponse, next); }); },
  };
}

export default defineConfig({
  plugins: [react(), discoveryDevProxy()],
});
