import { useEffect, useRef, useState } from 'react';
import type { YouTubeResult } from '../services/music/types';

interface YouTubePlayerApi {
  destroy: () => void;
  getIframe: () => HTMLIFrameElement;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void;
}
interface YouTubeGlobal {
  Player: new (element: HTMLElement, options: {
    width: string;
    height: string;
    videoId: string;
    playerVars: Record<string, number | string>;
    events: {
      onReady: (event: { target: YouTubePlayerApi }) => void;
      onStateChange: (event: { data: number; target: YouTubePlayerApi }) => void;
      onError: (event: { data: number }) => void;
    };
  }) => YouTubePlayerApi;
}
type YouTubeWindow = Window & { YT?: YouTubeGlobal; onYouTubeIframeAPIReady?: () => void };

let apiReady: Promise<void> | null = null;

function loadYouTubeApi() {
  const youtubeWindow = window as YouTubeWindow;
  if (youtubeWindow.YT?.Player) return Promise.resolve();
  if (apiReady) return apiReady;
  apiReady = new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('YouTube player did not load.')), 12000);
    const previousCallback = youtubeWindow.onYouTubeIframeAPIReady;
    youtubeWindow.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      window.clearTimeout(timeout);
      resolve();
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-aak-youtube-api]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.aakYoutubeApi = 'true';
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Could not load the official YouTube player.'));
      };
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    apiReady = null;
    throw error;
  });
  return apiReady;
}

function errorText(code: number) {
  if (code === 101 || code === 150) return 'The creator does not allow this video to play in embedded players.';
  if (code === 100) return 'This video is unavailable or private.';
  if (code === 153) return 'YouTube could not verify the playback origin. Open the video on YouTube.';
  return 'YouTube could not play this video here. Open it on YouTube instead.';
}

export default function YouTubeVideoModal({ video, onClose, onPlayAudio, inline = false, startSeconds = 0, onPlayback, onController, onError }: { video: YouTubeResult; onClose: () => void; onPlayAudio?: () => void; inline?: boolean; startSeconds?: number; onPlayback?: (state: number, currentTime: number, duration: number) => void; onController?: (controller: { playVideo: () => void; pauseVideo: () => void; seekTo: (seconds: number) => void; setVolume: (volume: number) => void } | null) => void; onError?: (message: string) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerApi | null>(null);
  const pollRef = useRef<number | null>(null);
  const [playerError, setPlayerError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (inline || !dialog) return;
    if (!dialog.open) dialog.showModal();
    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('close', handleClose);
      if (dialog.open) dialog.close();
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    void loadYouTubeApi().then(() => {
      if (cancelled || !mountRef.current) return;
      const youtubeWindow = window as YouTubeWindow;
      if (!youtubeWindow.YT?.Player) throw new Error('YouTube player is unavailable.');
      playerRef.current = new youtubeWindow.YT.Player(mountRef.current, {
        width: '100%',
        height: '100%',
        videoId: video.id,
        playerVars: { controls: 1, playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: ({ target }) => {
            const iframe = target.getIframe();
            iframe.title = `YouTube video player: ${video.title}`;
            iframe.allowFullscreen = true;
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
            onController?.({ playVideo: () => target.playVideo(), pauseVideo: () => target.pauseVideo(), seekTo: (seconds) => target.seekTo(seconds, true), setVolume: (volume) => target.setVolume(Math.round(volume * 100)) });
            if (startSeconds > 0) target.seekTo(startSeconds, true);
            onPlayback?.(target.getPlayerState(), target.getCurrentTime(), target.getDuration());
            pollRef.current = window.setInterval(() => {
              const state = target.getPlayerState();
              if (state === 1) onPlayback?.(state, target.getCurrentTime(), target.getDuration());
            }, 500);
          },
          onStateChange: ({ data, target }) => onPlayback?.(data, target.getCurrentTime(), target.getDuration()),
          onError: ({ data }) => { const message = errorText(data); setPlayerError(message); onError?.(message); onPlayback?.(0, 0, 0); },
        },
      });
    }).catch((error: unknown) => {
      if (!cancelled) {
        const message = error instanceof Error ? error.message : 'YouTube player is unavailable.';
        setPlayerError(message);
        onError?.(message);
      }
    });
    return () => {
      cancelled = true;
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
      pollRef.current = null;
      onController?.(null);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [video.id, video.title, onController, onPlayback, onError]);

  if (inline) return <div className="relative h-full min-h-[200px] w-full min-w-0 bg-black" aria-label={`YouTube video: ${video.title}`}>
    <div ref={mountRef} className="absolute inset-0 h-full w-full" />
  </div>;

  const contents = <>
    <header className="flex items-start justify-between gap-4 border-b border-bone/10 px-4 py-4 sm:px-8">
      <div className="min-w-0">
        <p className="text-[10px] font-mono uppercase tracking-[.18em] text-cyan">YouTube · Video mode</p>
        <h2 className="mt-1 break-words font-display text-lg font-bold sm:text-2xl">{video.title}</h2>
        <p className="mt-1 text-sm text-bone/65">{video.artist}{video.durationSeconds ? ` · ${Math.floor(video.durationSeconds / 60)}:${String(video.durationSeconds % 60).padStart(2, '0')}` : ''}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Close video player" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-bone/25 text-xl hover:border-cyan hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan">×</button>
    </header>
    <div className={`mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center ${inline ? 'px-2 py-3 sm:px-4' : 'px-2 py-4 sm:px-6 sm:py-6'}`}>
      <div ref={mountRef} className="aspect-video min-h-[200px] w-full overflow-hidden rounded-xl bg-black sm:rounded-2xl" />
      {playerError && <p role="alert" className="mt-3 text-sm text-amber-200">{playerError}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-bone/55">Video mode uses YouTube's official player and its controls, ads, and playback restrictions.</p>
        <div className="flex flex-wrap gap-2">
          {onPlayAudio && <button type="button" onClick={onPlayAudio} className="min-h-11 rounded-full bg-cyan px-4 text-sm font-semibold text-ink">Switch to Audio Mode</button>}
          {!onPlayAudio && <span className="inline-flex min-h-11 items-center rounded-full border border-bone/10 px-3 text-xs text-bone/45">Audio version not matched</span>}
          <a href={video.watchUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-bone/20 px-4 text-sm font-semibold hover:border-cyan hover:text-cyan">Open on YouTube</a>
        </div>
      </div>
    </div>
  </>;

  return (
    <dialog
      ref={dialogRef}
      aria-label={`YouTube video: ${video.title}`}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}
      className="dlg bg-ink/95 text-bone"
    >
      <div className="flex h-full flex-col overflow-y-auto bg-ink/95">{contents}</div>
    </dialog>
  );
}
