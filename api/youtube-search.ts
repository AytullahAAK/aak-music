import { youtubeSearch } from '../server/discovery';
import { clientKey, consumeSearchLimit } from '../server/requestGuard';

type Request = { method?: string; url?: string; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } };
type Response = { setHeader: (key: string, value: string) => void; status: (code: number) => Response; json: (body: unknown) => void };

const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env || {};

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET for YouTube search.' });
  const url = new URL(req.url || '/', 'https://aak-music.local');
  if (!url.searchParams.has('status') && (url.searchParams.get('q') || '').trim().length >= 2) {
    const retryAfter = consumeSearchLimit(`youtube:${clientKey(req.headers, req.socket?.remoteAddress)}`);
    if (retryAfter) { res.setHeader('Retry-After', String(retryAfter)); return res.status(429).json({ error: 'YouTube search request limit reached. Try again shortly.' }); }
  }
  const result = await youtubeSearch(url, env);
  return res.status(result.statusCode).json(result.body);
}
