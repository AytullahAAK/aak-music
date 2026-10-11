import { clientKey, consumeSearchLimit } from '../server/requestGuard';

type ApiRequest = { method?: string; url?: string; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } };
type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (value: unknown) => void;
};

const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;

export default async function musicSearch(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET for catalogue search.' });
  const clientId = env?.JAMENDO_CLIENT_ID?.trim();
  const url = new URL(req.url || '/', 'https://aak-music.local');
  if (url.searchParams.has('status')) return res.status(200).json({ configured: Boolean(clientId) });
  if (!clientId) return res.status(503).json({ error: 'Jamendo is not configured on this server.' });

  const query = (url.searchParams.get('q') || '').trim().slice(0, 100);
  if (query.length < 2) return res.status(200).json({ headers: { status: 'success', results_count: 0 }, results: [] });
  const retryAfter = consumeSearchLimit(`jamendo:${clientKey(req.headers, req.socket?.remoteAddress)}`);
  if (retryAfter) { res.setHeader('Retry-After', String(retryAfter)); return res.status(429).json({ error: 'Jamendo search request limit reached. Try again shortly.' }); }

  const params = new URLSearchParams({
    client_id: clientId,
    format: 'json',
    limit: '12',
    search: query,
    type: 'single albumtrack',
    audioformat: 'mp32',
    imagesize: '200',
    include: 'licenses musicinfo',
  });
  try {
    const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?${params.toString()}`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return res.status(502).json({ error: `Jamendo returned HTTP ${response.status}.` });
    const payload = await response.json();
    return res.status(200).json(payload);
  } catch {
    return res.status(502).json({ error: 'Could not reach Jamendo. Check your network and try again.' });
  }
}
