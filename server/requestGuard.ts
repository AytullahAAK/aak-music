type HeaderBag = Record<string, string | string[] | undefined>;

interface RateWindow { startedAt: number; count: number }
const windows = new Map<string, RateWindow>();

export function clientKey(headers: HeaderBag | undefined, remoteAddress?: string) {
  const forwarded = headers?.['x-forwarded-for'];
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return address?.split(',')[0]?.trim() || remoteAddress || 'unknown';
}

export function consumeSearchLimit(key: string, limit = 45, durationMs = 60_000) {
  const now = Date.now();
  let window = windows.get(key);
  if (!window || now - window.startedAt >= durationMs) {
    window = { startedAt: now, count: 0 };
    windows.set(key, window);
  }
  if (window.count >= limit) return Math.max(1, Math.ceil((durationMs - (now - window.startedAt)) / 1000));
  window.count += 1;
  if (windows.size > 10_000) {
    for (const [entry, value] of windows) if (now - value.startedAt >= durationMs) windows.delete(entry);
  }
  return 0;
}
