import { useCallback, useMemo, useRef, useState } from 'react';
import { tracks } from '../data';
import Art from '../components/Art';
import Icon from '../components/Icon';
import Search from '../components/Search';
import PlayerVisualizer from '../components/PlayerVisualizer';
import VisualizerToolbar from '../components/VisualizerToolbar';
import EqualizerControl from '../components/EqualizerControl';
import LyricsAssistant from '../components/LyricsAssistant';
import YouTubeVideoModal from '../components/YouTubeVideoModal';
import { usePlayer, useTime, fmt, statusLabel } from '../hooks/usePlayer';
import { useUniversalPlayer, useUniversalPlayerTime } from '../hooks/useUniversalPlayer';
import { useUI } from '../hooks/useUI';
import type { YouTubeResult } from '../services/music/types';

function PlaybackTimeline({ mode, fallbackDuration, onSeek, label }: { mode: 'local' | 'external' | 'video'; fallbackDuration: number; onSeek: (seconds: number) => void; label: string }) {
  const localTime = useTime();
  const sourceTime = useUniversalPlayerTime();
  const player = useUniversalPlayer();
  const current = mode === 'video' ? sourceTime.videoTime : mode === 'external' ? sourceTime.time : localTime.t;
  const measuredDuration = mode === 'video' ? sourceTime.videoDuration : mode === 'external' ? sourceTime.duration : localTime.dur;
  const duration = measuredDuration || fallbackDuration;
  const canSeek = measuredDuration > 0 && (mode !== 'video' || player.videoReady);
  return <div className="flex w-full min-w-0 items-center gap-3 text-[10px] font-mono tabular-nums text-bone/55">
    <span>{fmt(current)}</span>
    <input aria-label={label} type="range" min={0} max={duration || 1} step="any" value={Math.min(current, duration || 0)} disabled={!canSeek} onChange={(event) => onSeek(Number(event.target.value))} className="min-w-0 flex-1 accent-cyan disabled:opacity-35" />
    <span>{fmt(duration)}</span>
  </div>;
}

