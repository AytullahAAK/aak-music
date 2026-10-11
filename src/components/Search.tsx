import { memo, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Dialog, { Close } from './Dialog';
import Art from './Art';
import { artists, events, genres, tracks } from '../data';
import { useUI } from '../hooks/useUI';
import { usePlayer } from '../hooks/usePlayer';
import { useUniversalPlayer } from '../hooks/useUniversalPlayer';
import { appleMusicProvider, checkAppleCatalog, checkAppleMusicKitConfiguration, checkSpotifyConfiguration, checkYouTubeConfiguration, spotifyProvider, youtubeProvider } from '../services/music/discovery';
import type { AppleMusicResult, AudioCatalogTrack, SpotifyTrackResult, YouTubeResult } from '../services/music/types';

type ProviderStatus = 'checking' | 'ready' | 'unconfigured' | 'unavailable';
type Provider = 'youtube' | 'apple' | 'spotify';
type Statuses = Record<Provider, ProviderStatus>;
type Loading = Record<Provider, boolean>;
type Errors = Record<Provider, string>;

const PROVIDERS: Provider[] = ['youtube', 'apple', 'spotify'];
const EMPTY_LOADING: Loading = { youtube: false, apple: false, spotify: false };
const EMPTY_ERRORS: Errors = { youtube: '', apple: '', spotify: '' };
const SEARCH_HISTORY_KEY = 'aak_music_search_history';
const H = ({ children }: { children: React.ReactNode }) => <h3 className="mb-3 mt-7 text-[10px] font-mono uppercase tracking-[.18em] text-bone/55">{children}</h3>;
const duration = (seconds: number | null | undefined) => !seconds || seconds <= 0 ? '' : `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const key = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]/g, '');

function sameVersion(a: { title: string; artist: string; durationSeconds: number | null }, b: { title: string; artist: string; durationSeconds: number | null }) {
  return key(a.title) === key(b.title) && key(a.artist) === key(b.artist) &&
    (a.durationSeconds == null || b.durationSeconds == null || Math.abs(a.durationSeconds - b.durationSeconds) <= 15);
}

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

function LocalResult({ index, onPlay }: { index: number; onPlay: (index: number) => void }) {
  const track = tracks[index];
  return <li className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-3 border-b border-bone/10 py-3">
    <Art a={track.a} b={track.b} image={track.image} className="h-14 w-14 rounded-lg object-cover" />
    <div className="min-w-0"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="break-words font-semibold">{track.title}</p><span className="text-[10px] font-mono text-bone/50">{duration(track.dur)}</span></div><p className="mt-1 text-sm text-bone/65">{track.artist} · {track.genre} · {track.bpm} BPM</p>
      <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => onPlay(index)} className="min-h-10 rounded-full bg-cyan px-4 text-xs font-bold text-ink">Play AAK release</button><span className="inline-flex min-h-10 items-center rounded-full border border-bone/10 px-3 text-[10px] text-bone/55">AAK Music · full release</span></div></div>
  </li>;
}

function AppleResult({ track, matchingVideo, matchingSpotify, onPlay, onPreview, onQueue, onWatch }: { track: AppleMusicResult; matchingVideo?: YouTubeResult; matchingSpotify?: SpotifyTrackResult; onPlay: () => void; onPreview: () => void; onQueue: () => void; onWatch?: () => void }) {
  return <li className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-3 border-b border-bone/10 py-3">
    {track.image ? <img src={track.image} alt="" loading="lazy" className="h-14 w-14 rounded-lg object-cover" /> : <span className="h-14 w-14 rounded-lg bg-raised" />}
    <div className="min-w-0"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="break-words font-semibold">{track.title}</p>{duration(track.durationSeconds) && <span className="text-[10px] font-mono text-bone/50">{duration(track.durationSeconds)} full track</span>}</div><p className="mt-1 break-words text-sm text-bone/65">{track.artist}{track.album ? ` · ${track.album}` : ''}</p>
      <p className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-bone/50"><span>{track.catalogSource === 'iTunes Store' ? 'iTunes Store · preview catalog' : 'Apple Music · catalog'}</span>{track.genre && <span>{track.genre}</span>}{track.releaseDate && <span>{track.releaseDate.slice(0, 10)}</span>}{track.explicit && <span>Explicit</span>}</p>
      <div className="mt-2 flex flex-wrap gap-2">{track.playbackKind === 'subscription' && <button type="button" onClick={onPlay} className="min-h-10 rounded-full bg-cyan px-4 text-xs font-bold text-ink">Play in Apple Music</button>}{track.previewUrl && <><button type="button" onClick={onPreview} className="min-h-10 rounded-full border border-cyan/30 px-4 text-xs font-bold text-cyan">{track.playbackKind === 'subscription' ? 'Play preview' : 'Play preview'}</button><button type="button" onClick={onQueue} className="min-h-10 rounded-full border border-bone/15 px-3 text-xs hover:border-cyan hover:text-cyan">Queue preview</button></>}{track.playbackKind === 'external only' && <span className="inline-flex min-h-10 items-center rounded-full border border-bone/10 px-3 text-xs text-bone/50">No playable preview</span>}<a href={track.trackUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-bone/15 px-3 text-xs hover:border-cyan hover:text-cyan">Open Apple Music ↗</a>{matchingVideo?.embeddable && onWatch && <button type="button" onClick={onWatch} className="min-h-10 rounded-full border border-bone/15 px-3 text-xs hover:border-cyan hover:text-cyan">Watch matching YouTube</button>}{matchingSpotify && <a href={matchingSpotify.trackUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-bone/15 px-3 text-xs hover:border-cyan hover:text-cyan">Spotify version ↗</a>}</div>
      {track.playbackKind === 'preview' && <p className="mt-1 text-[10px] text-bone/45">Preview only; playable length is read from the loaded preview.</p>}{track.playbackKind === 'subscription' && <p className="mt-1 text-[10px] text-bone/45">Full playback requires Apple Music authorization and an eligible subscription.</p>}
    </div>
  </li>;
}

function YouTubeResultCard({ video, matchingAudio, matchingSpotify, onWatch, onPlayAudio }: { video: YouTubeResult; matchingAudio?: AudioCatalogTrack; matchingSpotify?: SpotifyTrackResult; onWatch: () => void; onPlayAudio?: () => void }) {
  return <li className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 border-b border-bone/10 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
    {video.thumbnail ? <img src={video.thumbnail} alt="" loading="lazy" className="aspect-video w-full rounded-lg object-cover" /> : <span className="aspect-video rounded-lg bg-raised" />}
    <div className="min-w-0"><p className="break-words font-semibold">{video.title}</p><p className="mt-1 break-words text-sm text-bone/65">{video.artist}{duration(video.durationSeconds) ? ` · ${duration(video.durationSeconds)}` : ''}</p><p className="mt-1 text-[10px] text-bone/50">YouTube video · official embedded playback only</p>
      <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={onWatch} disabled={!video.embeddable} className="min-h-10 rounded-full bg-cyan px-4 text-xs font-bold text-ink disabled:opacity-40">{video.embeddable ? 'Watch in player' : video.embeddingStatus === 'unknown' ? 'Embedding not verified' : 'Embedding unavailable'}</button><a href={video.watchUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-bone/15 px-3 text-xs hover:border-cyan hover:text-cyan">Open on YouTube ↗</a></div>
      {matchingAudio && onPlayAudio && <button type="button" onClick={onPlayAudio} className="mt-2 min-h-10 rounded-full border border-cyan/30 px-3 text-xs text-cyan">{matchingAudio.playbackKind === 'subscription' ? 'Play matching Apple Music' : 'Play matching Apple preview'}</button>}{matchingSpotify && <a href={matchingSpotify.trackUrl} target="_blank" rel="noreferrer" className="ml-2 inline-flex min-h-10 items-center rounded-full border border-bone/15 px-3 text-xs hover:border-cyan hover:text-cyan">Spotify version ↗</a>}
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
  const [tab, setTab] = useState<'search' | 'downloads'>('search');
  const [browseLocal, setBrowseLocal] = useState(false);
  const { close, openArtist, openEvent } = useUI();
  const localPlayer = usePlayer();
  const universal = useUniversalPlayer();
  const box = useRef<HTMLDivElement>(null);
  const [statuses, setStatuses] = useState<Statuses>({ youtube: 'checking', apple: 'checking', spotify: 'checking' });
  const [appleMusicKitConfigured, setAppleMusicKitConfigured] = useState(false);
  const [apple, setApple] = useState<AppleMusicResult[]>([]);
  const [youtube, setYoutube] = useState<YouTubeResult[]>([]);
  const [spotify, setSpotify] = useState<SpotifyTrackResult[]>([]);
  const [loading, setLoading] = useState<Loading>(EMPTY_LOADING);
  const [errors, setErrors] = useState<Errors>(EMPTY_ERRORS);
  const [retry, setRetry] = useState(0);
  const [listening, setListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState('');
  const [voiceAwaitingReview, setVoiceAwaitingReview] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]') as string[]; } catch { return []; }
  });
  const recognition = useRef<SpeechRecognitionLike | null>(null);
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
    void Promise.allSettled([checkYouTubeConfiguration(controller.signal), checkAppleCatalog(controller.signal), checkSpotifyConfiguration(controller.signal), checkAppleMusicKitConfiguration(controller.signal)])
      .then(([yt, ap, sp, musicKit]) => {
        if (controller.signal.aborted) return;
        setStatuses({
          youtube: yt.status === 'fulfilled' ? (yt.value ? 'ready' : 'unconfigured') : 'unavailable',
          apple: ap.status === 'fulfilled' ? (ap.value ? 'ready' : 'unconfigured') : 'unavailable',
          spotify: sp.status === 'fulfilled' ? (sp.value ? 'ready' : 'unconfigured') : 'unavailable',
        });
        setAppleMusicKitConfigured(musicKit.status === 'fulfilled' && musicKit.value);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setApple([]); setYoutube([]); setSpotify([]); setErrors(EMPTY_ERRORS);
    const ready: Loading = { youtube: statuses.youtube === 'ready', apple: statuses.apple === 'ready', spotify: statuses.spotify === 'ready' };
    if (normalized.length < 2 || voiceAwaitingReview) { setLoading(EMPTY_LOADING); return; }
    setLoading(ready);
    if (!Object.values(ready).some(Boolean)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      rememberSearch(query);
      const reportError = (provider: Provider, error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        setErrors((current) => ({ ...current, [provider]: error instanceof Error ? error.message : 'Search failed. Try again.' }));
      };
      if (ready.apple) void appleMusicProvider.search(query.trim(), controller.signal).then(setApple).catch((error: unknown) => reportError('apple', error)).finally(() => { if (!controller.signal.aborted) setLoading((current) => ({ ...current, apple: false })); });
      if (ready.youtube) void youtubeProvider.search(query.trim(), controller.signal).then(setYoutube).catch((error: unknown) => reportError('youtube', error)).finally(() => { if (!controller.signal.aborted) setLoading((current) => ({ ...current, youtube: false })); });
      if (ready.spotify) void spotifyProvider.search(query.trim(), controller.signal).then(setSpotify).catch((error: unknown) => reportError('spotify', error)).finally(() => { if (!controller.signal.aborted) setLoading((current) => ({ ...current, spotify: false })); });
    }, 500);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [normalized, query, statuses, retry, voiceAwaitingReview]);

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

  const submitSearch = (event?: FormEvent) => { event?.preventDefault(); setTab('search'); setVoiceAwaitingReview(false); rememberSearch(query); };
  const finishSelection = () => { if (!embedded) close(); };
  const playLocal = (index: number) => { universal.closeAudio(); universal.closeVideo(); localPlayer.play(index); finishSelection(); };
  const playExternal = (track: AudioCatalogTrack) => { universal.playAudio(track); finishSelection(); };
  const watchVideo = (video: YouTubeResult) => { universal.playVideo(video); finishSelection(); };
  const findVideo = (track: AppleMusicResult) => youtube.find((video) => sameVersion(track, video));
  const matchSpotify = (track: { title: string; artist: string; durationSeconds: number | null }) => spotify.find((item) => sameVersion(track, item));
  const matchedSpotifyIds = new Set<string>();
  const matchSpotifyForApple = apple.map((item) => matchSpotify(item)).filter((item): item is SpotifyTrackResult => Boolean(item));
  const matchSpotifyForYoutube = youtube.map((item) => matchSpotify(item)).filter((item): item is SpotifyTrackResult => Boolean(item));
  matchSpotifyForApple.concat(matchSpotifyForYoutube).forEach((item) => matchedSpotifyIds.add(item.id));
  const unmatchedSpotify = spotify.filter((item) => !matchedSpotifyIds.has(item.id));
  const matchAppleForYoutube = (video: YouTubeResult) => apple.find((item) => Boolean(item.previewUrl) || item.playbackKind === 'subscription' ? sameVersion(video, item) : false);
  const loadingAny = Object.values(loading).some(Boolean);
  const resultsCount = matchingTracks.length + apple.length + youtube.length + unmatchedSpotify.length;
  const statusesChecked = Object.values(statuses).every((status) => status !== 'checking');
  const errorsCount = Object.values(errors).filter(Boolean).length;
  const noResults = normalized.length >= 2 && statusesChecked && !loadingAny && !voiceAwaitingReview && resultsCount === 0 && errorsCount === 0;
  const statusMessage = (provider: Provider) => statuses[provider] === 'checking' ? `Checking ${provider} configuration…` : statuses[provider] === 'unconfigured' ? provider === 'youtube' ? 'Add YOUTUBE_DATA_API_KEY to the server to enable official YouTube search.' : 'Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to the server to enable catalog metadata search.' : '';

  const content = <div ref={box} className={`mx-auto min-w-0 ${embedded ? 'max-w-6xl' : 'max-w-4xl'} px-4 ${embedded ? 'py-5 sm:px-6 sm:py-6' : 'pb-28 pt-20 sm:px-8 sm:pt-24'}`}>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div><p className="mb-1 text-[10px] font-mono uppercase tracking-[.2em] text-cyan">AAK MUSIC · DISCOVER</p><h2 className="font-display text-xl font-bold sm:text-2xl">Universal music search</h2><p className="mt-1 text-xs text-bone/50">AAK releases · Apple previews · YouTube videos · Spotify catalog</p></div>
      <div className="flex gap-2" role="tablist" aria-label="Player panels"><button role="tab" aria-selected={tab === 'search'} onClick={() => setTab('search')} className={`min-h-10 rounded-full px-4 text-[10px] font-mono ${tab === 'search' ? 'bg-cyan font-bold text-ink' : 'border border-bone/15 text-bone/60 hover:border-cyan'}`}>SEARCH</button><button role="tab" aria-selected={tab === 'downloads'} onClick={() => setTab('downloads')} className={`min-h-10 rounded-full px-4 text-[10px] font-mono ${tab === 'downloads' ? 'bg-cyan font-bold text-ink' : 'border border-bone/15 text-bone/60 hover:border-cyan'}`}>DOWNLOADS</button></div>
    </div>
    {tab === 'downloads' ? <DownloadPanel /> : <>
      <form onSubmit={submitSearch}>
        <label htmlFor={embedded ? 'player-universal-search' : 'universal-music-search'} className="sr-only">Search songs by title, artist, album, or keyword</label>
        <div className="group flex min-h-14 min-w-0 items-center gap-1 rounded-2xl border border-bone/15 bg-raised/50 px-2 shadow-sm transition-colors focus-within:border-bone/40 focus-within:shadow-[0_0_0_3px_rgb(var(--fg)/.07)] sm:min-h-16 sm:gap-3 sm:px-4">
          <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-bone/45" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <input id={embedded ? 'player-universal-search' : 'universal-music-search'} data-autofocus={!embedded || undefined} list={embedded ? 'player-search-suggestions' : 'aak-search-suggestions'} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && voiceAwaitingReview) { event.preventDefault(); submitSearch(); } else if (event.key === 'ArrowDown') { event.preventDefault(); box.current?.querySelector<HTMLElement>('ul button, ul a')?.focus(); } }} placeholder="Songs, artists, albums, keywords…" autoComplete="off" className="min-h-10 min-w-0 flex-1 appearance-none border-0 bg-transparent py-3 font-display text-base font-semibold text-bone outline-none ring-0 placeholder:text-bone/40 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 sm:min-h-11 sm:text-lg" />
          <datalist id={embedded ? 'player-search-suggestions' : 'aak-search-suggestions'}>{[...history, ...tracks.map((track) => track.title), ...artists.map((artist) => artist.name), ...genres.map((genre) => genre.name)].map((term, index) => <option key={`${term}-${index}`} value={term} />)}</datalist>
          <button type="button" onClick={toggleVoiceInput} disabled={!Recognition} aria-label={listening ? 'Stop voice input' : Recognition ? 'Start voice input' : 'Voice input unavailable'} aria-pressed={listening} title={Recognition ? (listening ? 'Stop listening' : 'Search by voice') : 'Voice input is not supported'} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone/50 disabled:cursor-not-allowed disabled:opacity-45 sm:h-11 sm:w-11 ${listening ? 'border-cyan/50 bg-cyan/10 text-cyan' : 'border-bone/10 text-bone/60 hover:border-bone/30 hover:text-bone'}`}>
            <svg aria-hidden="true" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8" /></svg>
          </button>
          <button type="submit" aria-label="Search" title="Search" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan text-ink transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone/60 sm:h-11 sm:w-auto sm:px-5"><svg aria-hidden="true" className="h-4 w-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg><span className="hidden text-xs font-bold sm:inline">Search</span></button>
        </div>
      </form>
      <div className="mt-2 flex min-h-5 flex-wrap items-center justify-between gap-2 text-[10px] text-bone/45"><p>{normalized.length >= 2 ? `${resultsCount} matching results${loadingAny ? ' · searching providers…' : ''}` : 'Search across your local library and available music catalogs.'}</p><div className="flex flex-wrap gap-x-3"><span>Apple {statuses.apple === 'ready' ? 'ready' : statuses.apple}</span><span>YouTube {statuses.youtube === 'ready' ? 'ready' : statuses.youtube}</span><span>Spotify {statuses.spotify === 'ready' ? 'ready' : statuses.spotify}</span></div></div>
      {!appleMusicKitConfigured && statuses.apple === 'ready' && <p role="status" className="mt-1 text-[10px] leading-5 text-bone/45">Apple MusicKit playback is unavailable for this site origin. Configure the Apple signing credentials and include this exact origin in APPLE_MUSIC_ALLOWED_ORIGINS. Catalog search and permitted previews remain available.</p>}
      {(voiceMessage || !Recognition) && <p role="status" className="mt-2 text-xs leading-5 text-bone/55">{listening ? 'Listening… ' : ''}{voiceMessage || 'Voice search is unavailable in this browser. Keyboard search remains enabled.'}</p>}
      {voiceAwaitingReview && <button type="button" onClick={() => submitSearch()} className="mt-2 min-h-10 rounded-full bg-cyan px-4 text-xs font-mono font-bold text-ink">Search spoken phrase</button>}

      {normalized.length < 2 && <>
        {!!history.length && <><H>Recent searches</H><div className="flex flex-wrap gap-2">{history.map((term) => <button key={term} type="button" onClick={() => setQuery(term)} className="min-h-9 rounded-full border border-bone/10 px-3 text-xs text-bone/60 hover:border-cyan hover:text-cyan">{term}</button>)}</div></>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-bone/50">All seven AAK releases are indexed for title, artist, genre, and metadata search.</p><button type="button" aria-expanded={browseLocal} onClick={() => setBrowseLocal((value) => !value)} className="min-h-9 rounded-full border border-bone/12 px-3 text-[10px] font-mono text-bone/60 hover:border-cyan hover:text-cyan">{browseLocal ? 'HIDE AAK LIBRARY' : 'BROWSE AAK LIBRARY'}</button></div>
        {browseLocal && <ul className="m-0 mt-2 list-none p-0">{tracks.map((track, index) => <LocalResult key={track.id} index={index} onPlay={playLocal} />)}</ul>}
      </>}
      {normalized.length >= 2 && <div className="mt-2 grid min-w-0 gap-7 lg:grid-cols-2">
        <section className="min-w-0"><H>AAK Music library · {matchingTracks.length}</H>{matchingTracks.length ? <ul className="m-0 list-none p-0">{matchingTracks.map(({ track, index }) => <LocalResult key={track.id} index={index} onPlay={playLocal} />)}</ul> : <p className="text-xs text-bone/40">No matching AAK tracks.</p>}
          {!!(matchingArtists.length || matchingGenres.length || matchingEvents.length) && <div className="mt-4 flex flex-wrap gap-2">{matchingArtists.map((artist) => <button type="button" key={artist.id} onClick={() => { openArtist(artist.id); finishSelection(); }} className="min-h-9 rounded-full border border-bone/10 px-3 text-xs text-bone/60">Artist · {artist.name}</button>)}{matchingGenres.map((genre) => <button type="button" key={genre.id} onClick={() => { finishSelection(); document.getElementById('releases')?.scrollIntoView({ behavior: 'smooth' }); }} className="min-h-9 rounded-full border border-bone/10 px-3 text-xs text-bone/60">Genre · {genre.name}</button>)}{matchingEvents.map((event) => <button type="button" key={event.id} onClick={() => { openEvent(event.id); finishSelection(); }} className="min-h-9 rounded-full border border-bone/10 px-3 text-xs text-bone/60">Event · {event.name}</button>)}</div>}
        </section>
        <section className="min-w-0"><H>Apple Music catalog · {apple.length}</H>{statuses.apple === 'checking' && <p role="status" className="text-xs text-bone/50">Checking Apple catalog…</p>}{statuses.apple === 'unavailable' && <p role="status" className="text-xs text-bone/50">Apple catalog is unavailable. Local search remains active.</p>}{loading.apple && <p role="status" className="text-xs text-bone/50">Searching Apple Music…</p>}{errors.apple && <p role="alert" className="text-xs text-amber-200">{errors.apple}</p>}{apple.length > 0 && <ul className="m-0 list-none p-0">{apple.map((track) => {
          const video = findVideo(track); const spotifyMatch = matchSpotify(track);
          const audioTrack: AudioCatalogTrack = { id: track.id, title: track.title, artist: track.artist, album: track.album, image: track.image, durationSeconds: track.durationSeconds, audioUrl: track.previewUrl, trackUrl: track.trackUrl, provider: track.catalogSource === 'iTunes Store' ? 'iTunes Store' : 'Apple Music', playbackKind: track.playbackKind === 'external only' ? 'preview' : track.playbackKind, genre: track.genre, releaseDate: track.releaseDate, explicit: track.explicit, ...(video ? { videoVersion: video } : {}) };
          const playTrack = () => { if (track.playbackKind === 'subscription') universal.playAudio(audioTrack); }; const previewTrack: AudioCatalogTrack = { ...audioTrack, playbackKind: 'preview' };
          return <AppleResult key={`${track.catalogSource}:${track.id}`} track={track} matchingVideo={video} matchingSpotify={spotifyMatch} onPlay={playTrack} onPreview={() => playExternal(previewTrack)} onQueue={() => universal.addToQueue(previewTrack)} onWatch={video?.embeddable ? () => watchVideo(video) : undefined} />;
        })}</ul>}{!loading.apple && !errors.apple && statuses.apple === 'ready' && normalized.length >= 2 && apple.length === 0 && <p className="text-xs text-bone/40">No Apple results.</p>}</section>
        <section className="min-w-0 lg:col-span-2"><H>YouTube · {youtube.length}</H>{statuses.youtube === 'checking' && <p role="status" className="text-xs text-bone/50">Checking YouTube configuration…</p>}{statuses.youtube === 'unconfigured' && <p className="rounded-xl border border-bone/10 bg-raised/25 p-3 text-xs leading-5 text-bone/55">{statusMessage('youtube')} Create a restricted API key in Google Cloud, enable YouTube Data API v3, and add it to the server environment. Search and embedded video playback are separate: embedding can still be disabled or restricted by YouTube.</p>}{statuses.youtube === 'unavailable' && <p role="status" className="text-xs text-bone/50">YouTube search could not reach the server. AAK and Apple results remain available.</p>}{loading.youtube && <p role="status" className="text-xs text-bone/50">Searching YouTube…</p>}{errors.youtube && <p role="alert" className="rounded-xl border border-amber-200/10 p-3 text-xs text-amber-100/80">{errors.youtube}</p>}{youtube.length > 0 && <ul className="m-0 list-none p-0">{youtube.map((video) => {
          const matchingApple = matchAppleForYoutube(video); const audio: AudioCatalogTrack | undefined = matchingApple && (matchingApple.previewUrl || matchingApple.playbackKind === 'subscription') ? { id: matchingApple.id, title: matchingApple.title, artist: matchingApple.artist, album: matchingApple.album, image: matchingApple.image, durationSeconds: matchingApple.durationSeconds, audioUrl: matchingApple.previewUrl, trackUrl: matchingApple.trackUrl, provider: matchingApple.catalogSource === 'iTunes Store' ? 'iTunes Store' : 'Apple Music', playbackKind: matchingApple.playbackKind === 'subscription' ? 'subscription' : 'preview', genre: matchingApple.genre, releaseDate: matchingApple.releaseDate, explicit: matchingApple.explicit, videoVersion: video } : undefined;
          return <YouTubeResultCard key={video.id} video={video} matchingAudio={audio} matchingSpotify={matchSpotify(video)} onWatch={() => watchVideo({ ...video, ...(audio ? { audioVersion: audio } : {}) })} onPlayAudio={audio ? () => playExternal(audio) : undefined} />;
        })}</ul>}{!loading.youtube && !errors.youtube && statuses.youtube === 'ready' && youtube.length === 0 && <p className="text-xs text-bone/40">No YouTube videos returned for this search.</p>}</section>
        <section className="min-w-0 lg:col-span-2"><H>Spotify catalog · {spotify.length}</H>{statuses.spotify === 'checking' && <p role="status" className="text-xs text-bone/50">Checking Spotify catalog configuration…</p>}{statuses.spotify === 'unconfigured' && <p className="rounded-xl border border-bone/10 bg-raised/25 p-3 text-xs leading-5 text-bone/55">{statusMessage('spotify')} The result API uses server-side Client Credentials for catalog metadata only. User-authorized Spotify playback needs a separate OAuth/eligible-account integration and is not available in this build.</p>}{statuses.spotify === 'unavailable' && <p role="status" className="text-xs text-bone/50">Spotify catalog is unavailable. Other sources remain searchable.</p>}{loading.spotify && <p role="status" className="text-xs text-bone/50">Searching Spotify…</p>}{errors.spotify && <p role="alert" className="rounded-xl border border-amber-200/10 p-3 text-xs text-amber-100/80">{errors.spotify}</p>}{unmatchedSpotify.length > 0 && <ul className="m-0 list-none p-0">{unmatchedSpotify.map((track) => <SpotifyResult key={track.id} track={track} />)}</ul>}{matchSpotifyForApple.length + matchSpotifyForYoutube.length > 0 && <p className="text-xs text-bone/45">Matching Spotify versions are linked from their grouped Apple or YouTube results above.</p>}{!loading.spotify && !errors.spotify && statuses.spotify === 'ready' && spotify.length === 0 && <p className="text-xs text-bone/40">No Spotify results.</p>}</section>
        {noResults && <p className="rounded-xl border border-bone/10 p-4 text-sm text-bone/55 lg:col-span-2">No matches in the local library or available catalogs. Providers needing setup are identified above.</p>}
        {errorsCount > 0 && !loadingAny && <p className="text-xs text-bone/45 lg:col-span-2">Some catalogs failed. Their errors are shown above; local AAK search remains available.</p>}
        {PROVIDERS.some((provider) => statuses[provider] === 'ready') && <button type="button" onClick={() => setRetry((value) => value + 1)} className="min-h-10 justify-self-start rounded-full border border-bone/15 px-4 text-xs text-bone/60 hover:border-cyan hover:text-cyan lg:col-span-2">Retry available catalogs</button>}
      </div>}
      <p className="mt-5 text-[10px] leading-5 text-bone/40">Apple previews play only when a preview URL is supplied. YouTube uses its official embedded video player and restrictions. Spotify catalog entries are metadata with an external link unless an authorized playback feature is configured.</p>
    </>}
  </div>;

  if (embedded) return <section aria-label="Universal music search" className="min-w-0 rounded-3xl border border-bone/12 bg-ink/75 shadow-xl backdrop-blur-xl">{content}</section>;
  return <Dialog label="Universal music search and downloads" onClose={close}><div className="drop h-full overflow-y-auto bg-ink/95"><Close onClose={close} />{content}</div></Dialog>;
}

export default memo(Search);
