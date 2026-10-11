import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { itunesSearch, spotifySearch, youtubeSearch } from './server/discovery';
import { clientKey, consumeSearchLimit } from './server/requestGuard';

type DevRequest = { method?: string; url?: string; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } };
type DevResponse = { statusCode?: number; setHeader: (key: string, value: string) => void; end: (body?: string) => void };
const serverEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;

function jamendoDevProxy(): Plugin {
  let clientId = serverEnv?.JAMENDO_CLIENT_ID?.trim() ?? '';
  const useProxy = (req: DevRequest, res: DevResponse, next: () => void) => {
    if (!req.url?.startsWith('/api/music-search')) return next();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const url = new URL(req.url, 'http://localhost');
    const send = (status: number, data: unknown) => {
      res.statusCode = status;
      res.end(JSON.stringify(data));
    };
    if (req.method !== 'GET') return send(405, { error: 'Use GET for catalogue search.' });
    if (url.searchParams.has('status')) return send(200, { configured: Boolean(clientId) });
    if (!clientId) return send(503, { error: 'Jamendo is not configured on this server.' });
    const query = (url.searchParams.get('q') || '').trim().slice(0, 100);
    if (query.length < 2) return send(200, { headers: { status: 'success', results_count: 0 }, results: [] });
    const retryAfter = consumeSearchLimit(`jamendo:${clientKey(req.headers, req.socket?.remoteAddress)}`);
    if (retryAfter) { res.statusCode = 429; res.setHeader('Retry-After', String(retryAfter)); return res.end(JSON.stringify({ error: 'Jamendo search request limit reached. Try again shortly.' })); }
    const params = new URLSearchParams({
      client_id: clientId, format: 'json', limit: '12', search: query,
      type: 'single albumtrack', audioformat: 'mp32', imagesize: '200', include: 'licenses musicinfo',
    });
    void fetch(`https://api.jamendo.com/v3.0/tracks/?${params.toString()}`, { signal: AbortSignal.timeout(10000) })
      .then(async (response) => send(response.ok ? 200 : 502, response.ok ? await response.json() : { error: `Jamendo returned HTTP ${response.status}.` }))
      .catch(() => send(502, { error: 'Could not reach Jamendo. Check your network and try again.' }));
  };
  return {
    name: 'aak-jamendo-dev-proxy',
    config(_config, { mode }) { clientId = loadEnv(mode, '.', '').JAMENDO_CLIENT_ID?.trim() || clientId; },
    configureServer(server) { server.middlewares.use((req, res, next) => { useProxy(req as unknown as DevRequest, res as unknown as DevResponse, next); }); },
    configurePreviewServer(server) { server.middlewares.use((req, res, next) => { useProxy(req as unknown as DevRequest, res as unknown as DevResponse, next); }); },
  };
}

function discoveryDevProxy(): Plugin {
  let env = { ...(serverEnv || {}) };
  const useProxy = async (req: DevRequest, res: DevResponse, next: () => void) => {
    if (!req.url?.startsWith('/api/youtube-search') && !req.url?.startsWith('/api/itunes-search') && !req.url?.startsWith('/api/spotify-search')) return next();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const url = new URL(req.url, 'http://localhost');
    if (req.method !== 'GET') {
      res.statusCode = 405;
      return res.end(JSON.stringify({ error: 'Use GET for music search.' }));
    }
    if (!url.searchParams.has('status') && (url.searchParams.get('q') || '').trim().length >= 2) {
      const provider = url.pathname === '/api/youtube-search' ? 'youtube' : url.pathname === '/api/spotify-search' ? 'spotify' : 'apple';
      const retryAfter = consumeSearchLimit(`${provider}:${clientKey(req.headers, req.socket?.remoteAddress)}`);
      if (retryAfter) { res.statusCode = 429; res.setHeader('Retry-After', String(retryAfter)); return res.end(JSON.stringify({ error: `${provider} search request limit reached. Try again shortly.` })); }
    }
    const result = url.pathname === '/api/youtube-search'
      ? await youtubeSearch(url, env)
      : url.pathname === '/api/spotify-search'
        ? await spotifySearch(url, env)
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
  plugins: [react(), jamendoDevProxy(), discoveryDevProxy()],
});