export default function UnifiedPlayerExperience() {
  const local = usePlayer();
  const universal = useUniversalPlayer();
  const ui = useUI();
  const clock = useUniversalPlayerTime();
  const external = universal.activeAudio;
  const video = universal.activeVideo;
  const videoMode = universal.videoMode;
  const selected = local.track;
  const title = video?.title || external?.title || selected.title;
  const artist = video?.artist || external?.artist || selected.artist;
  const image = video?.thumbnail || external?.image || selected.image;
  const isVideo = Boolean(video && videoMode);
  const isVideoSelected = Boolean(video && !videoMode);
  const isPlaying = isVideo ? universal.videoPlaying : external ? universal.playing : local.playing;
  const volume = video || external ? universal.volume : local.vol;
  const repeat = external ? universal.repeat : local.repeat;
  const shuffle = external ? universal.shuffle : local.shuffle;
  const sourceStatus = video ? (videoMode ? 'YouTube · official embedded video' : 'YouTube · selected, not playing') : external ? `${external.provider} · ${external.playbackKind === 'preview' ? 'preview only' : external.playbackKind === 'subscription' ? 'subscriber playback' : 'audio'}` : statusLabel(local.status) || (isPlaying ? 'Playing full AAK release' : 'AAK Music library');
  const currentIndex = useMemo(() => tracks.findIndex((track) => track.id === selected.id), [selected.id]);
  const [queueOpen, setQueueOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'info' | 'lyrics' | null>(null);
  const isFav = local.isFavorite(selected.id);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const lyricsContext = video
    ? { title: video.title, artist: video.artist, provider: 'YouTube', sourceUrl: video.watchUrl, sourceKind: 'third-party' as const }
    : external
      ? { title: external.title, artist: external.artist, provider: external.provider, sourceUrl: external.trackUrl, sourceKind: 'third-party' as const }
      : { title: selected.title, artist: selected.artist, provider: 'AAK Music', sourceKind: 'local' as const };

  const onVideoPlayback = useCallback((state: number, time: number, total: number) => universal.syncVideo(state, time, total), [universal.syncVideo]);
  const onVideoController = useCallback((controller: Parameters<typeof universal.setVideoController>[0]) => {
    universal.setVideoController(controller);
    if (controller) controller.setVolume(volumeRef.current);
  }, [universal.setVideoController]);
  const onVideoError = useCallback((message: string) => universal.setError(message), [universal.setError]);
  const toggle = () => isVideo ? universal.toggleVideo() : external ? universal.toggle() : local.toggle();
  const previous = () => external ? universal.prev() : local.prev();
  const next = () => external ? universal.next() : local.next();
  const seek = (value: number) => isVideo ? universal.seekVideo(value) : external ? universal.seek(value) : local.seek(value);
  const setVolume = (value: number) => video ? universal.setVideoVolume(value) : external ? universal.setVolume(value) : local.setVol(value);
  const toggleShuffle = () => external ? universal.setShuffle(!shuffle) : local.toggleShuffle();
  const toggleRepeat = () => external ? universal.setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off') : local.toggleRepeat();
  const openVideo = (item: YouTubeResult) => universal.playVideo(item);
  const mediaDuration = video?.durationSeconds || external?.durationSeconds || selected.dur;

  return <section id="player" className="relative isolate px-4 py-8 sm:px-6 md:px-10 md:py-12">
    <div className="mx-auto grid min-w-0 max-w-[1500px] items-start gap-6 xl:grid-cols-[minmax(0,.88fr)_minmax(0,1.12fr)] xl:gap-8">
      <div className="min-w-0 xl:sticky xl:top-5">
        <div className="mb-4"><p className="font-mono text-[10px] uppercase tracking-[.22em] text-cyan">AAK MUSIC · MAIN PLAYER</p><h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Listen, search, and switch sources</h2></div>
        <div className={`relative mx-auto w-full min-w-0 max-w-[760px] rounded-3xl border border-bone/10 bg-raised/25 shadow-xl ${isVideo ? 'overflow-visible' : 'aspect-square overflow-hidden'}`}>
          {isVideo ? <div className="w-full rounded-3xl bg-black">
            <div className="aspect-video min-h-[200px] w-full">
              <YouTubeVideoModal inline video={video as YouTubeResult} onClose={universal.exitVideoMode} startSeconds={clock.videoTime} onPlayback={onVideoPlayback} onController={onVideoController} onError={onVideoError} />
            </div>
          </div> : <>
            {image ? <img src={image} alt={`${title} artwork`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : <Art a={selected.a} b={selected.b} className="absolute inset-0 h-full w-full object-cover" />}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-ink/5" />
            <div className="absolute left-4 top-4 z-10 rounded-full border border-bone/15 bg-ink/85 px-3 py-1.5 font-mono text-[10px] text-cyan">{isVideoSelected ? 'YOUTUBE · SELECTED' : isPlaying ? 'NOW PLAYING' : sourceStatus.toUpperCase()}</div>
            {!external && !video && <button type="button" onClick={() => local.toggleFavorite(selected.id)} aria-label={isFav ? 'Remove favorite' : 'Add favorite'} aria-pressed={isFav} className={`absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-bone/15 bg-ink/80 text-lg ${isFav ? 'text-pink-400' : 'text-bone/80 hover:text-pink-300'}`}>{isFav ? '♥' : '♡'}</button>}
            <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6"><p className="text-[10px] font-mono uppercase tracking-widest text-cyan">{sourceStatus}</p><h3 className="mt-2 break-words font-display text-2xl font-extrabold leading-tight sm:text-4xl">{title}</h3><p className="mt-1 text-sm text-bone/75 sm:text-base">{artist}</p>{!external && !video && <span aria-hidden className="absolute bottom-4 right-5 font-display text-5xl font-black text-white/20 sm:text-7xl">{selected.bpm}</span>}</div>
            {isVideoSelected && <div className="absolute inset-x-3 bottom-3 z-20 flex flex-wrap gap-2 sm:inset-x-5 sm:bottom-5">
              <button type="button" disabled={!video?.embeddable} onClick={universal.enterVideoMode} className="min-h-11 rounded-full bg-cyan px-4 text-xs font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50">{video?.embeddable ? 'Video Mode · official player' : 'Video embedding unavailable'}</button>
              {video?.watchUrl && <a href={video.watchUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-white/25 bg-ink/85 px-4 text-xs font-semibold text-white hover:border-cyan">Open on YouTube ↗</a>}
            </div>}
          </>}
        </div>
        <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 text-[10px] sm:grid-cols-3 sm:gap-3 sm:text-xs">
          {[[video ? 'Provider' : external?.album ? 'Album' : 'Genre', video ? 'YouTube' : external?.album || selected.genre], ['Duration', external?.playbackKind === 'preview' ? 'Preview only' : fmt(mediaDuration)], ['Released', video ? 'Not provided' : external?.releaseDate?.slice(0, 10) || selected.date]].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border border-bone/10 bg-void/35 p-2.5 sm:p-3"><p className="font-mono text-bone/45">{label}</p><p className="mt-1 truncate font-semibold text-bone/80">{value}</p></div>)}
        </div>
        {isVideo && <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs leading-5 text-bone/55">Official YouTube controls remain inside the full-size video frame.</p><button type="button" onClick={universal.exitVideoMode} className="min-h-10 rounded-full border border-bone/15 px-4 text-xs text-bone/70 hover:border-cyan hover:text-cyan">Return to artwork</button></div>}
      </div>

      <div className="min-w-0 space-y-4">
        <Search q="" embedded />
        <section aria-label="Playback controls" className="min-w-0 rounded-3xl border border-bone/12 bg-ink/85 p-4 shadow-xl sm:p-6">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-mono uppercase tracking-[.18em] text-cyan">UNIFIED PLAYBACK</p><h3 className="mt-1 break-words font-display text-xl font-bold sm:text-2xl">{title}</h3><p className="mt-1 break-words text-sm text-bone/65">{artist} · {sourceStatus}</p></div>{video?.watchUrl && <a href={video.watchUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-bone/15 px-3 text-xs text-bone/65 hover:border-cyan hover:text-cyan">Open on YouTube ↗</a>}{external?.trackUrl && <a href={external.trackUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-bone/15 px-3 text-xs text-bone/65 hover:border-cyan hover:text-cyan">Open {external.provider} ↗</a>}</div>
          <div className="mt-4"><PlayerVisualizer /></div>
          {(video || external?.playbackKind === 'subscription') && <p role="status" className="mt-2 text-[10px] leading-5 text-bone/50">Limited reactivity: {video ? 'YouTube’s official player does not expose audio samples to the AAK analyser.' : 'Apple MusicKit does not expose its audio samples to the AAK analyser.'} The visualizer is idle and the local equalizer is unavailable for this source.</p>}
          {video && !videoMode && <div className="mt-4 rounded-2xl border border-bone/10 bg-void/35 p-4">
            <p className="text-sm font-semibold">Audio Mode unavailable for this YouTube item</p><p className="mt-1 text-xs leading-5 text-bone/55">YouTube does not provide this site an authorized audio-only stream. This is a paused artwork selection; choose Video Mode to use the full official player, or search Apple Music, Spotify, or AAK for an authorized audio source.</p>
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!video.embeddable} onClick={universal.enterVideoMode} className="min-h-11 rounded-full bg-cyan px-4 text-xs font-bold text-ink disabled:opacity-45">{video.embeddable ? 'Enter Video Mode' : 'Embedding unavailable'}</button><button type="button" onClick={() => universal.closeVideo()} className="min-h-11 rounded-full border border-bone/15 px-4 text-xs text-bone/65 hover:border-cyan hover:text-cyan">Clear selection</button></div>
          </div>}
          {isVideo && <div className="mt-4 space-y-3"><PlaybackTimeline mode="video" fallbackDuration={video?.durationSeconds || 0} onSeek={seek} label="Seek YouTube video" /><div className="flex min-w-0 flex-wrap items-center gap-2"><button type="button" disabled={!universal.videoReady} onClick={toggle} aria-label={isPlaying ? 'Pause YouTube video' : 'Play YouTube video'} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-bone text-ink hover:bg-cyan disabled:opacity-40"><Icon n={isPlaying ? 'pause' : 'play'} /></button><VisualizerToolbar embedded /><EqualizerControl available={false} /><label className="flex min-h-10 items-center gap-2 rounded-full border border-bone/10 px-3 text-[9px] font-mono text-bone/55"><span>VOL</span><input aria-label="YouTube player volume" type="range" min={0} max={1} step={0.01} value={volume} disabled={!universal.videoReady} onChange={(event) => setVolume(Number(event.target.value))} className="w-24 accent-cyan disabled:opacity-40" /></label></div>{universal.error && <p role="alert" className="text-xs leading-5 text-amber-100/80">{universal.error}</p>}</div>}
          {!video && <>
            <div className="mt-4"><PlaybackTimeline mode={external ? 'external' : 'local'} fallbackDuration={external?.durationSeconds || selected.dur} onSeek={seek} label="Seek track position" /></div>
            <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1">
                <button type="button" onClick={toggleShuffle} aria-label={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'} aria-pressed={shuffle} className={`grid h-10 w-10 place-items-center rounded-full ${shuffle ? 'text-cyan' : 'text-bone/55 hover:text-bone'}`}>⇄</button>
                <button type="button" onClick={previous} aria-label="Previous track" className="grid h-10 w-10 place-items-center rounded-full text-bone/75 hover:text-cyan"><Icon n="prev" /></button>
                <button type="button" onClick={toggle} aria-label={isPlaying ? 'Pause' : 'Play'} className="grid h-14 w-14 place-items-center rounded-full bg-bone text-ink shadow-md transition hover:bg-cyan active:scale-95"><Icon n={isPlaying ? 'pause' : 'play'} s={22} /></button>
                <button type="button" onClick={next} aria-label="Next track" className="grid h-10 w-10 place-items-center rounded-full text-bone/75 hover:text-cyan"><Icon n="next" /></button>
                <button type="button" onClick={toggleRepeat} aria-label={`Repeat ${repeat}`} aria-pressed={repeat !== 'off'} className={`grid h-10 w-10 place-items-center rounded-full ${repeat !== 'off' ? 'text-cyan' : 'text-bone/55 hover:text-bone'}`}>⟳{repeat === 'one' && <span className="sr-only">one</span>}</button>
                <VisualizerToolbar embedded /><EqualizerControl available={!external || external.playbackKind !== 'subscription'} />
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2"><label className="flex min-h-10 items-center gap-2 rounded-full border border-bone/10 px-3 text-[9px] font-mono text-bone/55"><span>VOL</span><input aria-label="Player volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="w-20 accent-cyan" /></label>{external?.videoVersion && <button type="button" onClick={() => openVideo(external.videoVersion as YouTubeResult)} className="min-h-10 rounded-full border border-cyan/30 px-3 text-xs text-cyan hover:bg-cyan/10">Video Mode</button>}{!external && <button type="button" onClick={() => ui.openSearch(`${selected.title} ${selected.artist}`)} className="min-h-10 rounded-full border border-bone/15 px-3 text-xs text-bone/65 hover:border-cyan hover:text-cyan">Find video</button>}
                <button type="button" onClick={() => setDetailsTab((value) => value ? null : 'info')} aria-expanded={detailsTab !== null} className="min-h-10 rounded-full border border-bone/15 px-3 text-xs text-bone/65 hover:border-cyan hover:text-cyan">Track info & lyrics</button>
                <button type="button" onClick={() => setQueueOpen((value) => !value)} aria-expanded={queueOpen} className="min-h-10 rounded-full border border-bone/15 px-3 text-xs text-bone/65 hover:border-cyan hover:text-cyan">Queue</button>
              </div>
            </div>
            {external?.playbackKind === 'preview' && clock.duration > 0 && <p className="mt-2 text-center text-[10px] text-bone/45">{external.provider} preview · {Math.round(clock.duration)} seconds playable; not a full track.</p>}
          </>}
          {detailsTab && <div className="mt-4 max-h-[min(60dvh,34rem)] overflow-y-auto overscroll-contain rounded-2xl border border-bone/10 bg-void/35 p-3 sm:p-4">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Track details"><button type="button" role="tab" aria-selected={detailsTab === 'info'} onClick={() => setDetailsTab('info')} className={`min-h-10 rounded-full px-4 text-[10px] font-mono ${detailsTab === 'info' ? 'bg-cyan text-ink' : 'border border-bone/10 text-bone/60'}`}>INFORMATION</button><button type="button" role="tab" aria-selected={detailsTab === 'lyrics'} onClick={() => setDetailsTab('lyrics')} className={`min-h-10 rounded-full px-4 text-[10px] font-mono ${detailsTab === 'lyrics' ? 'bg-cyan text-ink' : 'border border-bone/10 text-bone/60'}`}>LYRICS</button><button type="button" onClick={() => setDetailsTab(null)} aria-label="Close track information" className="ml-auto grid h-10 w-10 place-items-center rounded-full border border-bone/10 text-bone/65 hover:text-bone">×</button></div>
            {detailsTab === 'info' ? <div role="tabpanel" className="mt-3 text-xs leading-6 text-bone/65"><p><strong>{title}</strong> · {artist}</p><p>{video ? 'YouTube · official video listing' : external ? `${external.provider} · ${external.playbackKind === 'preview' ? 'preview audio' : external.playbackKind === 'subscription' ? 'subscriber playback' : 'catalog item'}` : `AAK Music · ${selected.genre} · ${selected.bpm} BPM · ${selected.date}`}{external?.album && ` · ${external.album}`}{external?.releaseDate && ` · ${external.releaseDate}`}{external?.explicit && ' · Explicit'}</p>{video?.watchUrl && <a href={video.watchUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center text-cyan underline underline-offset-2">Open official YouTube page ↗</a>}{external?.trackUrl && <a href={external.trackUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center text-cyan underline underline-offset-2">Open original provider page ↗</a>}</div> : <div role="tabpanel" className="mt-3"><LyricsAssistant context={lyricsContext} /></div>}
          </div>}
          {queueOpen && !video && <div role="region" aria-label="Playback queue" className="mt-4 max-h-[min(45dvh,20rem)] overflow-y-auto overscroll-contain rounded-2xl border border-bone/10 bg-void/35 p-2">{external ? universal.queue.map((item, index) => <button type="button" key={`${item.provider}:${item.id}`} onClick={() => universal.playQueued(index)} className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-xs ${index === universal.queueIndex ? 'bg-cyan/10 text-cyan' : 'hover:bg-bone/5'}`}><span className="min-w-0 truncate">{item.title} · {item.artist}</span><span className="shrink-0 text-[10px] text-bone/45">{item.provider}</span></button>) : tracks.map((item, index) => <button type="button" key={item.id} onClick={() => local.play(index)} className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-xs ${index === currentIndex ? 'bg-cyan/10 text-cyan' : 'hover:bg-bone/5'}`}><span className="min-w-0 truncate">{index + 1}. {item.title}</span><span className="shrink-0 text-[10px] text-bone/45">{fmt(item.dur)}</span></button>)}</div>}
          {universal.error && !video && external && <p role="alert" className="mt-3 text-xs text-amber-100/80">{universal.error}</p>}
        </section>
      </div>
    </div>
  </section>;
}
