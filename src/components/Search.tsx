import { memo, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Dialog, { Close } from './Dialog';
import Art from './Art';
import { artists, events, genres, tracks } from '../data';
import { useUI } from '../hooks/useUI';
import { usePlayer } from '../hooks/usePlayer';
import { useUniversalPlayer } from '../hooks/useUniversalPlayer';
import { appleMusicProvider, checkAppleCatalog, checkAppleMusicCatalogConfiguration, checkAppleMusicKitConfiguration, checkSpotifyConfiguration, checkYouTubeConfiguration, spotifyProvider, youtubeProvider } from '../services/music/discovery';
import type { AppleMusicResult, AudioCatalogTrack, SpotifyTrackResult, YouTubeResult } from '../services/music/types';

type ProviderStatus = 'checking' | 'ready' | 'unconfigured' | 'unavailable';
type Provider = 'youtube' | 'apple' | 'spotify';
type SearchProvider = Provider | 'library';
type Statuses = Record<Provider, ProviderStatus>;
type Loading = Record<Provider, boolean>;
type Errors = Record<Provider, string>;

const EMPTY_LOADING: Loading = { youtube: false, apple: false, spotify: false };
const EMPTY_ERRORS: Errors = { youtube: '', apple: '', spotify: '' };
const SEARCH_HISTORY_KEY = 'aak_music_search_history';
const SEARCH_PROVIDERS: Array<{ id: SearchProvider; label: string }> = [
  { id: 'youtube', label: 'YouTube' }, { id: 'apple', label: 'Apple Music' },
  { id: 'spotify', label: 'Spotify' }, { id: 'library', label: 'My AAK Library' },
];
const H = ({ children }: { children: React.ReactNode }) => <h3 className="mb-3 mt-7 text-[10px] font-mono uppercase tracking-[.18em] text-bone/55">{children}</h3>;
const duration = (seconds: number | null | undefined) => !seconds || seconds <= 0 ? '' : `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
function youtubeIdFromUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0]?.match(/^[\w-]{11}$/)?.[0] || '';
    if (!['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) return '';
    const id = url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1] || '';
    return /^[\w-]{11}$/.test(id) ? id : '';
  } catch { return ''; }
}

interface SpeechAlternativeLike { transcript: string }
interface SpeechResultLike extends ArrayLike<SpeechAlternativeLike> { isFinal: boolean }
interface SpeechResultEventLike { results: ArrayLike<SpeechResultLike> }
interface SpeechErrorEventLike { error: string }
interface SpeechRecognitionLike {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: SpeechErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };

function DownloadPanel() {
  const [url, setUrl] = useState('');
  const [checked, setChecked] = useState('');
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const id = youtubeIdFromUrl(url);
    setChecked(id ? `https://www.youtube.com/watch?v=${id}` : '');
  };
  return <section aria-labelledby="download-center-title" className="mt-5 rounded-2xl border border-bone/10 bg-void/30 p-4 sm:p-5">
    <h3 id="download-center-title" className="font-semibold">Authorized downloads</h3>
    <p className="mt-2 text-sm leading-6 text-bone/60">There are no in-site downloads authorized for the current external providers. AAK releases remain playable in the library and are not offered here. YouTube videos can be opened at their official destination; any offline options remain subject to YouTube's account, region, and video rules.</p>
    <form onSubmit={onSubmit} className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row">
      <label htmlFor="download-youtube-url" className="sr-only">YouTube video URL</label>
      <input id="download-youtube-url" value={url} onChange={(event) => { setUrl(event.target.value); setChecked(''); }} placeholder="Paste a YouTube video URL" className="min-h-11 min-w-0 flex-1 rounded-xl border border-bone/15 bg-ink/45 px-3 text-sm text-bone outline-none transition focus-visible:border-bone/40 focus-visible:ring-2 focus-visible:ring-bone/10" />
      <button type="submit" className="min-h-11 rounded-xl border border-bone/15 px-4 text-xs font-semibold hover:border-cyan hover:text-cyan">Validate official URL</button>
    </form>
    {checked && <div className="mt-4 rounded-xl border border-bone/10 p-3"><p className="text-sm font-medium">Official YouTube destination</p><a href={checked} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-10 items-center rounded-full border border-bone/15 px-4 text-xs hover:border-cyan hover:text-cyan">Open on YouTube ↗</a><p className="mt-2 text-xs leading-5 text-bone/55">This site does not download or convert YouTube media. YouTube’s official offline options depend on its account, region, and video rules.</p></div>}
    {url.trim() && !checked && <p role="alert" className="mt-3 text-sm text-amber-200">Enter a valid youtube.com or youtu.be video URL.</p>}
    <p className="mt-3 text-xs text-bone/45">No converter, protected-stream extraction, or hidden download link is used.</p>
  </section>;
}

