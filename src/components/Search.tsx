import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Dialog, { Close } from './Dialog';
import Art from './Art';
import { tracks, artists, genres, events } from '../data';
import { useUI } from '../hooks/useUI';
import { usePlayer } from '../hooks/usePlayer';
import { useUniversalPlayer } from '../hooks/useUniversalPlayer';
import { checkJamendoConfiguration, jamendoProvider } from '../services/music/jamendo';
import { appleMusicProvider, checkAppleCatalog, checkSpotifyConfiguration, checkYouTubeConfiguration, spotifyProvider, youtubeProvider } from '../services/music/discovery';
import type { AppleMusicResult, AudioCatalogTrack, ExternalTrack, SpotifyTrackResult, YouTubeResult } from '../services/music/types';

type ProviderStatus = 'checking' | 'ready' | 'unconfigured' | 'unavailable';
type ProviderStatuses = { jamendo: ProviderStatus; youtube: ProviderStatus; apple: ProviderStatus; spotify: ProviderStatus };
type BusyState = { jamendo: boolean; youtube: boolean; apple: boolean; spotify: boolean };
type ErrorState = { jamendo: string; youtube: string; apple: string; spotify: string };
type DownloadSelection =
  | { kind: 'youtube'; title: string; artist: string; url: string }
  | { kind: 'jamendo'; title: string; artist: string; url: string; trackUrl: string };

