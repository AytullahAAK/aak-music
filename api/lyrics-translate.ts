import { translateLyrics } from '../server/lyrics.js';
import { clientKey, consumeSearchLimit } from '../server/requestGuard.js';

type Request = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } };
type Response = { setHeader: (key: string, value: string) => void; status: (code: number) => Response; json: (body: unknown) => void };
const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env || {};

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST to request translation.' });
  const retryAfter = consumeSearchLimit(`lyrics-translate:${clientKey(req.headers, req.socket?.remoteAddress)}`, 8, 60_000);
  if (retryAfter) { res.setHeader('Retry-After', String(retryAfter)); return res.status(429).json({ error: 'Translation request limit reached. Try again shortly.' }); }
  const result = await translateLyrics(req.body, env);
  return res.status(result.statusCode).json(result.body);
}
