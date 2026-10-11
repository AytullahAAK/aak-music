import { useEffect, useMemo, useState } from 'react';
import { detectLyricsLanguage } from '../utils/languageDetect';

type ServiceStatus = { configured?: boolean; transcriptionModel?: string; translationModel?: string };
type ServiceResult = { error?: string; text?: string; languages?: string[]; confidence?: number | null; label?: string };
const targetLanguages = [
  ['en', 'English'], ['bn', 'Bengali'], ['ar', 'Arabic'], ['es', 'Spanish'], ['hi', 'Hindi'],
] as const;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read this file.'));
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this file.'));
    reader.readAsDataURL(file);
  });
}

function displayLanguage(code: string) {
  try { return new Intl.DisplayNames(undefined, { type: 'language' }).of(code) || code; }
  catch { return code; }
}

async function parseResponse(response: Response) {
  const result = await response.json() as ServiceResult;
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

function inferredMime(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  return ({ mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', webm: 'audio/webm', ogg: 'audio/ogg', flac: 'audio/flac', aac: 'audio/aac', mp4: 'video/mp4' } as Record<string, string>)[extension || ''] || 'audio/mpeg';
}

export default function LyricsAssistant() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [statusError, setStatusError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [audioAuthorized, setAudioAuthorized] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [transcribed, setTranscribed] = useState(false);
  const [detectedCode, setDetectedCode] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [textAuthorized, setTextAuthorized] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const [translation, setTranslation] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/lyrics-transcribe?status', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json() as ServiceStatus & { error?: string };
        if (!response.ok) throw new Error(result.error || 'Could not check the AI service configuration.');
        if (active) setStatus(result.configured ? 'ready' : 'missing');
      })
      .catch((error: unknown) => { if (active) { setStatus('error'); setStatusError(error instanceof Error ? error.message : 'Could not check the AI service configuration.'); } });
    return () => { active = false; };
  }, []);

  const localLanguage = useMemo(() => detectLyricsLanguage(lyrics), [lyrics]);
  const languageName = detectedCode ? displayLanguage(detectedCode) : localLanguage.name;

  const runTranscription = async () => {
    if (!file || !audioAuthorized || transcribing) return;
    setTranscribing(true);
    setTranscriptionError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const result = await parseResponse(await fetch('/api/lyrics-transcribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorized: true, fileName: file.name, mimeType: inferredMime(file), base64: dataUrl }),
      }));
      if (!result.text) throw new Error('No transcript was returned. You can retry or enter lyrics manually.');
      setLyrics(result.text);
      setTranscribed(true);
      setDetectedCode(result.languages?.[0] || '');
      setTranslation('');
    } catch (error) {
      setTranscriptionError(error instanceof Error ? error.message : 'Transcription failed. Please try again.');
    } finally { setTranscribing(false); }
  };

  const runTranslation = async () => {
    if (!lyrics.trim() || !textAuthorized || translating) return;
    setTranslating(true);
    setTranslationError('');
    try {
      const result = await parseResponse(await fetch('/api/lyrics-translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorized: true, text: lyrics, targetLanguage }),
      }));
      setTranslation(result.text || '');
    } catch (error) {
      setTranslationError(error instanceof Error ? error.message : 'Translation failed. Please try again.');
    } finally { setTranslating(false); }
  };

  return <div className="mt-3 space-y-4">
    <section className="rounded-xl border border-bone/10 bg-ink/30 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h4 className="text-xs font-semibold text-bone">Lyrics & language</h4><p className="mt-1 text-[10px] leading-5 text-bone/55">No licensed lyrics catalogue is connected. Add text you are allowed to use or request an AI transcription from a file you select.</p></div>
        <span className={`rounded-full border px-2 py-1 text-[9px] font-mono ${status === 'ready' ? 'border-emerald-300/25 text-emerald-200' : 'border-bone/10 text-bone/50'}`} role="status">{status === 'loading' ? 'CHECKING SERVICE' : status === 'ready' ? 'AI SERVICE READY' : status === 'missing' ? 'AI SERVICE NOT CONFIGURED' : 'SERVICE STATUS ERROR'}</span>
      </div>
      {status === 'missing' && <p className="mt-2 text-[10px] leading-5 text-amber-100/75">Add <code>OPENAI_API_KEY</code> to the server environment to enable transcription and translation. Never add it to a <code>VITE_</code> variable.</p>}
      {status === 'error' && <p role="alert" className="mt-2 text-[10px] text-amber-100/75">{statusError}</p>}

      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="min-w-0 text-[10px] font-mono text-bone/55">AUDIO FILE YOU ARE AUTHORIZED TO PROCESS
          <input type="file" accept=".mp3,.m4a,.wav,.webm,.ogg,.aac,.flac,.mp4,audio/*,video/mp4" onChange={(event) => { setFile(event.target.files?.[0] || null); setTranscriptionError(''); }} className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border border-bone/10 bg-ink/50 p-2 text-[10px] text-bone file:mr-2 file:rounded-md file:border-0 file:bg-bone/10 file:px-2 file:py-1.5 file:text-[10px] file:text-bone" />
        </label>
        <button type="button" disabled={!file || !audioAuthorized || status !== 'ready' || transcribing} onClick={() => void runTranscription()} className="min-h-11 rounded-full border border-cyan/30 px-4 text-[10px] font-mono text-cyan hover:bg-cyan/10 disabled:cursor-not-allowed disabled:opacity-35">{transcribing ? 'TRANSCRIBING…' : transcribed ? 'RETRY TRANSCRIPTION' : 'TRANSCRIBE FILE'}</button>
      </div>
      <label className="mt-2 flex min-h-10 items-start gap-2 text-[10px] leading-5 text-bone/55"><input type="checkbox" checked={audioAuthorized} onChange={(event) => setAudioAuthorized(event.target.checked)} className="mt-1 accent-cyan" /><span>I own this audio or have permission to submit it for processing. The selected file is sent to the configured AI provider; this site does not save it.</span></label>
      {transcriptionError && <p role="alert" className="mt-2 text-[10px] leading-5 text-amber-100/80">{transcriptionError}</p>}
      <p className="mt-1 text-[9px] leading-4 text-bone/40">File transcription accepts audio up to 2.5 MB here. Singing recognition can be inaccurate. The transcript is an editable estimate, not official lyrics or verified subtitles.</p>
    </section>

    <div>
      <label htmlFor="user-provided-lyrics" className="text-[10px] font-mono text-bone/55">LYRICS TEXT</label>
      <textarea id="user-provided-lyrics" value={lyrics} onChange={(event) => { setLyrics(event.target.value); setDetectedCode(''); setTranscribed(false); setTranslation(''); }} placeholder="Paste lyrics you own or are permitted to use…" rows={5} className="mt-1 w-full resize-y rounded-xl border border-bone/12 bg-ink/40 p-3 text-sm leading-6 text-bone outline-none placeholder:text-bone/35 focus-visible:border-bone/35 focus-visible:ring-2 focus-visible:ring-bone/10" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-bone/55">{lyrics.trim() ? <>{detectedCode ? 'Detected language' : 'Local language estimate'}: <span className="text-cyan">{languageName}</span>{!detectedCode && ` · heuristic ${Math.round(localLanguage.confidence * 100)}%`}</> : 'Lyrics unavailable until supplied by an authorized source.'}</p>
        {lyrics && <button type="button" onClick={() => { setLyrics(''); setTranslation(''); setDetectedCode(''); setTranscribed(false); }} className="min-h-9 text-[10px] text-bone/50 underline underline-offset-2 hover:text-bone">Clear text</button>}
      </div>
      {transcribed && <p className="mt-1 text-[9px] leading-4 text-amber-100/65">AI transcription estimate. No calibrated confidence score is provided by this model. Review and correct the text before using it.</p>}
      {lyrics.trim() && <p className="mt-1 text-[9px] leading-4 text-bone/40">{detectedCode ? 'Language came from the transcription service response.' : localLanguage.basis}</p>}
    </div>

    <section className="rounded-xl border border-bone/10 bg-ink/30 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2"><label htmlFor="lyrics-translation-language" className="text-[10px] font-mono text-bone/55">TRANSLATE SUPPLIED TEXT</label><select id="lyrics-translation-language" value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)} className="min-h-10 min-w-0 rounded-lg border border-bone/15 bg-ink px-3 text-xs text-bone"><option value="en">English</option><option value="bn">Bengali</option><option value="ar">Arabic</option><option value="es">Spanish</option><option value="hi">Hindi</option></select><button type="button" disabled={!lyrics.trim() || !textAuthorized || status !== 'ready' || translating} onClick={() => void runTranslation()} className="min-h-10 rounded-full border border-bone/15 px-3 text-[10px] text-bone/70 hover:border-cyan hover:text-cyan disabled:cursor-not-allowed disabled:opacity-35">{translating ? 'TRANSLATING…' : 'TRANSLATE'}</button></div>
      <label className="mt-2 flex min-h-10 items-start gap-2 text-[10px] leading-5 text-bone/55"><input type="checkbox" checked={textAuthorized} onChange={(event) => setTextAuthorized(event.target.checked)} className="mt-1 accent-cyan" /><span>I own or am authorized to submit this text for translation. Only the text above and selected target language are sent.</span></label>
      {translationError && <p role="alert" className="mt-1 text-[10px] leading-5 text-amber-100/80">{translationError}</p>}
      {translation && <div className="mt-3"><label htmlFor="lyrics-translation" className="text-[9px] font-mono uppercase tracking-widest text-bone/45">AI translation draft · edit before use</label><textarea id="lyrics-translation" value={translation} onChange={(event) => setTranslation(event.target.value)} rows={5} className="mt-1 w-full resize-y rounded-lg border border-bone/10 bg-ink/50 p-3 text-sm leading-6 text-bone outline-none focus-visible:border-bone/35 focus-visible:ring-2 focus-visible:ring-bone/10" /></div>}
      <p className="mt-2 text-[9px] leading-4 text-bone/40">Machine translation can miss poetic meaning or idiom. It is not an official lyric translation. AI features require a server-side OpenAI API key and may incur API usage charges.</p>
    </section>
  </div>;
}
