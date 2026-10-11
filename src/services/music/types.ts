export interface ExternalTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  durationSeconds: number;
  streamUrl: string;
  downloadUrl: string;
  downloadAllowed: boolean;
  trackUrl: string;
  licenseUrl: string;
  genres: string[];
  provider: 'Jamendo';
}

export interface MusicSearchProvider {
  id: string;
  label: string;
  search(query: string, signal?: AbortSignal): Promise<ExternalTrack[]>;
}

export interface AudioCatalogTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  durationSeconds: number | null;
  audioUrl: string;
  trackUrl: string;
  provider: 'Jamendo' | 'Apple Music';
  playbackKind: 'full stream' | 'preview';
  genre?: string;
  releaseDate?: string;
  explicit?: boolean;
  videoVersion?: YouTubeResult;
}

export interface AppleMusicResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  durationSeconds: number | null;
  previewUrl: string;
  trackUrl: string;
  genre: string;
  releaseDate: string;
  explicit: boolean;
  provider: 'Apple Music';
}

export interface YouTubeResult {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  durationSeconds: number | null;
  watchUrl: string;
  embeddable: boolean;
  provider: 'YouTube';
  audioVersion?: AudioCatalogTrack;
}

export interface SpotifyTrackResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  durationSeconds: number | null;
  trackUrl: string;
  releaseDate: string;
  explicit: boolean;
  provider: 'Spotify';
  playbackKind: 'external only';
}
