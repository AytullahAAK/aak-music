import type { ExternalTrack, MusicSearchProvider } from './types';

const API = '/api/music-search';

interface JamendoTrack {
  id: string;
  name: string;
  artist_name: string;
  album_name?: string;
  image?: string;
  duration?: string | number;
  audio?: string;
  audiodownload?: string;
  audiodownload_allowed?: boolean;
  shareurl?: string;
  license_ccurl?: string;
  musicinfo?: { tags?: { genres?: string[]; vartags?: string[] } };
}

interface JamendoResponse {
  headers?: { status?: string; error_message?: string; results_count?: number };
  results?: JamendoTrack[];
}

function safeHttpsUrl(value?: string) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch { return ''; }
}

export async function checkJamendoConfiguration(signal?: AbortSignal) {
  const response = await fetch(`${API}?status=1`, { signal });
  if (!response.ok) return false;
  const data = await response.json() as { configured?: boolean };
  return data.configured === true;
}

export const jamendoProvider: MusicSearchProvider = {
  id: 'jamendo',
  label: 'Jamendo',
  async search(query, signal) {
    const response = await fetch(`${API}?q=${encodeURIComponent(query)}`, { signal });
    if (!response.ok) throw new Error(`Jamendo returned HTTP ${response.status}.`);
    const data = await response.json() as JamendoResponse;
    if (data.headers?.status !== 'success') {
      throw new Error(data.headers?.error_message || 'Jamendo could not complete this search.');
    }
    return (data.results ?? []).map((track) => ({
      id: track.id,
      title: track.name,
      artist: track.artist_name,
      album: track.album_name || 'Single',
      image: track.image || '',
      durationSeconds: Number(track.duration) || 0,
      streamUrl: safeHttpsUrl(track.audio),
      downloadUrl: safeHttpsUrl(track.audiodownload),
      downloadAllowed: track.audiodownload_allowed === true && Boolean(safeHttpsUrl(track.audiodownload)),
      trackUrl: safeHttpsUrl(track.shareurl) || `https://www.jamendo.com/track/${encodeURIComponent(track.id)}`,
      licenseUrl: safeHttpsUrl(track.license_ccurl),
      genres: [...(track.musicinfo?.tags?.genres ?? []), ...(track.musicinfo?.tags?.vartags ?? [])].slice(0, 3),
      provider: 'Jamendo' as const,
    }));
  },
};
