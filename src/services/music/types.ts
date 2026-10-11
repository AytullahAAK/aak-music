export interface AudioCatalogTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  durationSeconds: number | null;
  audioUrl: string;
  trackUrl: string;
  provider: 'Apple Music' | 'iTunes Store';
  playbackKind: 'preview' | 'subscription';
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
  catalogSource: 'Apple Music' | 'iTunes Store';
  playbackKind: 'preview' | 'subscription' | 'external only';
}

export interface YouTubeResult {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  durationSeconds: number | null;
  watchUrl: string;
  embeddable: boolean;
  embeddingStatus?: 'allowed' | 'blocked' | 'unknown';
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