function LocalResult({ index, onPlay, onQueue, isPlaying }: { index: number; onPlay: (index: number) => void; onQueue: () => void; isPlaying?: boolean }) {
  const track = tracks[index];
  return <li className={`grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-3 border-b border-bone/10 py-3 ${isPlaying ? 'rounded-xl bg-cyan/[.07] px-2' : ''}`}>
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-raised">
      <Art a={track.a} b={track.b} image={track.image} className="h-full w-full object-cover" />
      {isPlaying && <div className="absolute inset-0 grid place-items-center bg-black/45"><span className="font-mono text-xs text-cyan">▶</span></div>}
    </div>
    <div className="min-w-0"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="break-words font-semibold">{track.title}</p><span className="text-[10px] font-mono text-bone/50">{duration(track.dur)}</span></div><p className="mt-1 text-sm text-bone/65">{track.artist} · {track.genre} · {track.bpm} BPM</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => onPlay(index)} className="min-h-10 rounded-full bg-cyan px-4 text-xs font-bold text-ink hover:brightness-110">
          {isPlaying ? 'Playing AAK release' : 'Play AAK release'}
        </button>
        <button type="button" onClick={onQueue} className="min-h-10 rounded-full border border-bone/15 px-3.5 text-xs text-bone/75 hover:border-cyan hover:text-cyan">
          + Queue
        </button>
        <span className="inline-flex min-h-10 items-center rounded-full border border-bone/10 px-3 text-[10px] text-bone/55">AAK Music · master release</span>
      </div></div>
  </li>;
}

