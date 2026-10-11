import { useEffect, useRef, useState } from 'react';
import { tracks } from '../data';
import { fmt, statusLabel, usePlayer, useTime } from '../hooks/usePlayer';
import { useUniversalPlayer } from '../hooks/useUniversalPlayer';
import { useUniversalPlayerTime } from '../hooks/useUniversalPlayer';
import { useUI } from '../hooks/useUI';
import type { AudioCatalogTrack } from '../services/music/types';
import Art from './Art';
import Icon from './Icon';
import VisualizerToolbar from './VisualizerToolbar';
import EqualizerControl from './EqualizerControl';
import FullPlayerModal from './FullPlayerModal';

export default function UniversalPlayer() {
  const local = usePlayer();
  const localTime = useTime();
  const player = useUniversalPlayer();
  const playerClock = useUniversalPlayerTime();
  const ui = useUI();
  const [queueOpen, setQueueOpen] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const previousVolume = useRef(0.85);
  const localRef = useRef(local);
  const universalRef = useRef(player);
  const clockRef = useRef(playerClock);
  localRef.current = local;
  universalRef.current = player;
  clockRef.current = playerClock;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (universalRef.current.activeAudio || universalRef.current.activeVideo) universalRef.current.toggle();
        else localRef.current.toggle();
      } else if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        if (universalRef.current.activeVideo) universalRef.current.setVideoVolume(universalRef.current.volume > 0 ? 0 : previousVolume.current || 0.85);
        else if (universalRef.current.activeAudio) universalRef.current.setVolume(universalRef.current.volume > 0 ? 0 : previousVolume.current || 0.85);
        else if (localRef.current.vol > 0) { previousVolume.current = localRef.current.vol; localRef.current.setVol(0); }
        else localRef.current.setVol(previousVolume.current || 0.85);
      } else if (event.code === 'ArrowRight' && (event.metaKey || event.ctrlKey || event.altKey)) {
        event.preventDefault();
        if (universalRef.current.activeVideo) universalRef.current.seekVideo(clockRef.current.videoTime + 5);
        else if (universalRef.current.activeAudio) universalRef.current.next(); else localRef.current.next();
      } else if (event.code === 'ArrowLeft' && (event.metaKey || event.ctrlKey || event.altKey)) {
        event.preventDefault();
        if (universalRef.current.activeVideo) universalRef.current.seekVideo(clockRef.current.videoTime - 5);
        else if (universalRef.current.activeAudio) universalRef.current.prev(); else localRef.current.prev();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (!queueOpen && !volumeOpen && !detailsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setQueueOpen(false); setVolumeOpen(false); setDetailsOpen(false);
    };
    const onOutside = (event: PointerEvent) => {
      if (dockRef.current?.contains(event.target as Node)) return;
      setQueueOpen(false); setVolumeOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onOutside);
    return () => { window.removeEventListener('keydown', onKeyDown); document.removeEventListener('pointerdown', onOutside); };
  }, [queueOpen, volumeOpen, detailsOpen]);

  const video = player.activeVideo;
  if (local.isExpanded) return <FullPlayerModal />;

  const external = player.activeAudio;
  const track = local.track;
  const title = video?.title || external?.title || track.title;
  const artist = video?.artist || external?.artist || track.artist;
  const provider = video ? 'YouTube' : external?.provider || 'AAK Music';
  const isPlaying = video ? player.videoPlaying : external ? player.playing : local.playing;
  const currentTime = video ? playerClock.videoTime : external ? playerClock.time : localTime.t;
  const duration = video ? (playerClock.videoDuration || video.durationSeconds || 0) : external ? (playerClock.duration || external.durationSeconds || 0) : (localTime.dur || track.dur);
  const volume = video || external ? player.volume : local.vol;
  const repeat = external ? player.repeat : local.repeat;
  const shuffle = external ? player.shuffle : local.shuffle;
  const canSeek = video ? player.videoMode && player.videoReady && playerClock.videoDuration > 0 : external ? playerClock.duration > 0 : Boolean(track.src && localTime.dur > 0);
  const playToggle = video ? player.toggleVideo : external ? player.toggle : local.toggle;
  const setVolume = video || external ? player.setVolume : local.setVol;
  const seek = video ? player.seekVideo : external ? player.seek : local.seek;
  const previous = external ? player.prev : local.prev;
  const next = external ? player.next : local.next;
  const toggleShuffle = () => external ? player.setShuffle(!shuffle) : local.toggleShuffle();
  const toggleRepeat = () => external ? player.setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off') : local.toggleRepeat();
  const queue = video ? [] : external ? player.queue : tracks;
  const mediaLabel = video ? (player.videoMode ? 'Official YouTube video' : 'Selected · paused; open Video Mode') : external ? (external.playbackKind === 'preview' ? 'Preview playback' : external.playbackKind === 'subscription' ? 'Apple Music subscriber playback' : 'Full stream playback') : 'Full AAK Music release';

  return <>
    <div ref={dockRef} role="region" aria-label="Unified AAK Music player" className="fixed inset-x-0 bottom-0 z-50 w-full max-w-[100vw] border-t border-bone/15 bg-ink/95 text-bone shadow-2xl backdrop-blur-2xl mobile-player-safe">
          {queueOpen && <div role="dialog" aria-label="Playback queue" className="absolute bottom-[calc(100%+0.6rem)] right-2 z-[70] max-h-[55vh] w-[min(25rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl border border-bone/15 bg-ink/98 p-3 text-bone shadow-2xl sm:right-6 sm:p-4">
      <div className="flex items-center justify-between border-b border-bone/10 px-2 pb-2"><p className="text-xs font-mono uppercase tracking-wider text-cyan">Playback queue · {queue.length}</p><button type="button" aria-label="Close queue" onClick={() => setQueueOpen(false)} className="grid h-11 w-11 place-items-center rounded-lg text-xl hover:bg-bone/10">×</button></div>
      <ul className="mt-2 space-y-1">{queue.map((item, index) => {
        const isExternal = Boolean(external);
        const itemImage = 'image' in item ? item.image : '';
        return <li key={isExternal ? `${(item as AudioCatalogTrack).provider}:${item.id}` : item.id}><button type="button" onClick={() => isExternal ? player.playQueued(index) : local.play(index)} className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-2 text-left ${index === (isExternal ? player.queueIndex : local.i) ? 'bg-cyan/10 text-cyan' : 'hover:bg-bone/5'}`}>
          {itemImage ? <img src={itemImage} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" /> : <span className="h-9 w-9 shrink-0 rounded-md bg-bone/10" />}
          <span className="min-w-0 flex-1"><span className="block truncate text-sm">{item.title}</span><span className="block truncate text-[11px] text-bone/55">{item.artist}{'provider' in item ? ` · ${item.provider}` : ` · ${item.genre}`}</span></span>
        </button></li>;
      })}</ul>
      {external && <button type="button" onClick={player.clearQueue} className="mt-3 min-h-10 w-full text-right text-xs text-bone/55 hover:text-cyan">Clear queue</button>}
    </div>}
      <input aria-label="Seek current track" type="range" min={0} max={duration || 1} step={0.1} value={Math.min(currentTime, duration || 0)} disabled={!canSeek} onChange={(event) => seek(Number(event.target.value))} className="absolute inset-x-0 top-0 h-1 w-full cursor-pointer accent-cyan disabled:cursor-default disabled:opacity-40" />
      <div className="mx-auto grid w-full min-w-0 max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-3 pb-2 pt-2 sm:grid-cols-[minmax(10rem,1fr)_auto_minmax(10rem,1fr)] sm:gap-4 sm:px-6 sm:pb-2.5 sm:pt-3 md:px-12">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {video?.thumbnail ? <button type="button" onClick={() => local.setIsExpanded(true)} aria-label="Open selected YouTube video in the player" className="shrink-0 overflow-hidden rounded-lg"><img src={video.thumbnail} alt="" className="h-10 w-14 object-cover sm:h-12 sm:w-[4.25rem]" /></button> : external ? (external.image ? <img src={external.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover sm:h-12 sm:w-12" /> : <div className="h-10 w-10 shrink-0 rounded-lg bg-raised sm:h-12 sm:w-12" />) : <button type="button" onClick={() => local.setIsExpanded(true)} aria-label="Open full player" className="shrink-0 overflow-hidden rounded-lg"><Art a={track.a} b={track.b} image={track.image} className="h-10 w-10 object-cover sm:h-12 sm:w-12" /></button>}
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold sm:text-sm">{title}</p><p className="truncate text-[10px] text-bone/60 sm:text-xs">{artist}</p><p className="truncate text-[9px] font-mono uppercase tracking-wider text-cyan sm:text-[10px]">{player.error || `${provider} · ${mediaLabel}`}</p></div>
          {!video && !external && <button type="button" onClick={() => local.toggleFavorite(track.id)} aria-label={local.isFavorite(track.id) ? 'Remove favorite' : 'Add favorite'} aria-pressed={local.isFavorite(track.id)} className={`hidden h-10 w-10 shrink-0 place-items-center rounded-full sm:grid ${local.isFavorite(track.id) ? 'text-pink-400' : 'text-bone/50 hover:text-pink-300'}`}><span aria-hidden="true">{local.isFavorite(track.id) ? '♥' : '♡'}</span></button>}
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-0.5 sm:justify-center sm:gap-1">
          {!video && <button type="button" onClick={toggleShuffle} aria-label={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'} aria-pressed={shuffle} className={`hidden h-10 w-10 place-items-center rounded-full sm:grid ${shuffle ? 'text-cyan' : 'text-bone/55 hover:text-bone'}`}>⇄</button>}
          {!video && <button type="button" onClick={previous} aria-label="Previous track" className="grid h-10 w-10 place-items-center rounded-full text-bone/80 hover:text-cyan"><Icon n="prev" /></button>}
          {!video && <button type="button" onClick={playToggle} aria-label={isPlaying ? 'Pause' : 'Play'} className="grid h-11 w-11 place-items-center rounded-full bg-bone text-ink hover:bg-cyan"><Icon n={isPlaying ? 'pause' : 'play'} /></button>}
          {!video && <button type="button" onClick={next} aria-label="Next track" className="grid h-10 w-10 place-items-center rounded-full text-bone/80 hover:text-cyan"><Icon n="next" /></button>}
          {!video && <VisualizerToolbar embedded />}
          {!video && <EqualizerControl available={!external || external.playbackKind !== 'subscription'} />}
          {!video && <button type="button" onClick={toggleRepeat} aria-label={`Repeat ${repeat}`} aria-pressed={repeat !== 'off'} className={`hidden h-10 w-10 place-items-center rounded-full sm:grid ${repeat !== 'off' ? 'text-cyan' : 'text-bone/55 hover:text-bone'}`}>⟲{repeat === 'one' && <span className="sr-only">one</span>}</button>}
          {video && <button type="button" onClick={() => { if (player.videoMode) local.setIsExpanded(true); else { local.setIsExpanded(true); player.enterVideoMode(); } }} className="min-h-10 rounded-full border border-cyan/35 px-4 text-[10px] font-semibold text-cyan hover:bg-cyan/10">{player.videoMode ? 'Open Video' : 'Video Mode'}</button>}
        </div>
        <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-bone/10 pt-1.5 sm:col-span-1 sm:flex-nowrap sm:justify-end sm:border-0 sm:pt-0">
          <div className="flex w-full min-w-0 items-center justify-between gap-1.5 text-[9px] font-mono tabular-nums text-bone/55 sm:w-auto sm:flex-1 sm:justify-start sm:gap-2 sm:text-[10px]"><span>{fmt(currentTime)}</span><input aria-label="Seek position" type="range" min={0} max={duration || 1} step={0.1} value={Math.min(currentTime, duration || 0)} disabled={!canSeek} onChange={(event) => seek(Number(event.target.value))} className="h-2 min-w-8 w-[12vw] max-w-36 accent-cyan disabled:opacity-40 sm:min-w-12 sm:w-32" /><span>{duration ? fmt(duration) : '0:00'}</span></div>
          <div className="relative flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
            {video?.watchUrl && <a href={video.watchUrl} target="_blank" rel="noreferrer" className="min-h-10 items-center rounded-lg px-2 text-[10px] text-bone/55 underline underline-offset-2 hover:text-cyan">Open YouTube</a>}
            {external?.trackUrl && <a href={external.trackUrl} target="_blank" rel="noreferrer" className="hidden min-h-10 items-center rounded-lg px-2 text-[10px] text-bone/55 underline underline-offset-2 hover:text-cyan md:inline-flex">Open {external.provider}</a>}
            {external?.videoVersion && <button type="button" aria-label="Switch to video mode" onClick={() => player.playVideo(external.videoVersion!)} className="min-h-10 rounded-lg border border-cyan/30 px-2 text-[10px] text-cyan hover:bg-cyan/10"><span className="hidden sm:inline">Video mode</span><span className="sm:hidden">Video</span></button>}
            {!video && external && !external.videoVersion && <button type="button" aria-label="Find a video version" title="Search for a matching video" onClick={() => ui.openSearch(`${title} ${artist}`)} className="min-h-10 rounded-lg border border-bone/15 px-2 text-[10px] text-bone/65 hover:border-cyan hover:text-cyan"><span className="hidden sm:inline">Find video</span><span className="sm:hidden">Find</span></button>}
            {!video && !external && <button type="button" aria-label="Find a video version" onClick={() => ui.openSearch(`${track.title} ${track.artist}`)} className="hidden min-h-10 items-center rounded-lg border border-bone/15 px-2 text-[10px] text-bone/65 hover:border-cyan hover:text-cyan md:inline-flex">Find video version</button>}
            <button type="button" onClick={() => setDetailsOpen((open) => !open)} aria-expanded={detailsOpen} aria-label="Track information and lyrics" title="Track information and lyrics" className={`grid h-10 w-10 place-items-center rounded-lg ${detailsOpen ? 'text-cyan' : 'text-bone/55 hover:text-cyan'}`}>i</button>
            {!video && <button type="button" onClick={() => setQueueOpen((open) => !open)} aria-expanded={queueOpen} aria-label={`Playback queue, ${queue.length} tracks`} className={`grid h-10 w-10 place-items-center rounded-lg ${queueOpen ? 'text-cyan' : 'text-bone/55 hover:text-cyan'}`}>☷</button>}
            {!video && <button type="button" onClick={() => setVolumeOpen((open) => !open)} aria-expanded={volumeOpen} aria-label="Volume control" className="grid h-10 w-10 place-items-center rounded-lg text-[9px] font-mono text-bone/55 hover:text-cyan lg:hidden">VOL</button>}
            {volumeOpen && <div role="group" aria-label="Volume control" className="absolute bottom-[calc(100%+0.5rem)] right-0 flex w-48 items-center gap-3 rounded-xl border border-bone/15 bg-ink/98 p-3 shadow-xl lg:hidden"><label htmlFor="unified-player-volume" className="text-[10px] font-mono text-bone/60">VOLUME</label><input id="unified-player-volume" aria-label="Volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="min-w-0 flex-1 accent-cyan" /></div>}
            {!video && <label className="hidden items-center gap-1.5 lg:flex" title="Volume"><span className="sr-only">Volume</span><input aria-label="Volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="h-2 w-16 accent-cyan" /></label>}
          </div>
        </div>
      </div>
      {video && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-bone/10 px-4 py-2"><p className="text-[10px] text-bone/50">The official YouTube player is paused while this compact dock is shown.</p><button type="button" onClick={player.closeVideo} className="min-h-9 text-[10px] text-bone/55 underline underline-offset-2 hover:text-cyan">Clear selection</button></div>}
      {detailsOpen && !video && <div className="border-t border-bone/10 bg-ink/98 px-4 py-3 sm:px-8"><div className="mx-auto grid w-full max-w-6xl gap-3 text-xs sm:grid-cols-2">
        <section aria-label="Track information" className="rounded-xl border border-bone/10 p-3"><h2 className="font-mono uppercase tracking-wider text-cyan">Track information</h2><p className="mt-2 font-semibold">{title}</p><p className="mt-1 text-bone/60">{artist}</p><p className="mt-1 text-bone/50">{provider} · {mediaLabel}{external?.album ? ` · ${external.album}` : ''}{external?.genre ? ` · ${external.genre}` : ''}{external?.releaseDate ? ` · ${external.releaseDate}` : ''}{external?.explicit ? ' · Explicit' : ''}{!external ? ` · ${track.genre} · ${track.bpm} BPM · ${track.date}` : ''}</p>{external?.durationSeconds && <p className="mt-1 text-bone/50">Catalog duration: {fmt(external.durationSeconds)}{external.playbackKind === 'preview' && playerClock.duration ? ` · Preview: ${fmt(playerClock.duration)}` : ''}</p>}{external?.trackUrl && <a href={external.trackUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block min-h-9 text-cyan underline underline-offset-2">Original provider page</a>}{!external && <button type="button" aria-label="Find a video version" onClick={() => ui.openSearch(`${track.title} ${track.artist}`)} className="mt-2 block min-h-10 text-cyan underline underline-offset-2">Find a video version</button>}</section>
        <section aria-label="Lyrics" className="rounded-xl border border-bone/10 p-3"><h2 className="font-mono uppercase tracking-wider text-cyan">Lyrics</h2><p className="mt-2 font-semibold">Lyrics unavailable</p><p className="mt-1 leading-5 text-bone/55">No licensed lyrics provider is configured. This player does not scrape or invent lyrics.</p></section>
      </div></div>}
      {external?.playbackKind === 'preview' && playerClock.duration > 0 && <p className="border-t border-bone/10 px-4 py-1 text-center text-[10px] text-bone/45">{external.provider} preview · {Math.round(playerClock.duration)} seconds playable; full track length belongs to the provider listing.</p>}
      {player.error && external && <p role="alert" className="border-t border-bone/10 px-4 py-1 text-center text-xs text-amber-200">{player.error}</p>}
    </div>
  </>;
}
