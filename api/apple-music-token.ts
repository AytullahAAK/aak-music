import { appleDeveloperToken, appleMusicConfigured, appleMusicOriginAllowed } from '../server/appleMusic';

type Request = { method?: string; headers?: Record<string, string | string[] | undefined> };
type Response = { setHeader: (key: string, value: string) => void; status: (code: number) => Response; json: (body: unknown) => void };
const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env || {};

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET for Apple MusicKit configuration.' });
  const originHeader = req.headers?.origin;
  let origin = Array.isArray(originHeader) ? originHeader[0] : originHeader || '';
  if (!origin) {
    const refererHeader = req.headers?.referer;
    const referer = Array.isArray(refererHeader) ? refererHeader[0] : refererHeader || '';
    try { origin = new URL(referer).origin; } catch { origin = ''; }
  }
  if (new URLSearchParams((req as Request & { url?: string }).url?.split('?')[1] || '').has('status')) {
    return res.status(200).json({ configured: appleMusicConfigured(env), originAllowed: appleMusicOriginAllowed(env, origin) });
  }
  if (!appleMusicConfigured(env)) return res.status(503).json({ error: 'Apple MusicKit is not configured on this server.' });
  if (!appleMusicOriginAllowed(env, origin)) return res.status(403).json({ error: 'This website origin is not included in APPLE_MUSIC_ALLOWED_ORIGINS.' });
  try {
    const developerToken = await appleDeveloperToken(env, origin);
    return res.status(200).json({ developerToken });
  } catch {
    return res.status(500).json({ error: 'Apple MusicKit could not sign a developer token. Check the server key configuration.' });
  }
}

