export interface LyricsResponse {
  statusCode: number;
  body: unknown;
}

type Env = Record<string, string | undefined>;

const supportedAudio = new Map<string, string>([
  ['audio/mpeg', 'mp3'], ['audio/mp3', 'mp3'], ['audio/mp4', 'm4a'], ['audio/x-m4a', 'm4a'],
  ['audio/wav', 'wav'], ['audio/x-wav', 'wav'], ['audio/webm', 'webm'], ['audio/ogg', 'ogg'],
  ['audio/flac', 'flac'], ['audio/x-flac', 'flac'], ['audio/aac', 'aac'], ['audio/x-aac', 'aac'], ['video/mp4', 'mp4'],
]);
const allowedTargets = new Set(['en', 'bn', 'ar', 'es', 'hi']);

function jsonError(response: Response, prefix: string) {
  return response.json().then((body: unknown) => {
    const detail = body && typeof body === 'object' && 'error' in body
      ? (body as { error?: { message?: string } }).error?.message
      : undefined;
    if (response.status === 429) return `${prefix} is rate limiting requests. Try again later.`;
    if (response.status === 401 || response.status === 403) return `${prefix} rejected the server credential or access. Check the configured API key and project access.`;
    if (response.status === 400) return `${prefix} could not process this request${detail ? `: ${detail.slice(0, 180)}` : '.'}`;
    return `${prefix} returned HTTP ${response.status}. Try again later.`;
  }).catch(() => `${prefix} returned HTTP ${response.status}. Try again later.`);
}

export function lyricsStatus(env: Env): LyricsResponse {
  return { statusCode: 200, body: { configured: Boolean(env.OPENAI_API_KEY?.trim()), transcriptionModel: 'gpt-transcribe', translationModel: env.OPENAI_LYRICS_MODEL?.trim() || 'gpt-6-luna' } };
}

export async function transcribeLyrics(body: unknown, env: Env): Promise<LyricsResponse> {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { statusCode: 503, body: { error: 'AI transcription is not configured. Add OPENAI_API_KEY to the server environment.' } };
  if (!body || typeof body !== 'object') return { statusCode: 400, body: { error: 'The transcription request is invalid.' } };
  const input = body as { authorized?: unknown; fileName?: unknown; mimeType?: unknown; base64?: unknown };
  if (input.authorized !== true) return { statusCode: 400, body: { error: 'Confirm that you own or are authorized to process this audio.' } };
  if (typeof input.base64 !== 'string' || typeof input.fileName !== 'string' || typeof input.mimeType !== 'string') return { statusCode: 400, body: { error: 'Choose an audio file to transcribe.' } };

  const mimeType = input.mimeType.split(';')[0].toLowerCase();
  const extension = supportedAudio.get(mimeType);
  const fileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
  if (!extension || !fileName.toLowerCase().endsWith(`.${extension}`)) return { statusCode: 415, body: { error: 'Use an MP3, M4A, WAV, WEBM, OGG, AAC, FLAC, or MP4 audio file with a matching extension.' } };
  const encoded = input.base64.replace(/^data:[^,]*,/, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length < 8 || encoded.length % 4 !== 0) return { statusCode: 400, body: { error: 'The selected audio file could not be read.' } };
  const byteLength = Math.floor(encoded.length * 3 / 4) - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
  if (byteLength > 2_500_000) return { statusCode: 413, body: { error: 'For this web upload, choose an audio file under 2.5 MB.' } };
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0)); }
  catch { return { statusCode: 400, body: { error: 'The selected audio file could not be decoded.' } }; }
  const form = new FormData();
  form.set('model', 'gpt-transcribe');
  form.set('response_format', 'json');
  const blobBytes = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(blobBytes).set(bytes);
  form.set('file', new Blob([blobBytes], { type: mimeType }), fileName);

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) return { statusCode: response.status === 429 ? 429 : response.status >= 500 ? 502 : response.status, body: { error: await jsonError(response, 'OpenAI transcription') } };
    const result = await response.json() as { text?: unknown; languages?: Array<{ code?: unknown }> };
    if (typeof result.text !== 'string' || !result.text.trim()) return { statusCode: 422, body: { error: 'No usable words were detected. Try a clearer, shorter excerpt or edit the lyrics yourself.' } };
    const languages = (result.languages || []).flatMap((item) => typeof item.code === 'string' ? [item.code] : []);
    return { statusCode: 200, body: { text: result.text, languages, confidence: null, model: 'gpt-transcribe', label: 'AI transcription estimate' } };
  } catch {
    return { statusCode: 502, body: { error: 'Could not reach the transcription service. Check server connectivity and try again.' } };
  }
}

export async function translateLyrics(body: unknown, env: Env): Promise<LyricsResponse> {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { statusCode: 503, body: { error: 'AI translation is not configured. Add OPENAI_API_KEY to the server environment.' } };
  if (!body || typeof body !== 'object') return { statusCode: 400, body: { error: 'The translation request is invalid.' } };
  const input = body as { authorized?: unknown; text?: unknown; targetLanguage?: unknown };
  if (input.authorized !== true) return { statusCode: 400, body: { error: 'Confirm that you own or are authorized to translate this text.' } };
  if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 5000) return { statusCode: 400, body: { error: 'Provide lyrics text under 5,000 characters.' } };
  if (typeof input.targetLanguage !== 'string' || !allowedTargets.has(input.targetLanguage)) return { statusCode: 400, body: { error: 'Choose one of the supported translation languages.' } };

  const languageNames: Record<string, string> = { en: 'English', bn: 'Bengali', ar: 'Arabic', es: 'Spanish', hi: 'Hindi' };
  const model = env.OPENAI_LYRICS_MODEL?.trim() || 'gpt-6-luna';
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, store: false, max_output_tokens: 3000,
        input: [
          { role: 'developer', content: `Translate only the user-supplied text into ${languageNames[input.targetLanguage]}. Do not add, continue, infer, or complete missing lyrics. Preserve line breaks and repeated sections. If parts are ambiguous, mark them [unclear] rather than inventing content. Return only the translation.` },
          { role: 'user', content: input.text },
        ],
      }), signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) return { statusCode: response.status === 429 ? 429 : response.status >= 500 ? 502 : response.status, body: { error: await jsonError(response, 'OpenAI translation') } };
    const result = await response.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const translated = (result.output || []).flatMap((item) => item.content || []).filter((part) => part.type === 'output_text' && typeof part.text === 'string').map((part) => part.text).join('\n').trim();
    if (!translated) return { statusCode: 502, body: { error: 'The translation service did not return text. Try again.' } };
    return { statusCode: 200, body: { text: translated, targetLanguage: input.targetLanguage, model, label: 'AI translation draft' } };
  } catch {
    return { statusCode: 502, body: { error: 'Could not reach the translation service. Check server connectivity and try again.' } };
  }
}
