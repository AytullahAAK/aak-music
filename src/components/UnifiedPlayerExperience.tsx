import { useCallback, useMemo, useRef, useState } from 'react';
import { tracks } from '../data';
import Art from '../components/Art';
import Icon, { Eq } from '../components/Icon';
import Search from '../components/Search';
import PlayerVisualizer from '../components/PlayerVisualizer';
import VisualizerToolbar from '../components/VisualizerToolbar';
import EqualizerControl from '../components/EqualizerControl';
import LyricsAssistant from '../components/LyricsAssistant';
import YouTubeVideoModal from '../components/YouTubeVideoModal';
import { usePlayer, useTime, fmt, statusLabel } from '../hooks/usePlayer';
import { useUniversalPlayer } from '../hooks/useUniversalPlayer';
import { useUniversalPlayerTime } from '../hooks/useUniversalPlayer';
import { useUI } from '../hooks/useUI';
import { useReveal } from '../hooks/useReveal';
import { useParallax } from '../hooks/useParallax';

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

export default function Featured() {
  const local = usePlayer();
  const universal = useUniversalPlayer();
  const ui = useUI();
  const external = universal.activeAudio;
  const video = universal.activeVideo;
  const selected = local.track;
  const title = video?.title || external?.title || selected.title;
  const artist = video?.artist || external?.artist || selected.artist;
  const image = video?.thumbnail || external?.image || selected.image;
  const on = video ? universal.videoPlaying : external ? universal.playing : local.playing;
  const volume = video || external ? universal.volume : local.vol;
  const repeat = external ? universal.repeat : local.repeat;
  const shuffle = external ? universal.shuffle : local.shuffle;
  const ref = useReveal<HTMLDivElement>();
  const bpm = useParallax<HTMLSpanElement>(-0.07);
  const [queueOpen, setQueueOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'info' | 'lyrics' | null>(null);
  const isFav = local.isFavorite(selected.id);
  const currentIndex = useMemo(() => tracks.findIndex((track) => track.id === selected.id), [selected.id]);

  const toggle = () => video ? universal.toggleVideo() : external ? universal.toggle() : local.toggle();
  const previous = () => external ? universal.prev() : local.prev();
  const next = () => external ? universal.next() : local.next();
  const seek = (value: number) => video ? universal.seekVideo(value) : external ? universal.seek(value) : local.seek(value);
  const setVolume = (value: number) => video ? universal.setVideoVolume(value) : external ? universal.setVolume(value) : local.setVol(value);
  const toggleShuffle = () => external ? universal.setShuffle(!shuffle) : local.toggleShuffle();
  const toggleRepeat = () => external ? universal.setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off') : local.toggleRepeat();
  const sourceStatus = video ? 'YouTube video · official player controls' : external ? `${external.provider} · ${external.playbackKind === 'preview' ? 'preview only' : external.playbackKind === 'subscription' ? 'subscriber playback' : 'audio'}` : statusLabel(local.status) || (on ? 'Playing full AAK release' : 'AAK Music library');
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const onVideoPlayback = useCallback((state: number, time: number, total: number) => universal.syncVideo(state, time, total), [universal.syncVideo]);
  const onVideoController = useCallback((controller: Parameters<typeof universal.setVideoController>[0]) => {
    universal.setVideoController(controller);
    if (controller) controller.setVolume(volumeRef.current);
  }, [universal.setVideoController]);

  return <section id="player" className="relative isolate px-4 py-16 sm:px-6 md:px-12 md:py-24">
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden"><div className="absolute -left-1/4 top-0 h-full w-3/4" style={{ background: 'radial-gradient(closest-side,rgb(var(--accent) / var(--halo-a)),transparent)' }} /></div>
    <div ref={ref} className="reveal relative mx-auto grid min-w-0 max-w-[1600px] grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,.88fr)_minmax(0,1.12fr)] xl:gap-10">
      <div className="min-w-0 xl:sticky xl:top-24">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.22em] text-cyan">AAK MUSIC · MAIN PLAYER</p><h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Listen, search, and switch sources</h2></div><button type="button" onClick={() => external ? document.getElementById('player')?.scrollIntoView({ behavior: 'smooth' }) : local.setIsExpanded(true)} className="min-h-10 rounded-full border border-bone/15 px-4 text-[10px] font-mono text-bone/60 hover:border-cyan hover:text-cyan">{external ? 'PLAYER VIEW' : 'FULL PLAYER ↗'}</button></div>
        <div className={`relative mx-auto w-full min-w-0 max-w-[760px] overflow-hidden rounded-3xl border border-bone/10 bg-raised/25 shadow-2xl ${video ? 'aspect-video min-h-[200px]' : 'aspect-square'}`}>
          {video ? <YouTubeVideoModal inline video={video} onClose={universal.closeVideo} onPlayback={onVideoPlayback} onController={onVideoController} onPlayAudio={video.audioVersion ? () => universal.playAudio(video.audioVersion as NonNullable<typeof video.audioVersion>) : undefined} /> : external && image ? <img src={image} alt={`${title} artwork`} className="h-full w-full object-cover" /> : <Art a={selected.a} b={selected.b} image={selected.image} className="h-full w-full object-cover" />}
          {!video && <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-ink/10" />}
          {(on || video) && <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-ink/80 px-3 py-1.5 font-mono text-[10px] text-cyan backdrop-blur-md">{!video && <Eq on />}<span>{video ? "VIDEO MODE" : "NOW PLAYING"}</span></div>}
          {!external && !video && <button type="button" onClick={() => local.toggleFavorite(selected.id)} aria-label={isFav ? 'Remove favorite' : 'Add favorite'} aria-pressed={isFav} className={`absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-ink/80 text-xl backdrop-blur-md ${isFav ? 'text-pink-400' : 'text-bone/75 hover:text-pink-300'}`}>{isFav ? '♥' : '♡'}</button>}
{!video && <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6"><p className="text-[10px] font-mono uppercase tracking-widest text-cyan">{sourceStatus}</p><h3 className="mt-2 break-words font-display text-2xl font-extrabold leading-tight sm:text-4xl">{title}</h3><p className="mt-1 text-sm text-bone/75 sm:text-base">{artist}</p>{!external && <span ref={bpm} aria-hidden className="absolute bottom-4 right-5 font-display text-5xl font-black text-white/20 sm:text-7xl">{selected.bpm}</span>}</div>}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] sm:gap-3 sm:text-xs">{[[video ? "Provider" : external?.album ? "Album" : "Genre", video ? "YouTube" : external?.album || selected.genre], ["Duration", external?.playbackKind === "preview" ? "Preview only" : fmt(video?.durationSeconds || external?.durationSeconds || selected.dur)], ["Released", video ? "Not provided" : external?.releaseDate?.slice(0, 10) || selected.date]].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border border-bone/10 bg-void/35 p-2.5 sm:p-3"><p className="font-mono text-bone/45">{label}</p><p className="mt-1 truncate font-semibold text-bone/80">{value}</p></div>)}</div>
      </div>

      <div className="min-w-0 space-y-4">
        <Search q="" embedded />
        <section aria-label="Playback controls" className="min-w-0 rounded-3xl border border-bone/12 bg-ink/75 p-4 shadow-xl backdrop-blur-xl sm:p-6">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-mono uppercase tracking-[.18em] text-cyan">UNIFIED PLAYBACK</p><h3 className="mt-1 truncate font-display text-xl font-bold sm:text-2xl">{title}</h3><p className="mt-1 truncate text-sm text-bone/60">{artist} · {sourceStatus}</p></div></div>
          <PlayerVisualizer />{(video || external?.playbackKind === 'subscription') && <p role="status" className="mt-2 text-[10px] leading-5 text-bone/45">Limited reactivity: {video ? 'the official YouTube player' : 'Apple MusicKit'} does not expose its audio to AAK's analyser. The visualizer is idle and the equalizer is disabled for this source.</p>}
          {!video ? <>
            <PlaybackTimeline mode={external ? 'external' : 'local'} fallbackDuration={external?.durationSeconds || selected.dur} onSeek={seek} label="Seek track position" />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-1 sm:justify-start"><button type="button" onClick={toggleShuffle} aria-label={shuffle ? "Turn shuffle off" : "Turn shuffle on"} aria-pressed={shuffle} className={"grid h-10 w-10 place-items-center rounded-full " + (shuffle ? "text-cyan" : "text-bone/55 hover:text-bone")}>⇄</button><button type="button" onClick={previous} aria-label="Previous track" className="grid h-10 w-10 place-items-center rounded-full text-bone/75 hover:text-cyan"><Icon n="prev" /></button><button type="button" onClick={toggle} aria-label={on ? "Pause" : "Play"} className="grid h-14 w-14 place-items-center rounded-full bg-bone text-ink shadow-lg hover:bg-cyan"><Icon n={on ? "pause" : "play"} s={22} /></button><button type="button" onClick={next} aria-label="Next track" className="grid h-10 w-10 place-items-center rounded-full text-bone/75 hover:text-cyan"><Icon n="next" /></button><button type="button" onClick={toggleRepeat} aria-label={"Repeat " + repeat} aria-pressed={repeat !== "off"} className={"grid h-10 w-10 place-items-center rounded-full " + (repeat !== "off" ? "text-cyan" : "text-bone/55 hover:text-bone")}>⟳{repeat === "one" && <span className="sr-only">one</span>}</button><VisualizerToolbar embedded /><EqualizerControl available={!video && external?.playbackKind !== 'subscription'} /></div>
              <div className="flex flex-wrap items-center justify-end gap-2"><label className="flex min-h-10 items-center gap-2 rounded-full border border-bone/10 px-3 text-[9px] font-mono text-bone/50"><span>VOL</span><input aria-label="Player volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="w-20 accent-cyan" /></label>{external?.trackUrl && <a href={external.trackUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-bone/15 px-3 text-[10px] text-bone/65 hover:border-cyan hover:text-cyan">Open {external.provider} ↗</a>}{external?.videoVersion && <button type="button" onClick={() => universal.playVideo(external.videoVersion!)} className="min-h-10 rounded-full border border-cyan/30 px-3 text-[10px] text-cyan hover:bg-cyan/10">Video mode</button>}{!external && <button type="button" onClick={() => ui.openSearch(selected.title + " " + selected.artist)} className="min-h-10 rounded-full border border-bone/15 px-3 text-[10px] text-bone/60 hover:border-cyan hover:text-cyan">Find video version</button>}
                <button type="button" onClick={() => setDetailsTab((value) => value ? null : "info")} aria-expanded={detailsTab !== null} className="min-h-10 rounded-full border border-bone/15 px-3 text-[10px] text-bone/60 hover:border-cyan hover:text-cyan">Info & lyrics</button><button type="button" onClick={() => setQueueOpen((value) => !value)} aria-expanded={queueOpen} className="min-h-10 rounded-full border border-bone/15 px-3 text-[10px] text-bone/60 hover:border-cyan hover:text-cyan">Queue</button>
              </div>
            </div>
          </> : <>
            <p role="status" className="mt-3 rounded-xl border border-bone/10 px-3 py-2 text-[10px] leading-5 text-bone/50">Use the visible YouTube controls to play and seek this video. The official player does not expose its audio to the AAK visualizer or equalizer.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2"><PlaybackTimeline mode="video" fallbackDuration={video.durationSeconds || 0} onSeek={seek} label="Seek YouTube video" /><button type="button" onClick={toggle} disabled={!universal.videoReady} aria-label={on ? "Pause YouTube video" : "Play YouTube video"} className="grid h-11 w-11 place-items-center rounded-full bg-bone text-ink"><Icon n={on ? "pause" : "play"} /></button><VisualizerToolbar embedded /><EqualizerControl available={false} /><label className="flex min-h-10 items-center gap-2 rounded-full border border-bone/10 px-3 text-[9px] font-mono text-bone/50"><span>VOL</span><input aria-label="YouTube player volume" type="range" min={0} max={1} step={0.01} value={volume} disabled={!universal.videoReady} onChange={(event) => setVolume(Number(event.target.value))} className="w-20 accent-cyan disabled:opacity-40" /></label><a href={video.watchUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-bone/15 px-3 text-[10px] text-bone/65 hover:border-cyan hover:text-cyan">Open on YouTube ↗</a>{video.audioVersion && <button type="button" onClick={() => universal.playAudio(video.audioVersion!)} className="min-h-10 rounded-full border border-cyan/30 px-3 text-[10px] text-cyan hover:bg-cyan/10">Switch to Audio Mode</button>}<button type="button" onClick={() => setDetailsTab((value) => value ? null : "info")} aria-expanded={detailsTab !== null} className="min-h-10 rounded-full border border-bone/15 px-3 text-[10px] text-bone/60 hover:border-cyan hover:text-cyan">Info & lyrics</button></div>
          </>}          {detailsTab && <div className="mt-4 rounded-2xl border border-bone/10 bg-void/30 p-3 sm:p-4"><div role="tablist" aria-label="Track details" className="flex gap-2"><button type="button" role="tab" aria-selected={detailsTab === 'info'} onClick={() => setDetailsTab('info')} className={`min-h-9 rounded-full px-3 text-[10px] font-mono ${detailsTab === 'info' ? 'bg-cyan text-ink' : 'border border-bone/10 text-bone/55'}`}>INFORMATION</button><button type="button" role="tab" aria-selected={detailsTab === 'lyrics'} onClick={() => setDetailsTab('lyrics')} className={`min-h-9 rounded-full px-3 text-[10px] font-mono ${detailsTab === 'lyrics' ? 'bg-cyan text-ink' : 'border border-bone/10 text-bone/55'}`}>LYRICS</button></div>{detailsTab === 'info' ? <div className="mt-3 text-xs leading-6 text-bone/65"><p><strong>{title}</strong> · {artist}</p><p>{video ? "YouTube · official embedded video" : external ? external.provider + " · " + (external.playbackKind === "preview" ? "preview audio" : external.playbackKind === "subscription" ? "subscriber playback" : "catalog result") : "AAK Music · " + selected.genre + " · " + selected.bpm + " BPM · " + selected.date}{external?.album && " · " + external.album}{external?.releaseDate && " · " + external.releaseDate}{external?.explicit && " · Explicit"}</p>{video?.watchUrl && <a href={video.watchUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center text-cyan underline underline-offset-2">Open official YouTube page ↗</a>}{external?.trackUrl && <a href={external.trackUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center text-cyan underline underline-offset-2">Open original provider page ↗</a>}</div> : <LyricsAssistant />}</div>}
          {!video && queueOpen && <div className="mt-4 max-h-56 overflow-y-auto rounded-xl border border-bone/10 p-2">{external ? universal.queue.map((item, index) => <button type="button" key={`${item.provider}:${item.id}`} onClick={() => universal.playQueued(index)} className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-xs ${index === universal.queueIndex ? 'bg-cyan/10 text-cyan' : 'hover:bg-bone/5'}`}><span className="min-w-0 truncate">{item.title} · {item.artist}</span><span className="shrink-0 text-[10px] text-bone/45">{item.provider}</span></button>) : tracks.map((item, index) => <button type="button" key={item.id} onClick={() => local.play(index)} className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-xs ${index === currentIndex ? 'bg-cyan/10 text-cyan' : 'hover:bg-bone/5'}`}><span className="min-w-0 truncate">{index + 1}. {item.title}</span><span className="shrink-0 text-[10px] text-bone/45">{fmt(item.dur)}</span></button>)}</div>}
          {universal.error && external && <p role="alert" className="mt-3 text-xs text-amber-100/80">{universal.error}</p>}
        </section>

      </div>
    </div>
  </section>;
}