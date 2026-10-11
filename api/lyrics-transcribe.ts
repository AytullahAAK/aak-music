import { lyricsStatus, transcribeLyrics } from '../server/lyrics';
import { clientKey, consumeSearchLimit } from '../server/requestGuard';

type Request = { method?: string; url?: string; body?: unknown; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } };
type Response = { setHeader: (key: string, value: string) => void; status: (code: number) => Response; json: (body: unknown) => void };
const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env || {};

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json(lyricsStatus(env).body);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST to request audio transcription.' });
  const retryAfter = consumeSearchLimit(`lyrics-transcribe:${clientKey(req.headers, req.socket?.remoteAddress)}`, 4, 60_000);
  if (retryAfter) { res.setHeader('Retry-After', String(retryAfter)); return res.status(429).json({ error: 'Transcription request limit reached. Try again shortly.' }); }
  const result = await transcribeLyrics(req.body, env);
  return res.status(result.statusCode).json(result.body);
}