const H = ({ children }: { children: React.ReactNode }) => <h3 className="mb-3 mt-8 text-xs font-mono uppercase tracking-widest text-bone/60">{children}</h3>;
const formatDuration = (seconds: number | null) => seconds == null || seconds <= 0 ? '' : `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const asJamendoTrack = (track: ExternalTrack): AudioCatalogTrack => ({
  id: track.id, title: track.title, artist: track.artist, album: track.album, image: track.image,
  durationSeconds: track.durationSeconds, audioUrl: track.streamUrl, trackUrl: track.trackUrl,
  provider: 'Jamendo', playbackKind: 'full stream', genre: track.genres[0] || '',
});
const asAppleTrack = (track: AppleMusicResult): AudioCatalogTrack => ({
  id: track.id, title: track.title, artist: track.artist, album: track.album, image: track.image,
  durationSeconds: track.durationSeconds, audioUrl: track.previewUrl, trackUrl: track.trackUrl,
  provider: 'Apple Music', playbackKind: 'preview', genre: track.genre, releaseDate: track.releaseDate, explicit: track.explicit,
});

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

function matchKey(title: string) {
  return title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
}

function sameVersion(titleA: string, artistA: string, durationA: number | null, titleB: string, artistB: string, durationB: number | null) {
  if (matchKey(titleA) !== matchKey(titleB) || matchKey(artistA) !== matchKey(artistB)) return false;
  return durationA == null || durationB == null || Math.abs(durationA - durationB) <= 15;
}

function JamendoCard({ track, onPlay, onQueue, onDownloadOptions, matchingVideo, matchingSpotify, onWatchVersion }: { track: ExternalTrack; onPlay: () => void; onQueue: () => void; onDownloadOptions: () => void; matchingVideo?: YouTubeResult; matchingSpotify?: SpotifyTrackResult; onWatchVersion: () => void }) {
  return <li className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-3 border-b border-bone/10 py-4 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-4">
    {track.image ? <img src={track.image} alt="" loading="lazy" className="h-14 w-14 rounded-lg object-cover sm:h-16 sm:w-16" /> : <div aria-hidden="true" className="h-14 w-14 rounded-lg bg-raised sm:h-16 sm:w-16" />}
    <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><a href={track.trackUrl} target="_blank" rel="noreferrer" className="max-w-full break-words font-medium transition hover:text-cyan">{track.title}</a>{formatDuration(track.durationSeconds) && <span className="shrink-0 text-[10px] font-mono text-bone/55">{formatDuration(track.durationSeconds)}</span>}</div>
      <p className="mt-1 break-words text-sm text-bone/70">{track.artist}{track.album ? ` · ${track.album}` : ''}</p>
      <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-bone/55"><span>Jamendo · full stream where supplied</span>{track.genres.map((genre) => <span key={genre}>{genre}</span>)}{track.licenseUrl && <a className="underline underline-offset-2 hover:text-cyan" href={track.licenseUrl} target="_blank" rel="noreferrer">License</a>}<a className="underline underline-offset-2 hover:text-cyan" href={track.trackUrl} target="_blank" rel="noreferrer">Open Jamendo</a></div>
      {track.streamUrl && <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={onPlay} className="min-h-11 rounded-full bg-cyan px-4 text-xs font-semibold text-ink">Play full stream</button><button type="button" onClick={onQueue} className="min-h-11 rounded-full border border-bone/20 px-4 text-xs hover:border-cyan hover:text-cyan">Add to queue</button></div>}
      {track.downloadAllowed && <button type="button" onClick={onDownloadOptions} className="mt-2 min-h-10 rounded-full border border-bone/20 px-4 text-xs hover:border-cyan hover:text-cyan">Authorized download options</button>}
      {matchingVideo && <button type="button" onClick={onWatchVersion} className="mt-2 ml-2 min-h-10 rounded-full border border-cyan/30 px-4 text-xs text-cyan hover:bg-cyan/10">Watch matching YouTube version</button>}
      {matchingSpotify && <a href={matchingSpotify.trackUrl} target="_blank" rel="noreferrer" className="mt-2 ml-2 inline-flex min-h-10 items-center rounded-full border border-bone/15 px-4 text-xs hover:border-cyan hover:text-cyan">Same recording · Spotify</a>}
      {!track.streamUrl && <p className="mt-2 text-xs text-bone/55">No stream was supplied by Jamendo for this result.</p>}
    </div>
  </li>;
}

function AppleCard({ track, onPlay, onQueue, matchingVideo, matchingSpotify, onWatchVersion }: { track: AppleMusicResult; onPlay: () => void; onQueue: () => void; matchingVideo?: YouTubeResult; matchingSpotify?: SpotifyTrackResult; onWatchVersion: () => void }) {
  return <li className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-3 border-b border-bone/10 py-4 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-4">
    {track.image ? <img src={track.image} alt="" loading="lazy" className="h-14 w-14 rounded-lg object-cover sm:h-16 sm:w-16" /> : <div aria-hidden="true" className="h-14 w-14 rounded-lg bg-raised sm:h-16 sm:w-16" />}
    <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><p className="break-words font-medium">{track.title}</p>{formatDuration(track.durationSeconds) && <span className="shrink-0 text-[10px] font-mono text-bone/55">{formatDuration(track.durationSeconds)} full track</span>}</div>
      <p className="mt-1 break-words text-sm text-bone/70">{track.artist}{track.album ? ` · ${track.album}` : ''}</p>
      <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-bone/55"><span>Apple Music · iTunes Search API</span>{track.genre && <span>{track.genre}</span>}{track.releaseDate && <span>{track.releaseDate.slice(0, 10)}</span>}{track.explicit && <span>Explicit</span>}<a className="underline underline-offset-2 hover:text-cyan" href={track.trackUrl} target="_blank" rel="noreferrer">Open Apple Music</a></div>
      {track.previewUrl ? <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={onPlay} className="min-h-11 rounded-full bg-cyan px-4 text-xs font-semibold text-ink">Play Apple preview</button><button type="button" onClick={onQueue} className="min-h-11 rounded-full border border-bone/20 px-4 text-xs hover:border-cyan hover:text-cyan">Add preview to queue</button></div> : <p className="mt-2 text-xs text-bone/55">No playable preview was supplied for this result.</p>}
      {track.previewUrl && <p className="mt-1 text-[10px] text-bone/45">Preview only; the player reports the playable preview duration after loading.</p>}
      {matchingVideo && <button type="button" onClick={onWatchVersion} className="mt-2 min-h-10 rounded-full border border-cyan/30 px-4 text-xs text-cyan hover:bg-cyan/10">Watch matching YouTube version</button>}
      {matchingSpotify && <a href={matchingSpotify.trackUrl} target="_blank" rel="noreferrer" className="mt-2 ml-2 inline-flex min-h-10 items-center rounded-full border border-bone/15 px-4 text-xs hover:border-cyan hover:text-cyan">Same recording · Spotify</a>}
    </div>
  </li>;
}

function SpotifyCard({ track }: { track: SpotifyTrackResult }) {
  return <li className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-3 border-b border-bone/10 py-4 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-4">
    {track.image ? <img src={track.image} alt="" loading="lazy" className="h-14 w-14 rounded-lg object-cover sm:h-16 sm:w-16" /> : <div aria-hidden="true" className="h-14 w-14 rounded-lg bg-raised sm:h-16 sm:w-16" />}
    <div className="min-w-0"><p className="break-words font-medium">{track.title}</p><p className="mt-1 break-words text-sm text-bone/70">{track.artist} · {track.album}</p>
      <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-bone/55"><span>Spotify · catalog metadata</span>{formatDuration(track.durationSeconds) && <span>{formatDuration(track.durationSeconds)}</span>}{track.releaseDate && <span>{track.releaseDate}</span>}{track.explicit && <span>Explicit</span>}</div>
      <p className="mt-2 text-xs text-bone/55">In-site playback is not available for this result. Use Spotify's official player and account.</p>
      <a href={track.trackUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center rounded-full border border-bone/20 px-4 text-xs hover:border-cyan hover:text-cyan">Open on Spotify</a>
    </div>
  </li>;
}

function YouTubeCard({ video, onWatch, onDownloadOptions, matchingAudio, matchingSpotify, onPlayAudio }: { video: YouTubeResult; onWatch: () => void; onDownloadOptions: () => void; matchingAudio?: AudioCatalogTrack; matchingSpotify?: SpotifyTrackResult; onPlayAudio: () => void }) {
  return <li className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 border-b border-bone/10 py-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
    {video.thumbnail ? <img src={video.thumbnail} alt="" loading="lazy" className="aspect-video w-full rounded-lg object-cover" /> : <div aria-hidden="true" className="aspect-video w-full rounded-lg bg-raised" />}
    <div className="min-w-0"><div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><p className="break-words font-medium">{video.title}</p>{formatDuration(video.durationSeconds) && <span className="shrink-0 text-[10px] font-mono text-bone/55">{formatDuration(video.durationSeconds)}</span>}</div>
      <p className="mt-1 break-words text-sm text-bone/70">{video.artist}</p><p className="mt-1 text-[11px] text-bone/55">YouTube · video playback in YouTube's official embed; audio is not extracted.</p>
      <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={onWatch} disabled={!video.embeddable} className="min-h-11 rounded-full bg-cyan px-4 text-xs font-semibold text-ink disabled:opacity-40">Watch in video player</button><a href={video.watchUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-bone/20 px-4 text-xs hover:border-cyan hover:text-cyan">Open on YouTube</a><button type="button" onClick={onDownloadOptions} className="min-h-11 rounded-full border border-bone/15 px-4 text-xs text-bone/65 hover:border-cyan hover:text-cyan">Download options</button></div>
      {matchingAudio && <button type="button" onClick={onPlayAudio} className="mt-2 min-h-10 rounded-full border border-cyan/30 px-4 text-xs text-cyan hover:bg-cyan/10">Play matching {matchingAudio.provider} {matchingAudio.playbackKind}</button>}
      {matchingSpotify && <a href={matchingSpotify.trackUrl} target="_blank" rel="noreferrer" className="mt-2 ml-2 inline-flex min-h-10 items-center rounded-full border border-bone/15 px-4 text-xs hover:border-cyan hover:text-cyan">Same recording · Spotify</a>}
    </div>
  </li>;
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

function DownloadCenter({ selection }: { selection: DownloadSelection | null }) {
  const [url, setUrl] = useState(selection?.kind === 'youtube' ? selection.url : '');
  const [checkedUrl, setCheckedUrl] = useState(selection?.kind === 'youtube' ? selection.url : '');
  const submit = (event: FormEvent) => { event.preventDefault(); const id = youtubeIdFromUrl(url); setCheckedUrl(id ? `https://www.youtube.com/watch?v=${id}` : ''); };
  const youtubeUrl = checkedUrl;

  return <section aria-labelledby="download-center-heading" className="mt-6">
    <h2 id="download-center-heading" className="text-xs font-mono uppercase tracking-widest text-bone/60">Authorized downloads</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-bone/65">Downloads appear only when a provider explicitly permits them. AAK releases stay playable in the library; this center does not expose their audio file URLs.</p>
    {selection?.kind === 'jamendo' && <div className="mt-5 rounded-2xl border border-bone/15 bg-raised/40 p-4 sm:p-5">
      <p className="font-semibold">{selection.title}</p><p className="mt-1 text-sm text-bone/60">{selection.artist} · Jamendo supplied an authorized download URL.</p>
      <div className="mt-3 flex flex-wrap gap-2"><a href={selection.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-cyan px-4 text-xs font-bold text-ink">Continue to Jamendo download</a><a href={selection.trackUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-bone/20 px-4 text-xs hover:border-cyan hover:text-cyan">Review track and license</a></div>
      <p className="mt-2 text-xs text-bone/45">Format, quality, and file size are not supplied reliably by this API response.</p>
    </div>}
    {(selection?.kind === 'youtube' || !selection) && <div className="mt-5 rounded-2xl border border-bone/15 bg-raised/40 p-4 sm:p-5">
      <h3 className="font-semibold">YouTube video</h3>
      {selection?.kind === 'youtube' && <p className="mt-1 text-sm text-bone/60">{selection.title} · {selection.artist}</p>}
      <form onSubmit={submit} className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="download-youtube-url">YouTube video URL</label>
        <input id="download-youtube-url" value={url} onChange={(event) => { setUrl(event.target.value); setCheckedUrl(''); }} placeholder="Paste a YouTube video URL" className="min-h-11 min-w-0 flex-1 rounded-xl border border-bone/20 bg-ink/50 px-3 text-sm text-bone outline-none focus:border-cyan" />
        <button type="submit" className="min-h-11 rounded-xl border border-bone/20 px-4 text-xs font-semibold hover:border-cyan hover:text-cyan">Check options</button>
      </form>
      {youtubeUrl && <div className="mt-4 rounded-xl border border-cyan/20 p-3">
        <p className="text-sm font-medium">YouTube video link recognized</p>
        <a href={youtubeUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-10 items-center rounded-full border border-bone/20 px-4 text-xs hover:border-cyan hover:text-cyan">Open on YouTube ↗</a>
        <p className="mt-2 text-xs leading-5 text-bone/55">This site cannot download or convert YouTube media. Official YouTube app downloads, where offered, depend on the account, video, region, and YouTube's terms.</p>
      </div>}
      {url.trim() && !youtubeUrl && <p role="alert" className="mt-3 text-sm text-amber-200">Enter a valid youtube.com or youtu.be video URL, then check options.</p>}
      {!selection && <p className="mt-4 text-xs text-bone/45">Choose “Download options” on a YouTube result to review its legitimate provider actions.</p>}
    </div>}
    {selection?.kind === 'youtube' && <p className="mt-4 text-xs text-bone/45">The selected result has no authorized in-site download. No converter or hidden stream is used.</p>}
  </section>;
}
export default function Search({ q: initialQuery }: { q: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState<'search' | 'downloads'>('search');
  const [downloadSelection, setDownloadSelection] = useState<DownloadSelection | null>(null);
  const { close, openArtist, openEvent } = useUI();
  const player = usePlayer();
  const universal = useUniversalPlayer();
  const box = useRef<HTMLDivElement>(null);
  const [statuses, setStatuses] = useState<ProviderStatuses>({ jamendo: 'checking', youtube: 'checking', apple: 'checking', spotify: 'checking' });
  const [jamendo, setJamendo] = useState<ExternalTrack[]>([]);
  const [apple, setApple] = useState<AppleMusicResult[]>([]);
  const [youtube, setYoutube] = useState<YouTubeResult[]>([]);
  const [spotify, setSpotify] = useState<SpotifyTrackResult[]>([]);
  const [loading, setLoading] = useState<BusyState>({ jamendo: false, youtube: false, apple: false, spotify: false });
  const [errors, setErrors] = useState<ErrorState>({ jamendo: '', youtube: '', apple: '', spotify: '' });
  const [retry, setRetry] = useState(0);
  const [listening, setListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState('');
  const [voiceAwaitingReview, setVoiceAwaitingReview] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('aak_music_search_history') || '[]') as string[]; }
    catch { return []; }
  });
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const speechWindow = typeof window === 'undefined' ? null : window as SpeechWindow;
  const Recognition = speechWindow?.SpeechRecognition ?? speechWindow?.webkitSpeechRecognition;
  const normalized = query.trim().toLocaleLowerCase();
  const localMatch = (...fields: string[]) => fields.some((field) => field.toLocaleLowerCase().includes(normalized));

  const matchingTracks = useMemo(() => tracks.map((track, index) => ({ track, index })).filter(({ track }) => localMatch(track.title, track.artist, track.genre, track.bpm.toString(), track.date, `${Math.floor(track.dur / 60)}:${track.dur % 60}`, 'Ayatullah Al Khomeini')), [normalized]);
  const matchingArtists = useMemo(() => artists.filter((artist) => localMatch(artist.name, artist.genre, artist.bio, artist.id === 'aak-music' ? 'Ayatullah Al Khomeini' : '')), [normalized]);
  const matchingGenres = useMemo(() => genres.filter((genre) => localMatch(genre.name)), [normalized]);
  const matchingEvents = useMemo(() => events.filter((event) => localMatch(event.name, event.city, event.country, event.venue)), [normalized]);
  const localCount = normalized ? matchingTracks.length + matchingArtists.length + matchingGenres.length + matchingEvents.length : 0;

  const rememberSearch = (value: string) => {
    const term = value.trim();
    if (term.length < 2) return;
    setHistory((current) => {
      const next = [term, ...current.filter((entry) => entry.toLocaleLowerCase() !== term.toLocaleLowerCase())].slice(0, 8);
      try { localStorage.setItem('aak_music_search_history', JSON.stringify(next)); } catch { /* Storage may be disabled. */ }
      return next;
    });
  };

  useEffect(() => {
    const controller = new AbortController();
    void Promise.allSettled([checkJamendoConfiguration(controller.signal), checkYouTubeConfiguration(controller.signal), checkAppleCatalog(controller.signal), checkSpotifyConfiguration(controller.signal)])
      .then(([j, y, a, s]) => {
        if (controller.signal.aborted) return;
        setStatuses({
          jamendo: j.status === 'fulfilled' ? (j.value ? 'ready' : 'unconfigured') : 'unavailable',
          youtube: y.status === 'fulfilled' ? (y.value ? 'ready' : 'unconfigured') : 'unavailable',
          apple: a.status === 'fulfilled' ? (a.value ? 'ready' : 'unconfigured') : 'unavailable',
          spotify: s.status === 'fulfilled' ? (s.value ? 'ready' : 'unconfigured') : 'unavailable',
        });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setJamendo([]); setApple([]); setYoutube([]); setSpotify([]);
    setErrors({ jamendo: '', youtube: '', apple: '', spotify: '' });
    const ready = { jamendo: statuses.jamendo === 'ready', youtube: statuses.youtube === 'ready', apple: statuses.apple === 'ready', spotify: statuses.spotify === 'ready' };
    if (normalized.length < 2 || voiceAwaitingReview) {
      setLoading({ jamendo: false, youtube: false, apple: false, spotify: false });
      return;
    }
    setLoading(ready);
    if (!ready.jamendo && !ready.youtube && !ready.apple && !ready.spotify) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      rememberSearch(query);
      const reportError = (provider: keyof ErrorState, error: unknown) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        setErrors((current) => ({ ...current, [provider]: error instanceof Error ? error.message : 'Search failed. Try again.' }));
      };
      if (ready.jamendo) void jamendoProvider.search(query.trim(), controller.signal).then(setJamendo).catch((error: unknown) => reportError('jamendo', error)).finally(() => { if (!controller.signal.aborted) setLoading((current) => ({ ...current, jamendo: false })); });
      if (ready.apple) void appleMusicProvider.search(query.trim(), controller.signal).then(setApple).catch((error: unknown) => reportError('apple', error)).finally(() => { if (!controller.signal.aborted) setLoading((current) => ({ ...current, apple: false })); });
      if (ready.youtube) void youtubeProvider.search(query.trim(), controller.signal).then(setYoutube).catch((error: unknown) => reportError('youtube', error)).finally(() => { if (!controller.signal.aborted) setLoading((current) => ({ ...current, youtube: false })); });
      if (ready.spotify) void spotifyProvider.search(query.trim(), controller.signal).then(setSpotify).catch((error: unknown) => reportError('spotify', error)).finally(() => { if (!controller.signal.aborted) setLoading((current) => ({ ...current, spotify: false })); });
    }, 550);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [normalized, query, statuses, retry, voiceAwaitingReview]);

  useEffect(() => () => recognition.current?.abort(), []);
  const toggleVoiceInput = () => {
    if (listening) { recognition.current?.stop(); return; }
    if (!Recognition) { setVoiceMessage('Voice input is not supported in this browser. Type your search instead.'); return; }
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
        if (finalTranscript.trim()) { setQuery(finalTranscript.trim()); setVoiceAwaitingReview(true); setVoiceMessage('Review and edit the recognized phrase, then press Search spoken phrase.'); }
      };
      instance.onerror = (event) => {
        setVoiceMessage(event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'Microphone permission was denied. Allow it in browser settings, or type your search.' : event.error === 'no-speech' ? 'No speech was recognized. Try again or type your search.' : `Voice input could not start (${event.error}). Type your search instead.`);
        setListening(false);
      };
      instance.onend = () => setListening(false);
      recognition.current = instance; setVoiceAwaitingReview(false);
      setVoiceMessage('Voice recognition starts only after you press the microphone. Review or edit the text before searching.');
      instance.start(); setListening(true);
    } catch (error) { setListening(false); setVoiceMessage(error instanceof Error ? `Voice input could not start: ${error.message}` : 'Voice input could not start. Type your search instead.'); }
  };

  const submitSearch = (event?: FormEvent) => {
    event?.preventDefault();
    setTab('search');
    setVoiceAwaitingReview(false);
    rememberSearch(query);
  };
  const playLocal = (index: number) => { universal.closeAudio(); universal.closeVideo(); player.play(index); close(); };
  const playExternal = (track: AudioCatalogTrack) => { universal.playAudio(track); close(); };
  const watchVideo = (video: YouTubeResult) => { universal.playVideo(video); close(); };
  const matchForAudio = (title: string, artist: string, duration: number | null) => youtube.find((video) => sameVersion(title, artist, duration, video.title, video.artist, video.durationSeconds));
  const matchSpotify = (title: string, artist: string, duration: number | null) => spotify.find((item) => sameVersion(title, artist, duration, item.title, item.artist, item.durationSeconds));
  const unmatchedSpotify = spotify.filter((item) =>
    !apple.some((track) => sameVersion(item.title, item.artist, item.durationSeconds, track.title, track.artist, track.durationSeconds)) &&
    !jamendo.some((track) => sameVersion(item.title, item.artist, item.durationSeconds, track.title, track.artist, track.durationSeconds)) &&
    !youtube.some((video) => sameVersion(item.title, item.artist, item.durationSeconds, video.title, video.artist, video.durationSeconds)));
  const matchForVideo = (video: YouTubeResult) => {
    const audio = [...apple.map(asAppleTrack), ...jamendo.map(asJamendoTrack)];
    return audio.find((track) => Boolean(track.audioUrl) && sameVersion(video.title, video.artist, video.durationSeconds, track.title, track.artist, track.durationSeconds));
  };
  const appleAudioTrack = (track: AppleMusicResult) => {
    const videoVersion = matchForAudio(track.title, track.artist, track.durationSeconds);
    return { ...asAppleTrack(track), ...(videoVersion ? { videoVersion } : {}) };
  };
  const jamendoAudioTrack = (track: ExternalTrack) => {
    const videoVersion = matchForAudio(track.title, track.artist, track.durationSeconds);
    return { ...asJamendoTrack(track), ...(videoVersion ? { videoVersion } : {}) };
  };
  const playAppleWithVersion = (track: AppleMusicResult) => {
    playExternal(appleAudioTrack(track));
  };
  const playJamendoWithVersion = (track: ExternalTrack) => {
    playExternal(jamendoAudioTrack(track));
  };
  const loadingAny = loading.jamendo || loading.apple || loading.youtube || loading.spotify;
  const resultsCount = jamendo.length + apple.length + youtube.length + unmatchedSpotify.length;
  const readyCount = Object.values(statuses).filter((status) => status === 'ready').length;
  const errorCount = Object.values(errors).filter(Boolean).length;
  const providersChecked = Object.values(statuses).every((status) => status !== 'checking');
  const noResults = normalized.length >= 2 && providersChecked && !voiceAwaitingReview && !loadingAny && localCount === 0 && resultsCount === 0 && errorCount === 0;

  return <Dialog label="Universal music search and downloads" onClose={close}>
    <div className="drop h-full overflow-y-auto bg-ink/95">
      <Close onClose={close} />
      <div ref={box} className="mx-auto max-w-4xl px-4 pb-28 pt-20 sm:px-8 sm:pt-24">
        <p className="mb-3 text-xs font-mono uppercase tracking-[.2em] text-cyan">AAK Music · Universal Search</p>
        <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Music search views">
          <button role="tab" aria-selected={tab === 'search'} onClick={() => setTab('search')} className={`min-h-11 rounded-full px-4 text-xs font-mono ${tab === 'search' ? 'bg-cyan text-ink' : 'border border-bone/20 text-bone/65 hover:border-cyan'}`}>Search & Discover</button>
          <button role="tab" aria-selected={tab === 'downloads'} onClick={() => setTab('downloads')} className={`min-h-11 rounded-full px-4 text-xs font-mono ${tab === 'downloads' ? 'bg-cyan text-ink' : 'border border-bone/20 text-bone/65 hover:border-cyan'}`}>Download Center</button>
        </div>

        {tab === 'downloads' ? <DownloadCenter selection={downloadSelection} /> : <>
          <form onSubmit={submitSearch}>
            <label htmlFor="universal-music-search" className="sr-only">Search songs by title, artist, album, or keyword</label>
            <div className="flex min-h-14 min-w-0 items-center gap-2 rounded-2xl border border-bone/20 bg-raised/55 px-3 shadow-sm transition focus-within:border-cyan focus-within:ring-2 focus-within:ring-cyan/20 sm:min-h-16 sm:gap-3 sm:px-4">
              <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-bone/55" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input id="universal-music-search" data-autofocus list="aak-search-suggestions" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && voiceAwaitingReview) { event.preventDefault(); submitSearch(); } else if (event.key === 'ArrowDown') { event.preventDefault(); box.current?.querySelector<HTMLElement>('ul button, ul a')?.focus(); } }} placeholder="Songs, artists, albums, keywords…" autoComplete="off" className="min-w-0 flex-1 bg-transparent py-3 font-display text-lg font-semibold text-bone outline-none placeholder:text-bone/50 sm:text-2xl" />
              <datalist id="aak-search-suggestions">{[...history, ...tracks.map((track) => track.title), ...artists.map((artist) => artist.name), ...genres.map((genre) => genre.name)].map((term, index) => <option key={`${term}-${index}`} value={term} />)}</datalist>
              <button type="button" onClick={toggleVoiceInput} disabled={!Recognition} aria-label={listening ? 'Stop voice input' : Recognition ? 'Start voice input' : 'Voice input unavailable'} aria-pressed={listening} title={Recognition ? (listening ? 'Stop listening' : 'Search by voice') : 'Voice input is not supported'} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${listening ? 'border-cyan bg-cyan/15 text-cyan' : 'border-bone/15 text-bone/70 hover:border-cyan hover:text-cyan'}`}>
                <svg aria-hidden="true" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8" /></svg>
              </button>
              <button type="submit" className="min-h-11 rounded-xl bg-cyan px-3 text-xs font-bold text-ink sm:px-5">Search</button>
            </div>
          </form>
          <p className="mt-3 text-xs text-bone/55">AAK releases · Apple previews · Jamendo streams · YouTube videos</p>
          {voiceMessage && <p role="status" className="mt-2 text-xs leading-5 text-cyan/85">{listening ? 'Listening… ' : ''}{voiceMessage}</p>}
          {!Recognition && <p className="mt-2 text-xs text-bone/50">Voice input is unavailable in this browser. Keyboard search remains enabled.</p>}
          {voiceAwaitingReview && <button type="button" onClick={() => submitSearch()} className="mt-3 min-h-11 rounded-full bg-cyan px-5 text-xs font-mono font-bold text-ink">SEARCH SPOKEN PHRASE</button>}

          {!normalized && <>
            {!!history.length && <><H>Recent searches</H><div className="flex flex-wrap items-center gap-2">{history.map((term) => <button key={term} type="button" onClick={() => { setQuery(term); setVoiceAwaitingReview(false); }} className="min-h-10 max-w-full truncate rounded-full border border-bone/20 px-4 text-xs text-bone/75 hover:border-cyan hover:text-cyan">{term}</button>)}<button type="button" onClick={() => { setHistory([]); try { localStorage.removeItem('aak_music_search_history'); } catch { /* Storage may be disabled. */ } }} className="min-h-10 rounded-full px-3 text-xs text-bone/45 underline underline-offset-4">Clear history</button></div></>}
            <H>Browse AAK genres</H><ul className="flex flex-wrap gap-2">{genres.map((genre) => <li key={genre.id}><button type="button" onClick={() => setQuery(genre.name)} className="min-h-11 rounded-full border border-bone/20 px-4 py-2 text-sm transition hover:border-cyan hover:text-cyan">{genre.name}</button></li>)}</ul>
          </>}

          {normalized && <p role="status" className="mt-5 text-xs font-mono text-bone/55">{localCount} AAK local {localCount === 1 ? 'match' : 'matches'} · {resultsCount} external {resultsCount === 1 ? 'result' : 'results'}{loadingAny ? ' · searching…' : ''}</p>}
          {!!matchingTracks.length && <><H>AAK Music · own releases</H><ul>{matchingTracks.map(({ track, index }) => <li key={track.id} className="grid min-w-0 grid-cols-1 items-center gap-2 border-b border-bone/10 py-2">
            <button type="button" onClick={() => playLocal(index)} aria-label={`Play ${track.title} by ${track.artist}`} className="group flex min-h-16 min-w-0 items-center gap-3 text-left sm:gap-4"><Art a={track.a} b={track.b} image={track.image} className="h-12 w-12 shrink-0 rounded-lg object-cover" /><span className="min-w-0 flex-1"><span className="block break-words font-medium group-hover:text-cyan">{track.title}</span><span className="block truncate text-xs text-bone/60">{track.artist} · {track.genre} · {track.bpm} BPM</span></span><span className="hidden shrink-0 text-xs font-mono text-bone/50 sm:inline">{Math.floor(track.dur / 60)}:{String(track.dur % 60).padStart(2, '0')}</span></button>
          </li>)}</ul></>}
          {!!matchingArtists.length && <><H>AAK artists</H><ul>{matchingArtists.map((artist) => <li key={artist.id}><button type="button" onClick={() => openArtist(artist.id)} className="flex min-h-12 w-full flex-wrap items-center justify-between gap-2 border-b border-bone/15 py-3 text-left transition hover:text-cyan"><span className="font-display text-xl">{artist.name}</span><span className="text-sm text-bone/60">{artist.genre}</span></button></li>)}</ul></>}
          {!!matchingGenres.length && normalized && <><H>Genres</H><ul>{matchingGenres.map((genre) => <li key={genre.id}><button type="button" onClick={() => setQuery(genre.name)} className="min-h-11 border-b border-bone/15 py-3 text-left font-display text-xl hover:text-cyan">{genre.name}</button></li>)}</ul></>}
          {!!matchingEvents.length && <><H>Events</H><ul>{matchingEvents.map((event) => <li key={event.id}><button type="button" onClick={() => openEvent(event.id)} className="flex min-h-12 w-full flex-wrap items-center justify-between gap-2 border-b border-bone/15 py-3 text-left transition hover:text-cyan"><span className="font-display text-xl">{event.name}</span><span className="text-sm text-bone/60">{event.city}, {event.date}</span></button></li>)}</ul></>}

          {normalized.length === 1 && <p className="mt-6 text-sm text-bone/55">Type one more character to search external catalogs.</p>}
          {normalized.length >= 2 && localCount === 0 && <p className="mt-4 text-sm text-bone/55">No matches in the local AAK Music library for this phrase.</p>}
          {normalized.length >= 2 && <>
            <H>Apple Music catalog · public iTunes Search API</H>
            {statuses.apple === 'checking' && <p role="status" className="py-3 text-sm text-bone/60">Checking Apple catalog…</p>}
            {statuses.apple === 'unavailable' && <p role="status" className="py-3 text-sm text-bone/60">Apple catalog search is unavailable on this server. AAK search remains available.</p>}
            {loading.apple && <p role="status" className="py-3 text-sm text-bone/60">Searching Apple Music…</p>}
            {!!errors.apple && <p role="alert" className="rounded-xl border border-rose-300/25 p-3 text-sm text-bone/70">{errors.apple} AAK results remain available.</p>}
            {!!apple.length && <ul>{apple.map((track) => <AppleCard key={track.id} track={track} matchingSpotify={matchSpotify(track.title, track.artist, track.durationSeconds)} matchingVideo={matchForAudio(track.title, track.artist, track.durationSeconds)} onWatchVersion={() => { const video = matchForAudio(track.title, track.artist, track.durationSeconds); if (video) watchVideo(video); }} onPlay={() => playAppleWithVersion(track)} onQueue={() => universal.addToQueue(appleAudioTrack(track))} />)}</ul>}
            {statuses.youtube === 'checking' && <p role="status" className="mt-4 py-3 text-sm text-bone/60">Checking YouTube search…</p>}
            {statuses.youtube === 'unconfigured' && <div className="mt-4 rounded-xl border border-bone/15 bg-raised/50 p-4 text-sm text-bone/75"><p>YouTube search is not configured. Add a restricted <code className="text-cyan">YOUTUBE_DATA_API_KEY</code> to the server environment to enable real YouTube results.</p><p className="mt-2 text-xs text-bone/55">The key is read only by the server proxy and is never sent to the browser.</p></div>}
            {statuses.youtube === 'unavailable' && <p role="status" className="mt-4 py-3 text-sm text-bone/60">YouTube search is unavailable on this server. The AAK and Apple catalogs remain searchable.</p>}
            {loading.youtube && <p role="status" className="py-3 text-sm text-bone/60">Searching YouTube…</p>}
            {!!errors.youtube && <p role="alert" className="rounded-xl border border-rose-300/25 p-3 text-sm text-bone/70">{errors.youtube} Local and Apple results remain available.</p>}
            {!!youtube.length && <ul>{youtube.map((video) => {
              const matchingAudio = matchForVideo(video);
              return <YouTubeCard key={video.id} video={video} matchingAudio={matchingAudio} matchingSpotify={matchSpotify(video.title, video.artist, video.durationSeconds)} onPlayAudio={() => { if (matchingAudio) playExternal({ ...matchingAudio, videoVersion: video }); }} onDownloadOptions={() => { setDownloadSelection({ kind: 'youtube', title: video.title, artist: video.artist, url: video.watchUrl }); setTab('downloads'); }} onWatch={() => watchVideo({ ...video, ...(matchingAudio ? { audioVersion: matchingAudio } : {}) })} />;
            })}</ul>}
            <H>Spotify catalog</H>
            {statuses.spotify === 'checking' && <p role="status" className="py-3 text-sm text-bone/60">Checking Spotify catalog configuration...</p>}
            {statuses.spotify === 'unconfigured' && <p className="rounded-xl border border-bone/15 bg-raised/50 p-4 text-sm text-bone/70">Spotify metadata search is not configured. Add server-only <code className="text-cyan">SPOTIFY_CLIENT_ID</code> and <code className="text-cyan">SPOTIFY_CLIENT_SECRET</code> to enable catalog results. No Spotify playback is claimed here.</p>}
            {statuses.spotify === 'unavailable' && <p role="status" className="py-3 text-sm text-bone/60">Spotify catalog search is unavailable; other sources remain available.</p>}
            {loading.spotify && <p role="status" className="py-3 text-sm text-bone/60">Searching Spotify...</p>}
            {!!errors.spotify && <p role="alert" className="rounded-xl border border-rose-300/25 p-3 text-sm text-bone/70">{errors.spotify} Other catalog results remain available.</p>}
            {!!unmatchedSpotify.length && <ul>{unmatchedSpotify.map((track) => <SpotifyCard key={track.id} track={track} />)}</ul>}
            <H>Jamendo public music catalog</H>
            {statuses.jamendo === 'checking' && <p role="status" className="py-3 text-sm text-bone/60">Checking Jamendo availability…</p>}
            {statuses.jamendo === 'unconfigured' && <div className="rounded-xl border border-bone/15 bg-raised/50 p-4 text-sm text-bone/75"><p>Jamendo search is not configured. A server-only read-only <code className="text-cyan">JAMENDO_CLIENT_ID</code> is required.</p><p className="mt-2 text-xs text-bone/55">Jamendo’s API terms determine permitted usage; free access is not a blanket commercial license. Review each track’s license before reuse.</p></div>}
            {statuses.jamendo === 'unavailable' && <p role="status" className="py-3 text-sm text-bone/60">Jamendo is unavailable on this server. AAK results remain available.</p>}
            {loading.jamendo && <p role="status" className="py-3 text-sm text-bone/60">Searching Jamendo…</p>}
            {!!errors.jamendo && <p role="alert" className="rounded-xl border border-rose-300/25 p-3 text-sm text-bone/70">{errors.jamendo} Local results remain available.</p>}
            {!!jamendo.length && <ul>{jamendo.map((track) => <JamendoCard key={track.id} track={track} matchingSpotify={matchSpotify(track.title, track.artist, track.durationSeconds)} matchingVideo={matchForAudio(track.title, track.artist, track.durationSeconds)} onWatchVersion={() => { const video = matchForAudio(track.title, track.artist, track.durationSeconds); if (video) watchVideo(video); }} onDownloadOptions={() => { setDownloadSelection({ kind: 'jamendo', title: track.title, artist: track.artist, url: track.downloadUrl, trackUrl: track.trackUrl }); setTab('downloads'); }} onPlay={() => playJamendoWithVersion(track)} onQueue={() => universal.addToQueue(jamendoAudioTrack(track))} />)}</ul>}
            {noResults && <p className="mt-4 rounded-xl border border-bone/10 p-4 text-sm text-bone/60">No matches in AAK Music or the available external catalogs. Providers that need setup are marked above. Try a different song, artist, album, or keyword.</p>}
            {!!readyCount && errorCount > 0 && !loadingAny && !localCount && !resultsCount && <p className="mt-4 text-sm text-bone/60">Some external catalogs failed; see their provider-specific errors above. Local AAK search is still available.</p>}
            {readyCount > 0 && <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-4 min-h-10 rounded-full border border-bone/15 px-4 text-xs text-bone/60 hover:border-cyan hover:text-cyan">Retry available catalogs</button>}
            <p className="mt-4 text-[10px] leading-5 text-bone/40">Apple preview audio is playable only when Apple supplies a preview URL. YouTube videos use YouTube’s embedded player; playback restrictions may still send a video to YouTube.</p>
          </>}
        </>}
      </div>
    </div>
  </Dialog>;
}