function AppleResult({ track, matchingVideo, matchingSpotify, onPlay, onPreview, onQueue, onWatch, isPlaying }: { track: AppleMusicResult; matchingVideo?: YouTubeResult; matchingSpotify?: SpotifyTrackResult; onPlay: () => void; onPreview: () => void; onQueue: () => void; onWatch?: () => void; isPlaying?: boolean }) {
  return <li className={`grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-3 border-b border-bone/10 py-3 ${isPlaying ? 'rounded-xl bg-cyan/[.07] px-2' : ''}`}>
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-raised">
      {track.image ? <img src={track.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="h-full w-full bg-raised" />}
      {isPlaying && <div className="absolute inset-0 grid place-items-center bg-black/45"><span className="font-mono text-xs text-cyan">▶</span></div>}
    </div>
    <div className="min-w-0"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="break-words font-semibold">{track.title}</p>{duration(track.durationSeconds) && <span className="text-[10px] font-mono text-bone/50">{duration(track.durationSeconds)} full track</span>}</div><p className="mt-1 break-words text-sm text-bone/65">{track.artist}{track.album ? ` · ${track.album}` : ''}</p>
      <p className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-bone/50"><span>{track.catalogSource === 'iTunes Store' ? 'iTunes Store · preview catalog' : 'Apple Music · catalog'}</span>{track.genre && <span>{track.genre}</span>}{track.releaseDate && <span>{track.releaseDate.slice(0, 10)}</span>}{track.explicit && <span>Explicit</span>}</p>
      <div className="mt-2 flex flex-wrap gap-2">{track.playbackKind === 'subscription' && <button type="button" onClick={onPlay} className="min-h-10 rounded-full bg-cyan px-4 text-xs font-bold text-ink">Play in Apple Music</button>}{track.previewUrl && <><button type="button" onClick={onPreview} className="min-h-10 rounded-full border border-cyan/30 px-4 text-xs font-bold text-cyan">{isPlaying ? 'Playing preview' : 'Play preview'}</button><button type="button" onClick={onQueue} className="min-h-10 rounded-full border border-bone/15 px-3 text-xs hover:border-cyan hover:text-cyan">+ Queue</button></>}{track.playbackKind === 'external only' && <span className="inline-flex min-h-10 items-center rounded-full border border-bone/10 px-3 text-xs text-bone/50">No playable preview</span>}<a href={track.trackUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-bone/15 px-3 text-xs hover:border-cyan hover:text-cyan">Open Apple Music ↗</a>{matchingVideo?.embeddable && onWatch && <button type="button" onClick={onWatch} className="min-h-10 rounded-full border border-bone/15 px-3 text-xs hover:border-cyan hover:text-cyan">Watch matching YouTube</button>}{matchingSpotify && <a href={matchingSpotify.trackUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-bone/15 px-3 text-xs hover:border-cyan hover:text-cyan">Spotify version ↗</a>}</div>
      {track.playbackKind === 'preview' && <p className="mt-1 text-[10px] text-bone/45">Preview only; playable length is read from the loaded preview.</p>}{track.playbackKind === 'subscription' && <p className="mt-1 text-[10px] text-bone/45">Full playback requires Apple Music authorization and an eligible subscription.</p>}
    </div>
  </li>;
}

function YouTubeResultCard({ video, selected, playing, onSelect, onQueue }: { video: YouTubeResult; selected: boolean; playing: boolean; onSelect: () => void; onQueue: () => void }) {
  const playbackAllowed = video.embeddingStatus !== 'blocked';
  return <li data-youtube-video-id={video.id} className={`min-w-0 border-b border-bone/10 py-3 ${selected ? 'rounded-xl bg-cyan/[.06] px-2' : ''}`}>
    <button type="button" onClick={onSelect} aria-pressed={selected} className="grid w-full min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan sm:grid-cols-[8rem_minmax(0,1fr)]">
      {video.thumbnail ? <img src={video.thumbnail} alt="" loading="lazy" className="aspect-video w-full rounded-lg object-cover" /> : <span className="aspect-video rounded-lg bg-raised" />}
      <span className="min-w-0"><span className="flex flex-wrap items-start justify-between gap-2"><span className="break-words font-semibold">{video.title}</span>{selected && <span className="shrink-0 rounded-full bg-cyan/15 px-2 py-1 text-[9px] font-mono text-cyan">{playing ? 'PLAYING' : 'SELECTED'}</span>}</span><span className="mt-1 block break-words text-sm text-bone/65">{video.artist}{duration(video.durationSeconds) ? ` - ${duration(video.durationSeconds)}` : ''}</span><span className="mt-1 block text-[10px] text-bone/50">YouTube video - {playbackAllowed ? 'official embedded playback' : 'embedding disabled by uploader'}</span></span>
    </button>
    <div className="mt-2 flex flex-wrap gap-2 pl-[calc(5.5rem+0.75rem)] sm:pl-[calc(8rem+0.75rem)]">
      <button type="button" onClick={onSelect} className="min-h-10 rounded-full bg-cyan px-4 text-xs font-bold text-ink hover:brightness-110">
        Play video
      </button>
      <button type="button" onClick={onQueue} className="min-h-10 rounded-full border border-bone/15 px-3 text-xs text-bone/75 hover:border-cyan hover:text-cyan">
        + Queue
      </button>
      <a href={video.watchUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-bone/15 px-3 text-xs hover:border-cyan hover:text-cyan">
        Open on YouTube ↗
      </a>
      {selected && !playbackAllowed && <span className="inline-flex min-h-10 items-center text-xs text-amber-100/75">Open on YouTube to watch this video.</span>}
    </div>
  </li>;
}
function SpotifyResult({ track, onMatching }: { track: SpotifyTrackResult; onMatching?: string }) {
  return <li className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-3 border-b border-bone/10 py-3">
    {track.image ? <img src={track.image} alt="" loading="lazy" className="h-14 w-14 rounded-lg object-cover" /> : <span className="h-14 w-14 rounded-lg bg-raised" />}
    <div className="min-w-0"><p className="break-words font-semibold">{track.title}</p><p className="mt-1 break-words text-sm text-bone/65">{track.artist} · {track.album}</p><p className="mt-1 text-[10px] text-bone/50">Spotify · catalog metadata{duration(track.durationSeconds) ? ` · ${duration(track.durationSeconds)}` : ''}{track.explicit ? ' · Explicit' : ''}</p><p className="mt-1 text-xs text-bone/50">Spotify playback requires an authorized user session and eligible account. This result is not playing in AAK.</p><a href={track.trackUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-10 items-center rounded-full border border-bone/15 px-3 text-xs hover:border-cyan hover:text-cyan">{onMatching || 'Open in Spotify ↗'}</a></div>
  </li>;
}

function Search({ q: initialQuery, embedded = false }: { q: string; embedded?: boolean }) {
  const [query, setQuery] = useState(initialQuery);
  const [provider, setProvider] = useState<SearchProvider>('youtube');
  const [tab, setTab] = useState<'search' | 'downloads'>('search');
  const [browseLocal, setBrowseLocal] = useState(false);
  const { close, openArtist, openEvent } = useUI();
  const localPlayer = usePlayer();
  const universal = useUniversalPlayer();
  const box = useRef<HTMLDivElement>(null);
  const [statuses, setStatuses] = useState<Statuses>({ youtube: 'checking', apple: 'checking', spotify: 'checking' });
  const [appleMusicCatalogConfigured, setAppleMusicCatalogConfigured] = useState(false);
  const [appleMusicKitConfigured, setAppleMusicKitConfigured] = useState(false);
  const [apple, setApple] = useState<AppleMusicResult[]>([]);
  const [youtube, setYoutube] = useState<YouTubeResult[]>([]);
  const [youtubeNextPageToken, setYoutubeNextPageToken] = useState<string | null>(null);
  const [youtubePageLoading, setYoutubePageLoading] = useState(false);
  const [youtubePageError, setYoutubePageError] = useState('');
  const [spotify, setSpotify] = useState<SpotifyTrackResult[]>([]);
  const [loading, setLoading] = useState<Loading>(EMPTY_LOADING);
  const [errors, setErrors] = useState<Errors>(EMPTY_ERRORS);
  const [retry, setRetry] = useState(0);
  const [statusCheckRetry, setStatusCheckRetry] = useState(0);
  const [listening, setListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState('');
  const [voiceAwaitingReview, setVoiceAwaitingReview] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]') as string[]; } catch { return []; }
  });
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const youtubeInput = useRef<HTMLInputElement>(null);
  const youtubeSearchRequest = useRef<AbortController | null>(null);
  const youtubePageRequest = useRef<AbortController | null>(null);
  const youtubePageInFlight = useRef(false);
  const speechWindow = typeof window === 'undefined' ? null : window as SpeechWindow;
  const Recognition = speechWindow?.SpeechRecognition ?? speechWindow?.webkitSpeechRecognition;
  const normalized = query.trim().toLocaleLowerCase();
  const localMatch = (...fields: string[]) => fields.some((field) => field.toLocaleLowerCase().includes(normalized));
  const matchingTracks = useMemo(() => tracks.map((track, index) => ({ track, index })).filter(({ track }) => normalized.length > 0 && localMatch(track.title, track.artist, track.genre, String(track.bpm), track.date, `${Math.floor(track.dur / 60)}:${track.dur % 60}`, 'Ayatullah Al Khomeini')), [normalized]);
  const matchingArtists = useMemo(() => artists.filter((artist) => normalized.length > 0 && localMatch(artist.name, artist.genre, artist.bio, artist.id === 'aak-music' ? 'Ayatullah Al Khomeini' : '')), [normalized]);
  const matchingGenres = useMemo(() => genres.filter((genre) => normalized.length > 0 && localMatch(genre.name)), [normalized]);
  const matchingEvents = useMemo(() => events.filter((event) => normalized.length > 0 && localMatch(event.name, event.city, event.country, event.venue)), [normalized]);

  const rememberSearch = (value: string) => {
    const term = value.trim();
    if (term.length < 2) return;
    setHistory((current) => {
      const next = [term, ...current.filter((entry) => entry.toLocaleLowerCase() !== term.toLocaleLowerCase())].slice(0, 8);
      try { localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next)); } catch { /* Storage may be disabled. */ }
      return next;
    });
  };

  useEffect(() => {
    const controller = new AbortController();
    void Promise.allSettled([checkYouTubeConfiguration(controller.signal), checkAppleCatalog(controller.signal), checkSpotifyConfiguration(controller.signal), checkAppleMusicKitConfiguration(controller.signal), checkAppleMusicCatalogConfiguration(controller.signal)])
      .then(([yt, ap, sp, musicKit, appleMusicCatalog]) => {
        if (controller.signal.aborted) return;
        const itunesAvailable = ap.status === 'fulfilled' && ap.value;
        const appleCatalogAvailable = appleMusicCatalog.status === 'fulfilled' && appleMusicCatalog.value;
        setStatuses({
          youtube: yt.status === 'fulfilled' ? (yt.value ? 'ready' : 'unconfigured') : 'unavailable',
          apple: itunesAvailable || appleCatalogAvailable ? 'ready' : ap.status === 'fulfilled' && appleMusicCatalog.status === 'fulfilled' ? 'unconfigured' : 'unavailable',
          spotify: sp.status === 'fulfilled' ? (sp.value ? 'ready' : 'unconfigured') : 'unavailable',
        });
        setAppleMusicCatalogConfigured(appleCatalogAvailable);
        setAppleMusicKitConfigured(musicKit.status === 'fulfilled' && musicKit.value);
      });
    return () => controller.abort();
  }, [statusCheckRetry]);

  useEffect(() => {
    setApple([]); setYoutube([]); setSpotify([]); setErrors(EMPTY_ERRORS); setLoading(EMPTY_LOADING);
    setYoutubeNextPageToken(null); setYoutubePageError(''); setYoutubePageLoading(false);
    youtubePageInFlight.current = false;
    youtubePageRequest.current?.abort();
    if (provider === 'library' || normalized.length < 2 || voiceAwaitingReview || statuses[provider] !== 'ready') return;
    const controller = new AbortController();
    if (provider === 'youtube') youtubeSearchRequest.current = controller;
    const timer = window.setTimeout(() => {
      rememberSearch(query);
      setLoading({ ...EMPTY_LOADING, [provider]: true });
      const reportError = (error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        setErrors((current) => ({ ...current, [provider]: error instanceof Error ? error.message : 'Search failed. Try again.' }));
      };
      const finish = () => { if (!controller.signal.aborted) setLoading((current) => ({ ...current, [provider]: false })); };
      if (provider === 'youtube') void youtubeProvider.search(query.trim(), controller.signal).then((page) => {
        if (controller.signal.aborted) return;
        setYoutube(page.results);
        setYoutubeNextPageToken(page.nextPageToken);
      }).catch(reportError).finally(finish);
      else if (provider === 'apple') void appleMusicProvider.search(query.trim(), controller.signal, appleMusicCatalogConfigured).then(setApple).catch(reportError).finally(finish);
      else void spotifyProvider.search(query.trim(), controller.signal).then(setSpotify).catch(reportError).finally(finish);
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); if (youtubeSearchRequest.current === controller) youtubeSearchRequest.current = null; youtubePageRequest.current?.abort(); };
  }, [normalized, query, provider, statuses, retry, voiceAwaitingReview, appleMusicCatalogConfigured]);

  const loadMoreYouTube = () => {
    if (!youtubeNextPageToken || youtubePageInFlight.current || provider !== 'youtube') return;
    const controller = new AbortController();
    youtubePageRequest.current?.abort();
    youtubePageRequest.current = controller;
    youtubePageInFlight.current = true;
    setYoutubePageLoading(true);
    setYoutubePageError('');
    void youtubeProvider.search(query.trim(), controller.signal, youtubeNextPageToken).then((page) => {
      if (controller.signal.aborted) return;
      const seen = new Set(youtube.map((item) => item.id));
      const combined = [...youtube, ...page.results.filter((item) => !seen.has(item.id))];
      setYoutube(combined);
      if (universal.activeVideo) universal.setVideoQueue(combined);
      setYoutubeNextPageToken(page.nextPageToken);
    }).catch((error: unknown) => {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
      setYoutubePageError(error instanceof Error ? error.message : 'Could not load more YouTube results. Try again.');
    }).finally(() => {
      if (!controller.signal.aborted) {
        youtubePageInFlight.current = false;
        setYoutubePageLoading(false);
      }
    });
  };

  useEffect(() => () => recognition.current?.abort(), []);
  const toggleVoiceInput = () => {
    if (listening) { recognition.current?.stop(); return; }
    if (!Recognition) { setVoiceMessage('Voice search is not supported in this browser. Type your search instead.'); return; }
    try {
      const instance = new Recognition();
      instance.lang = navigator.language || 'en-US'; instance.continuous = false; instance.interimResults = true;
      instance.onresult = (event) => {
        let transcript = ''; let finalTranscript = '';
        for (let index = 0; index < event.results.length; index++) {
          transcript += `${event.results[index][0]?.transcript ?? ''} `;
          if (event.results[index].isFinal) finalTranscript += `${event.results[index][0]?.transcript ?? ''} `;
        }
        if (transcript.trim()) setQuery(transcript.trim());
        if (finalTranscript.trim()) { setQuery(finalTranscript.trim()); setVoiceAwaitingReview(true); setVoiceMessage('Review and edit the recognized phrase before searching.'); }
      };
      instance.onerror = (event) => { setVoiceMessage(event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'Microphone permission was denied. Allow it in browser settings, or type your search.' : event.error === 'no-speech' ? 'No speech was recognized. Try again or type your search.' : `Voice search could not start (${event.error}).`); setListening(false); };
      instance.onend = () => setListening(false);
      recognition.current = instance; setVoiceAwaitingReview(false); setVoiceMessage('Voice recognition starts only after you press the microphone. Review or edit the result before searching.'); instance.start(); setListening(true);
    } catch (error) { setListening(false); setVoiceMessage(error instanceof Error ? `Voice search could not start: ${error.message}` : 'Voice search could not start.'); }
  };

  const clearSearch = () => {
    youtubeSearchRequest.current?.abort();
    youtubePageRequest.current?.abort();
    youtubeSearchRequest.current = null;
    youtubePageRequest.current = null;
    youtubePageInFlight.current = false;
    setQuery(''); setVoiceAwaitingReview(false); setErrors(EMPTY_ERRORS); setLoading(EMPTY_LOADING);
    setYoutube([]); setYoutubeNextPageToken(null); setYoutubePageError(''); setYoutubePageLoading(false);
    setApple([]); setSpotify([]);
    youtubeInput.current?.focus();
  };

  const submitSearch = (event?: FormEvent) => { event?.preventDefault(); setTab('search'); setVoiceAwaitingReview(false); rememberSearch(query); };
  const finishSelection = () => { if (!embedded) close(); };
  const playLocal = (index: number) => { universal.closeAudio(); universal.closeVideo(); localPlayer.play(index); finishSelection(); };
  const asAudioTrack = (result: (typeof apple)[number]): AudioCatalogTrack => ({
    id: result.id,
    title: result.title,
    artist: result.artist,
    album: result.album,
    image: result.image,
    durationSeconds: result.durationSeconds,
    audioUrl: result.previewUrl,
    trackUrl: result.trackUrl,
    provider: result.catalogSource === 'iTunes Store' ? 'iTunes Store' : 'Apple Music',
    playbackKind: result.playbackKind === 'subscription' ? 'subscription' : 'preview',
    genre: result.genre,
    releaseDate: result.releaseDate,
    explicit: result.explicit,
  });
  const playExternal = (track: AudioCatalogTrack) => {
    const playableSequence = apple
      .filter((result) => result.playbackKind === 'subscription' || (result.playbackKind === 'preview' && Boolean(result.previewUrl)))
      .map(asAudioTrack);
    universal.playAudio(track, playableSequence);
    finishSelection();
  };
  const selectVideo = (video: YouTubeResult) => {
    if (video.embeddingStatus === 'blocked') {
      universal.selectVideo(video, youtube);
      universal.setError('This video owner has disabled embedded playback. Open it on YouTube instead.');
    } else universal.playVideo(video, youtube);
    finishSelection();
  };
  const statusMessage = (selected: Provider) => statuses[selected] === 'checking' ? `Checking ${selected} configuration…` : statuses[selected] === 'unconfigured' ? selected === 'youtube' ? 'YOUTUBE_DATA_API_KEY is missing from this server. In Vercel, add it to Project Settings → Environment Variables for Production, then redeploy.' : selected === 'spotify' ? 'Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to the server to enable Spotify catalog metadata search.' : 'Apple catalog search is unavailable on this server.' : '';
  const selectedStatus = provider === 'library' ? 'ready' : statuses[provider];
  const selectedLoading = provider !== 'library' && loading[provider];
  const selectedError = provider !== 'library' && errors[provider];
  const resultCount = provider === 'library' ? matchingTracks.length : provider === 'youtube' ? youtube.length : provider === 'apple' ? apple.length : spotify.length;
  const noResults = normalized.length >= 2 && provider !== 'library' && selectedStatus === 'ready' && !selectedLoading && !selectedError && resultCount === 0;
  const resultHeading = provider === 'youtube' ? 'YouTube videos' : provider === 'apple' ? 'Apple Music catalog' : provider === 'spotify' ? 'Spotify catalog' : 'My AAK Music library';

  const content = <div ref={box} className={`mx-auto min-w-0 ${embedded ? 'max-w-6xl' : 'max-w-4xl'} px-4 ${embedded ? 'py-5 sm:px-6 sm:py-6' : 'pb-28 pt-20 sm:px-8 sm:pt-24'}`}>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div><p className="mb-1 text-[10px] font-mono uppercase tracking-[.2em] text-cyan">AAK MUSIC · DISCOVER</p><h2 className="font-display text-xl font-bold sm:text-2xl">Universal music search</h2><p className="mt-1 text-xs text-bone/50">Search one catalog at a time. Results and playback support are labeled by source.</p></div>
      <div className="flex gap-2" role="tablist" aria-label="Player panels"><button type="button" role="tab" aria-selected={tab === 'search'} onClick={() => setTab('search')} className={`min-h-10 rounded-full px-4 text-[10px] font-mono ${tab === 'search' ? 'bg-cyan font-bold text-ink' : 'border border-bone/15 text-bone/60 hover:border-cyan'}`}>SEARCH</button><button type="button" role="tab" aria-selected={tab === 'downloads'} onClick={() => setTab('downloads')} className={`min-h-10 rounded-full px-4 text-[10px] font-mono ${tab === 'downloads' ? 'bg-cyan font-bold text-ink' : 'border border-bone/15 text-bone/60 hover:border-cyan'}`}>DOWNLOADS</button></div>
    </div>
    {tab === 'downloads' ? <DownloadPanel /> : <>
      <div role="tablist" aria-label="Search provider" className="mb-3 flex min-w-0 flex-wrap gap-2">
        {SEARCH_PROVIDERS.map((item) => {
          const status = item.id === 'library' ? '7 tracks' : item.id === 'apple' && statuses.apple === 'ready' && !appleMusicCatalogConfigured ? 'iTunes preview fallback' : statuses[item.id];
          return <button key={item.id} type="button" role="tab" aria-selected={provider === item.id} onClick={() => setProvider(item.id)} className={`min-h-10 rounded-full border px-3 text-[10px] font-mono transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan sm:px-4 ${provider === item.id ? 'border-cyan/50 bg-cyan/12 text-cyan' : 'border-bone/12 text-bone/60 hover:border-bone/25 hover:text-bone'}`}>
            {item.label}<span className={`ml-2 text-[9px] ${provider === item.id ? 'text-cyan/75' : 'text-bone/35'}`}>{status === 'checking' ? 'checking' : status === 'ready' ? 'ready' : status}</span>
          </button>;
        })}
      </div>
      <form onSubmit={submitSearch}>
        <label htmlFor={embedded ? 'player-universal-search' : 'universal-music-search'} className="sr-only">Search {provider === 'youtube' ? 'YouTube videos' : provider === 'apple' ? 'Apple Music' : provider === 'spotify' ? 'Spotify' : 'the AAK Music library'}</label>
        <div className="group flex min-h-14 min-w-0 items-center gap-1 rounded-2xl border border-bone/15 bg-raised/50 px-2 shadow-sm transition-colors focus-within:border-bone/40 focus-within:shadow-[0_0_0_3px_rgb(var(--fg)/.07)] sm:min-h-16 sm:gap-3 sm:px-4">
          <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-bone/45" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <input ref={youtubeInput} id={embedded ? 'player-universal-search' : 'universal-music-search'} data-autofocus={!embedded || undefined} list={embedded ? 'player-search-suggestions' : 'aak-search-suggestions'} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && voiceAwaitingReview) { event.preventDefault(); submitSearch(); } else if (event.key === 'ArrowDown') { event.preventDefault(); box.current?.querySelector<HTMLElement>('ul button, ul a')?.focus(); } }} placeholder={provider === 'youtube' ? 'Search YouTube songs, artists, or videos…' : provider === 'apple' ? 'Search Apple Music songs or artists…' : provider === 'spotify' ? 'Search Spotify songs or artists…' : 'Search your AAK releases…'} autoComplete="off" className="min-h-10 min-w-0 flex-1 appearance-none border-0 bg-transparent py-3 font-display text-base font-semibold text-bone outline-none ring-0 placeholder:text-bone/40 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 sm:min-h-11 sm:text-lg" />
                    {query.length > 0 && <button type="button" onClick={clearSearch} aria-label="Clear search" title="Clear search" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-bone/10 text-bone/55 transition hover:border-bone/30 hover:text-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan sm:h-11 sm:w-11"><svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="m18 6-12 12M6 6l12 12" /></svg></button>}<datalist id={embedded ? 'player-search-suggestions' : 'aak-search-suggestions'}>{[...history, ...tracks.map((track) => track.title), ...artists.map((artist) => artist.name), ...genres.map((genre) => genre.name)].map((term, index) => <option key={`${term}-${index}`} value={term} />)}</datalist>
          <button type="button" onClick={toggleVoiceInput} disabled={!Recognition} aria-label={listening ? 'Stop voice input' : Recognition ? 'Start voice input' : 'Voice input unavailable'} aria-pressed={listening} title={Recognition ? (listening ? 'Stop listening' : 'Search by voice') : 'Voice input is not supported'} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone/50 disabled:cursor-not-allowed disabled:opacity-45 sm:h-11 sm:w-11 ${listening ? 'border-cyan/50 bg-cyan/10 text-cyan' : 'border-bone/10 text-bone/60 hover:border-bone/30 hover:text-bone'}`}>
            <svg aria-hidden="true" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8" /></svg>
          </button>
          <button type="submit" aria-label={`Search ${resultHeading}`} title="Search" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan text-ink transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone/60 sm:h-11 sm:w-auto sm:px-5"><svg aria-hidden="true" className="h-4 w-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg><span className="hidden text-xs font-bold sm:inline">Search</span></button>
        </div>
      </form>
      <div className="mt-2 flex min-h-5 flex-wrap items-center justify-between gap-2 text-[10px] text-bone/45"><p>{normalized.length >= 2 ? `${resultCount} ${provider === 'library' ? 'AAK tracks' : provider === 'youtube' ? 'YouTube results loaded' : `${resultHeading.toLocaleLowerCase()} shown`}${selectedLoading ? ' · searching…' : ''}` : provider === 'library' ? 'Search titles, artist, genre, and available AAK track metadata.' : `Search only the ${resultHeading} catalog. Provider results are never substituted.`}</p>{provider !== 'library' && <span>{resultHeading} · {selectedStatus}</span>}</div>
      {provider === 'apple' && !appleMusicKitConfigured && statuses.apple === 'ready' && <p role="status" className="mt-1 text-[10px] leading-5 text-bone/45">{appleMusicCatalogConfigured ? 'Apple catalog results use the official API. Full playback additionally needs an allowed MusicKit origin and user authorization.' : 'These results come from Apple’s iTunes preview catalog. Full Apple Music playback requires a developer token, an allowed site origin, and user authorization.'}</p>}
      {(voiceMessage || !Recognition) && <p role="status" className="mt-2 text-xs leading-5 text-bone/55">{listening ? 'Listening… ' : ''}{voiceMessage || 'Voice search is unavailable in this browser. Keyboard search remains enabled.'}</p>}
      {voiceAwaitingReview && <button type="button" onClick={() => submitSearch()} className="mt-2 min-h-10 rounded-full bg-cyan px-4 text-xs font-mono font-bold text-ink">Search spoken phrase</button>}
      {normalized.length < 2 && <>
        {!!history.length && <><H>Recent searches</H><div className="flex flex-wrap gap-2">{history.map((term) => <button key={term} type="button" onClick={() => setQuery(term)} className="min-h-9 rounded-full border border-bone/10 px-3 text-xs text-bone/60 hover:border-cyan hover:text-cyan">{term}</button>)}</div></>}
        {provider === 'library' ? <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-bone/50">All seven AAK releases are indexed for title, artist, genre, and metadata search.</p><button type="button" aria-expanded={browseLocal} onClick={() => setBrowseLocal((value) => !value)} className="min-h-9 rounded-full border border-bone/12 px-3 text-[10px] font-mono text-bone/60 hover:border-cyan hover:text-cyan">{browseLocal ? 'HIDE AAK LIBRARY' : 'BROWSE AAK LIBRARY'}</button></div> : <p className="mt-3 text-xs text-bone/50">Enter at least two characters to search {resultHeading}.</p>}
        {provider === 'library' && browseLocal && <ul className="m-0 mt-2 list-none p-0">{tracks.map((track, index) => <LocalResult key={track.id} index={index} onPlay={playLocal} onQueue={() => universal.addToUserQueue(track)} isPlaying={universal.currentItem.id === track.id && (universal.playing || localPlayer.playing)} />)}</ul>}
      </>}
      {normalized.length >= 2 && provider === 'library' && <section className="min-w-0"><H>AAK Music library · {matchingTracks.length}</H>{matchingTracks.length ? <ul className="m-0 list-none p-0">{matchingTracks.map(({ track, index }) => <LocalResult key={track.id} index={index} onPlay={playLocal} onQueue={() => universal.addToUserQueue(track)} isPlaying={universal.currentItem.id === track.id && (universal.playing || localPlayer.playing)} />)}</ul> : <p className="text-xs text-bone/45">No AAK library matches. Check the title, artist, genre, or track metadata.</p>}
        {!!(matchingArtists.length || matchingGenres.length || matchingEvents.length) && <div className="mt-4 flex flex-wrap gap-2">{matchingArtists.map((artist) => <button type="button" key={artist.id} onClick={() => { openArtist(artist.id); finishSelection(); }} className="min-h-9 rounded-full border border-bone/10 px-3 text-xs text-bone/60">Artist · {artist.name}</button>)}{matchingGenres.map((genre) => <button type="button" key={genre.id} onClick={() => { finishSelection(); document.getElementById('releases')?.scrollIntoView({ behavior: 'smooth' }); }} className="min-h-9 rounded-full border border-bone/10 px-3 text-xs text-bone/60">Genre · {genre.name}</button>)}{matchingEvents.map((event) => <button type="button" key={event.id} onClick={() => { openEvent(event.id); finishSelection(); }} className="min-h-9 rounded-full border border-bone/10 px-3 text-xs text-bone/60">Event · {event.name}</button>)}</div>}
      </section>}
      {normalized.length >= 2 && provider !== 'library' && <section aria-label={`${resultHeading} search results`} className="mt-3 min-w-0 overflow-hidden rounded-2xl border border-bone/12 bg-void/55">
        <header className="sticky top-0 z-10 flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-bone/10 bg-raised px-3 py-3 sm:px-4">
          <div className="min-w-0"><h3 className="font-display text-sm font-bold">{resultHeading}</h3><p className="mt-0.5 text-[10px] text-bone/55">{resultCount} {provider === 'youtube' ? 'videos loaded' : 'results'}</p></div>
          <p aria-live="polite" role={selectedError ? 'alert' : 'status'} className={`shrink-0 text-[10px] font-mono ${selectedError ? 'text-amber-200' : selectedLoading ? 'text-cyan' : 'text-bone/45'}`}>{selectedLoading ? 'SEARCHING' : selectedError ? 'SEARCH ERROR' : selectedStatus === 'ready' ? 'READY' : selectedStatus.toUpperCase()}</p>
        </header>
        <div role="region" aria-label={`Scrollable ${resultHeading} results`} tabIndex={0} className="max-h-[min(54svh,36rem)] min-w-0 overflow-y-auto overscroll-contain px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan sm:px-4">
        {selectedStatus === 'checking' && <p role="status" className="text-xs text-bone/50">Checking {resultHeading} configuration…</p>}
        {selectedStatus === 'unconfigured' && <p role="status" className="rounded-xl border border-bone/10 bg-raised/25 p-3 text-xs leading-5 text-bone/55">{statusMessage(provider)}{provider === 'youtube' && ' Enable YouTube Data API v3 in Google Cloud. Search and embed playback are separate; video owners can prohibit embedding.'}{provider === 'spotify' && ' Catalog search requires server-side Client Credentials; this does not authorize full Spotify playback.'}</p>}
        {selectedStatus === 'unavailable' && <p role="status" className="text-xs leading-5 text-bone/55">{provider === 'youtube' ? 'The same-origin /api/youtube-search endpoint could not be reached. Verify that Vercel deployed api/youtube-search.ts. If the endpoint responds but is unconfigured, set YOUTUBE_DATA_API_KEY in the Vercel Production environment and redeploy.' : `${resultHeading} is unavailable right now. Retry this provider or choose another source.`}</p>}
        {selectedLoading && <p role="status" className="text-xs text-bone/50">Searching {resultHeading}…</p>}
        {selectedError && <p role="alert" className="rounded-xl border border-amber-200/10 p-3 text-xs text-amber-100/80">{selectedError}</p>}
        {provider === 'youtube' && youtube.length > 0 && <ul className="m-0 list-none p-0">{youtube.map((video) => <YouTubeResultCard key={video.id} video={video} selected={universal.activeVideo?.id === video.id} playing={universal.activeVideo?.id === video.id && universal.videoPlaying} onSelect={() => selectVideo(video)} onQueue={() => universal.addToUserQueue(video)} />)}</ul>}
        {provider === 'youtube' && youtubeNextPageToken && <div className="mt-4 flex flex-col items-center gap-2"><button type="button" onClick={loadMoreYouTube} disabled={youtubePageLoading || selectedLoading} className="min-h-11 rounded-full border border-cyan/40 bg-cyan/10 px-5 text-xs font-semibold text-cyan transition hover:bg-cyan/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-wait disabled:opacity-55">{youtubePageLoading ? 'Loading more videos…' : 'Load more videos'}</button><p className="text-center text-[10px] text-bone/40">YouTube ranks and paginates results; this list is not every video.</p></div>}
        {provider === 'youtube' && youtubePageError && <div className="mt-3 rounded-xl border border-amber-200/10 p-3"><p role="alert" className="text-xs text-amber-100/80">{youtubePageError}</p><button type="button" onClick={loadMoreYouTube} disabled={youtubePageLoading} className="mt-2 min-h-9 rounded-full border border-bone/15 px-3 text-xs text-bone/70 hover:border-cyan hover:text-cyan disabled:opacity-50">Retry loading more</button></div>}
        {provider === 'apple' && apple.length > 0 && <ul className="m-0 list-none p-0">{apple.map((track) => {
          const audioTrack: AudioCatalogTrack = { id: track.id, title: track.title, artist: track.artist, album: track.album, image: track.image, durationSeconds: track.durationSeconds, audioUrl: track.previewUrl, trackUrl: track.trackUrl, provider: track.catalogSource === 'iTunes Store' ? 'iTunes Store' : 'Apple Music', playbackKind: track.playbackKind === 'external only' ? 'preview' : track.playbackKind, genre: track.genre, releaseDate: track.releaseDate, explicit: track.explicit };
          return <AppleResult key={`${track.catalogSource}:${track.id}`} track={track} onPlay={() => playExternal(audioTrack)} onPreview={() => playExternal({ ...audioTrack, playbackKind: 'preview' })} onQueue={() => universal.addToUserQueue(audioTrack)} isPlaying={universal.activeAudio?.id === track.id && universal.playing} />;
        })}</ul>}
        {provider === 'spotify' && spotify.length > 0 && <ul className="m-0 list-none p-0">{spotify.map((track) => <SpotifyResult key={track.id} track={track} />)}</ul>}
        {noResults && <p className="rounded-xl border border-bone/10 p-4 text-sm text-bone/55">No {resultHeading.toLocaleLowerCase()} matched “{query.trim()}”. Try another title or artist.</p>}
        {selectedError && <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-3 min-h-10 rounded-full border border-bone/15 px-4 text-xs text-bone/60 hover:border-cyan hover:text-cyan">Retry {resultHeading}</button>}
        {(selectedStatus === 'unconfigured' || selectedStatus === 'unavailable') && <button type="button" onClick={() => setStatusCheckRetry((value) => value + 1)} className="mt-3 min-h-10 rounded-full border border-bone/15 px-4 text-xs text-bone/60 hover:border-cyan hover:text-cyan">Retry provider configuration</button>}
        </div>
      </section>}
      {provider === 'spotify' && normalized.length >= 2 && <p className="mt-4 text-[10px] leading-5 text-bone/40">Spotify catalog entries are metadata with an official link unless a separately authorized playback session is available. No preview is presented as a full song.</p>}
      {provider === 'apple' && normalized.length >= 2 && <p className="mt-4 text-[10px] leading-5 text-bone/40">Apple preview audio plays only when a preview URL is supplied. Subscriber playback requires MusicKit authorization and an eligible account.</p>}
      {provider === 'youtube' && normalized.length >= 2 && <p className="mt-4 text-[10px] leading-5 text-bone/40">YouTube playback uses the official visible IFrame player; this site does not provide audio-only playback. Results are relevance-ranked and available page by page from YouTube.</p>}
    </>}
  </div>;

  if (embedded) return <section aria-label="Universal music search" className="min-w-0 rounded-3xl border border-bone/12 bg-ink/75 shadow-xl backdrop-blur-xl">{content}</section>;
  return <Dialog label="Universal music search and downloads" onClose={close}><div className="drop h-full overflow-y-auto bg-ink/95"><Close onClose={close} />{content}</div></Dialog>;
}
export default memo(Search);
