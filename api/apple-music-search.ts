import { appleCatalogSearch } from '../server/appleMusic.js';
import { clientKey, consumeSearchLimit } from '../server/requestGuard.js';

type Request = { method?: string; url?: string; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } };
type Response = { setHeader: (key: string, value: string) => void; status: (code: number) => Response; json: (body: unknown) => void };

export default async function handler(req: Request, res: Response) {
  // Read env at request time — Vercel injects variables into the process before each invocation.
  const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env || {};
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET for Apple Music catalog search.' });
  const url = new URL(req.url || '/', 'https://aak-music.local');
  if (!url.searchParams.has('status') && (url.searchParams.get('q') || '').trim().length >= 2) {
    const retryAfter = consumeSearchLimit(`apple-music:${clientKey(req.headers, req.socket?.remoteAddress)}`);
    if (retryAfter) { res.setHeader('Retry-After', String(retryAfter)); return res.status(429).json({ error: 'Apple Music search request limit reached. Try again shortly.' }); }
  }
  const result = await appleCatalogSearch(url, env);
  if (result.statusCode === 200 && !url.searchParams.has('status')) res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  return res.status(result.statusCode).json(result.body);
}
