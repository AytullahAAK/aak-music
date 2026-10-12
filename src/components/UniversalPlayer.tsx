import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { tracks } from '../data';
import { fmt, usePlayer, useTime } from '../hooks/usePlayer';
import { useUniversalPlayer, useUniversalPlayerTime } from '../hooks/useUniversalPlayer';
import Art from './Art';
import Icon from './Icon';
import VisualizerToolbar from './VisualizerToolbar';
import EqualizerControl from './EqualizerControl';
import FullPlayerModal from './FullPlayerModal';
import YouTubeVideoModal from './YouTubeVideoModal';
import QueuePanel from './QueuePanel';
import { navigate, useLocation } from '../router';

type MiniPlayerPosition = { x: number; y: number };
type MiniPlayerDrag = { pointerId: number; startX: number; startY: number; originX: number; originY: number; width: number; height: number };
type MobileLongPress = MiniPlayerDrag & { timer: number; active: boolean };
const MINI_PLAYER_POSITION_KEY = 'aak-mini-player-position-v1';
const PHONE_MINI_PLAYER_QUERY = '(max-width: 639px) and (pointer: coarse)';
const PHONE_DRAG_HOLD_MS = 300;

function isPhoneMiniPlayerViewport() {
  return typeof window !== 'undefined' && window.matchMedia(PHONE_MINI_PLAYER_QUERY).matches;
}

interface DocumentPictureInPictureApi {
  window: Window | null;
  requestWindow: (options?: { width?: number; height?: number; preferInitialWindowPlacement?: boolean }) => Promise<Window>;
}

type PictureInPictureWindow = Window & { documentPictureInPicture?: DocumentPictureInPictureApi };

function supportsDocumentPictureInPicture() {
  return typeof window !== 'undefined' && window.isSecureContext &&
    typeof (window as PictureInPictureWindow).documentPictureInPicture?.requestWindow === 'function';
}

function copyPlayerStyles(target: Window) {
  const targetDocument = target.document;
  targetDocument.documentElement.dataset.theme = document.documentElement.dataset.theme || 'dark';
  targetDocument.documentElement.dataset.performanceMode = document.documentElement.dataset.performanceMode || 'balance';
  targetDocument.documentElement.lang = document.documentElement.lang || 'en';
  document.head.querySelectorAll('link[rel="stylesheet"], style').forEach((source) => {
    targetDocument.head.appendChild(source.cloneNode(true));
  });
  const style = targetDocument.createElement('style');
  style.textContent = `
    html, body, #aak-floating-player-root { width:100%; height:100%; margin:0; overflow:hidden; }
    body { background:rgb(var(--bg, 14 12 25)); color:rgb(var(--fg, 238 235 248)); font:13px/1.4 Inter, ui-sans-serif, system-ui, sans-serif; }
    .aak-pip { box-sizing:border-box; display:grid; grid-template-rows:auto minmax(0,1fr) auto; gap:9px; width:100%; height:100%; min-width:0; padding:12px; }
    .aak-pip__head { display:flex; align-items:center; justify-content:space-between; gap:8px; color:rgb(var(--accent2, 95 212 255)); font:600 9px/1 ui-monospace,monospace; letter-spacing:.16em; text-transform:uppercase; }
    .aak-pip__close,.aak-pip__button { display:grid; place-items:center; border:1px solid rgb(var(--fg)/.17); border-radius:999px; background:rgb(var(--surface, 21 18 37)); color:rgb(var(--fg)); cursor:pointer; }
    .aak-pip__close { width:30px; height:30px; }
    .aak-pip__content { display:flex; align-items:center; gap:12px; min-width:0; overflow:hidden; }
    .aak-pip__art { width:76px; height:76px; flex:none; border-radius:12px; background:rgb(var(--raised, 30 26 52)); object-fit:cover; }
    .aak-pip__meta { min-width:0; flex:1; }
    .aak-pip__title { overflow:hidden; color:rgb(var(--fg)); font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
    .aak-pip__artist { overflow:hidden; margin-top:3px; color:rgb(var(--fg)/.68); text-overflow:ellipsis; white-space:nowrap; }
    .aak-pip__provider { margin-top:5px; color:rgb(var(--accent2)); font:9px/1.2 ui-monospace,monospace; text-transform:uppercase; letter-spacing:.08em; }
    .aak-pip__controls { display:flex; align-items:center; gap:8px; }
    .aak-pip__button { width:34px; height:34px; }
    .aak-pip__button--play { width:42px; height:42px; border:0; background:rgb(var(--fg)); color:rgb(var(--bg)); }
    .aak-pip__timeline { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:7px; color:rgb(var(--fg)/.6); font:9px/1 ui-monospace,monospace; font-variant-numeric:tabular-nums; }
    .aak-pip__seek { width:100%; min-width:0; height:4px; accent-color:rgb(var(--accent2)); cursor:pointer; }
    .aak-pip button:focus-visible,.aak-pip input:focus-visible { outline:2px solid rgb(var(--accent2)); outline-offset:2px; }
    @media (prefers-reduced-motion:reduce) { .aak-pip * { transition:none!important; animation:none!important; } }
  `;
  targetDocument.head.appendChild(style);
  targetDocument.body.replaceChildren();
  const mount = targetDocument.createElement('div');
  mount.id = 'aak-floating-player-root';
  targetDocument.body.appendChild(mount);
  return mount;
}

function FloatingPlayerSurface({
  title, artist, image, provider, playing, currentTime, duration, volume, canSeek,
  onToggle, onPrevious, onNext, onSeek, onVolume, onClose,
}: {
  title: string; artist: string; image?: string; provider: string; playing: boolean;
  currentTime: number; duration: number; volume: number; canSeek: boolean;
  onToggle: () => void; onPrevious: () => void; onNext: () => void;
  onSeek: (seconds: number) => void; onVolume: (value: number) => void; onClose: () => void;
}) {
  return <div className="aak-pip" aria-label="AAK Music browser floating player">
    <div className="aak-pip__head"><span>AAK Music · Floating player</span><button className="aak-pip__close" type="button" aria-label="Close floating player window" title="Close floating window" onClick={onClose}><Icon n="close" s={15} /></button></div>
    <div className="aak-pip__content">
      {image ? <img className="aak-pip__art" src={image} alt="" /> : <div className="aak-pip__art" aria-hidden="true" />}
      <div className="aak-pip__meta"><div className="aak-pip__title" title={title}>{title}</div><div className="aak-pip__artist" title={artist}>{artist}</div><div className="aak-pip__provider">{provider}</div>
        <div className="aak-pip__controls" style={{ marginTop: 8 }}>
          <button className="aak-pip__button" type="button" aria-label="Previous track" title="Previous track" onClick={onPrevious}><Icon n="prev" s={15} /></button>
          <button className="aak-pip__button aak-pip__button--play" type="button" aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause' : 'Play'} onClick={onToggle}><Icon n={playing ? 'pause' : 'play'} s={17} /></button>
          <button className="aak-pip__button" type="button" aria-label="Next track" title="Next track" onClick={onNext}><Icon n="next" s={15} /></button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }} title="Volume"><Icon n={volume <= 0.01 ? 'muted' : 'volume'} s={14} /><input aria-label="Player volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => onVolume(Number(event.currentTarget.value))} style={{ width: 54, accentColor: 'rgb(var(--accent2))' }} /></label>
        </div>
      </div>
    </div>
    <div className="aak-pip__timeline"><span>{fmt(currentTime)}</span><input aria-label="Seek track position" className="aak-pip__seek" type="range" min={0} max={duration || 1} step={0.1} value={Math.min(currentTime, duration || 0)} disabled={!canSeek} onChange={(event) => onSeek(Number(event.currentTarget.value))} /><span>{fmt(duration)}</span></div>
  </div>;
}

function readMiniPlayerPosition(): MiniPlayerPosition | null {
  try {
    const saved = localStorage.getItem(MINI_PLAYER_POSITION_KEY);
    if (!saved) return null;
    const value: unknown = JSON.parse(saved);
    if (!value || typeof value !== 'object') return null;
    const { x, y } = value as Record<string, unknown>;
    return typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y)
      ? { x, y }
      : null;
  } catch {
    return null;
  }
}

function clampMiniPlayerPosition(x: number, y: number, width: number, height: number, safeArea?: { top: number; right: number; bottom: number; left: number }): MiniPlayerPosition {
  const margin = 8;
  const top = margin + (safeArea?.top ?? 0);
  const right = margin + (safeArea?.right ?? 0);
  const bottom = margin + (safeArea?.bottom ?? 0);
  const left = margin + (safeArea?.left ?? 0);
  return {
    x: Math.max(left, Math.min(x, Math.max(left, window.innerWidth - width - right))),
    y: Math.max(top, Math.min(y, Math.max(top, window.innerHeight - height - bottom))),
  };
}

function miniPlayerSafeArea(dock: HTMLElement) {
  if (!isPhoneMiniPlayerViewport()) return undefined;
  const style = window.getComputedStyle(dock);
  const readInset = (name: string) => Number.parseFloat(style.getPropertyValue(name)) || 0;
  return {
    top: readInset('--aak-player-safe-top'),
    right: readInset('--aak-player-safe-right'),
    bottom: readInset('--aak-player-safe-bottom'),
    left: readInset('--aak-player-safe-left'),
  };
}

export default function UniversalPlayer() {
  const local = usePlayer();
  const localTime = useTime();
  const player = useUniversalPlayer();
  const playerClock = useUniversalPlayerTime();
  const location = useLocation();
  const pathname = location.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  const isPlayerRoute = pathname === '/player';

  const [dismissed, setDismissed] = useState(false);
  const [miniPlayerPosition, setMiniPlayerPosition] = useState<MiniPlayerPosition | null>(readMiniPlayerPosition);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [pipMount, setPipMount] = useState<HTMLElement | null>(null);
  const [pipError, setPipError] = useState('');
  const [titleOverflows, setTitleOverflows] = useState(false);
  const [titleMarqueeDuration, setTitleMarqueeDuration] = useState(22);
  const [phoneLayout, setPhoneLayout] = useState(isPhoneMiniPlayerViewport);

  const dockRef = useRef<HTMLDivElement>(null);
  const titleViewportRef = useRef<HTMLSpanElement>(null);
  const titleMeasureRef = useRef<HTMLSpanElement>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const pipRequestPendingRef = useRef(false);
  const positionRef = useRef(miniPlayerPosition);
  const dragRef = useRef<MiniPlayerDrag | null>(null);
  const mobileLongPressRef = useRef<MobileLongPress | null>(null);
  const videoVolumeRef = useRef(player.volume);
  const previousVolume = useRef(1);

  const localRef = useRef(local);
  const universalRef = useRef(player);
  const clockRef = useRef(playerClock);
  localRef.current = local;
  universalRef.current = player;
  clockRef.current = playerClock;
  videoVolumeRef.current = player.volume;

  useEffect(() => {
    const query = window.matchMedia(PHONE_MINI_PLAYER_QUERY);
    const update = () => setPhoneLayout(query.matches);
    update();
    if (query.addEventListener) query.addEventListener('change', update);
    else query.addListener(update);
    return () => {
      if (query.removeEventListener) query.removeEventListener('change', update);
      else query.removeListener(update);
    };
  }, []);

  const video = player.activeVideo;
  const isVideoMode = Boolean(video && player.videoMode);

  // When playback starts or new track is selected, un-dismiss the dock
  useEffect(() => {
    if (player.playing || player.videoPlaying || local.playing) {
      setDismissed(false);
    }
  }, [player.playing, player.videoPlaying, local.playing]);

  const showDock = Boolean(
    (player.activeAudio || player.activeVideo || local.hasInitiatedPlayback || local.playing) &&
    !dismissed
  );

  // Hide the ordinary audio dock while the page is actively scrolling, then
  // reveal it shortly after scroll settles. Keep an official YouTube player
  // visible: moving that iframe out of view is not a compliant audio-only mode.
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock || !showDock || local.isExpanded || isVideoMode) {
      dock?.removeAttribute('data-scroll-hidden');
      return;
    }
    let frame = 0;
    let revealTimer = 0;
    let lastY = window.scrollY;
    let direction = 0;
    let accumulatedDelta = 0;
    const reveal = () => {
      window.clearTimeout(revealTimer);
      dock.removeAttribute('data-scroll-hidden');
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const delta = y - lastY;
        lastY = y;
        if (Math.abs(delta) < 1) return;
        const nextDirection = Math.sign(delta);
        if (nextDirection !== direction) accumulatedDelta = 0;
        direction = nextDirection;
        accumulatedDelta += delta;
        if (Math.abs(accumulatedDelta) < 12) return;
        if (accumulatedDelta > 0) dock.dataset.scrollHidden = 'true';
        else reveal();
        accumulatedDelta = 0;
        window.clearTimeout(revealTimer);
        revealTimer = window.setTimeout(reveal, 550);
      });
    };
    const onInteraction = () => reveal();
    window.addEventListener('scroll', onScroll, { passive: true });
    dock.addEventListener('pointerdown', onInteraction);
    dock.addEventListener('focusin', onInteraction);
    return () => {
      window.removeEventListener('scroll', onScroll);
      dock.removeEventListener('pointerdown', onInteraction);
      dock.removeEventListener('focusin', onInteraction);
      window.clearTimeout(revealTimer);
      if (frame) window.cancelAnimationFrame(frame);
      dock.removeAttribute('data-scroll-hidden');
    };
  }, [isVideoMode, local.isExpanded, showDock]);

  const onVideoPlayback = useCallback(
    (state: number, time: number, total: number) => player.syncVideo(state, time, total),
    [player.syncVideo]
  );

  const onVideoController = useCallback(
    (controller: Parameters<typeof player.setVideoController>[0]) => {
      player.setVideoController(controller);
      if (controller) controller.setVolume(videoVolumeRef.current);
    },
    [player.setVideoController]
  );

  const onVideoError = useCallback(
    (message: string) => player.setError(message),
    [player.setError]
  );

  // The dock uses viewport coordinates so it can be moved freely. Revalidate
  // the saved point after mount and whenever its dimensions or viewport change.
  useLayoutEffect(() => {
    const dock = dockRef.current;
    if (!dock || !showDock) return;

    const updateBounds = () => {
      const rect = dock.getBoundingClientRect();
      if (dragRef.current) {
        dragRef.current.width = rect.width;
        dragRef.current.height = rect.height;
      }
      const current = positionRef.current ?? { x: rect.left, y: rect.top };
      const next = clampMiniPlayerPosition(current.x, current.y, rect.width, rect.height, miniPlayerSafeArea(dock));
      dock.style.left = `${next.x}px`;
      dock.style.top = `${next.y}px`;
      dock.style.right = 'auto';
      dock.style.bottom = 'auto';
      positionRef.current = next;
      setMiniPlayerPosition((previous) => previous?.x === next.x && previous?.y === next.y ? previous : next);
    };

    updateBounds();
    let frame = 0;
    const scheduleBounds = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { frame = 0; updateBounds(); });
    };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleBounds) : null;
    observer?.observe(dock);
    window.addEventListener('resize', scheduleBounds);
    window.addEventListener('orientationchange', scheduleBounds);
    window.visualViewport?.addEventListener('resize', scheduleBounds);
    window.visualViewport?.addEventListener('scroll', scheduleBounds);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', scheduleBounds);
      window.removeEventListener('orientationchange', scheduleBounds);
      window.visualViewport?.removeEventListener('resize', scheduleBounds);
      window.visualViewport?.removeEventListener('scroll', scheduleBounds);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [showDock, local.isExpanded, video?.id, isVideoMode]);

  const applyMiniPlayerPosition = (position: MiniPlayerPosition, persist: boolean, size?: Pick<MiniPlayerDrag, 'width' | 'height'>) => {
    const dock = dockRef.current;
    if (!dock) return;
    const rect = size ? null : dock.getBoundingClientRect();
    const next = clampMiniPlayerPosition(position.x, position.y, size?.width ?? rect!.width, size?.height ?? rect!.height, miniPlayerSafeArea(dock));
    dock.style.left = `${next.x}px`;
    dock.style.top = `${next.y}px`;
    dock.style.right = 'auto';
    dock.style.bottom = 'auto';
    positionRef.current = next;
    if (persist) {
      setMiniPlayerPosition(next);
      try { localStorage.setItem(MINI_PLAYER_POSITION_KEY, JSON.stringify(next)); } catch { /* Storage can be unavailable in private browsing. */ }
    }
  };

  const beginMiniPlayerDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const dock = dockRef.current;
    if (!dock) return;
    const rect = dock.getBoundingClientRect();
    const origin = positionRef.current ?? { x: rect.left, y: rect.top };
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: origin.x, originY: origin.y, width: rect.width, height: rect.height };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const moveMiniPlayerDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    applyMiniPlayerPosition({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    }, false, drag);
  };

  const finishMiniPlayerDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const dock = dockRef.current;
    const rect = dock?.getBoundingClientRect();
    if (rect) applyMiniPlayerPosition({ x: rect.left, y: rect.top }, true);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const beginPhoneLongPress = (event: ReactPointerEvent<HTMLElement>) => {
    if (!phoneLayout || event.pointerType !== 'touch' || event.isPrimary === false) return;
    const target = event.target;
    if (target instanceof Element && target.closest('button, a, input, select, textarea, [role="button"], iframe, [data-aak-youtube-player-slot]')) return;
    const dock = dockRef.current;
    if (!dock) return;
    const rect = dock.getBoundingClientRect();
    const origin = positionRef.current ?? { x: rect.left, y: rect.top };
    const pending: MobileLongPress = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
      width: rect.width,
      height: rect.height,
      active: false,
      timer: 0,
    };
    pending.timer = window.setTimeout(() => {
      if (mobileLongPressRef.current !== pending || !dockRef.current) return;
      pending.active = true;
      dragRef.current = pending;
      dockRef.current.dataset.mobileDragging = 'true';
    }, PHONE_DRAG_HOLD_MS);
    mobileLongPressRef.current = pending;
    // Capture the pointer immediately so a release outside the dock or a
    // browser cancellation always clears the pending long press. Native
    // scrolling remains available until the hold activates; the non-passive
    // touchmove handler suppresses it only during an active drag.
    try { dock.setPointerCapture(event.pointerId); } catch { /* The pointer may already have been cancelled. */ }
  };

  const movePhoneLongPress = (event: ReactPointerEvent<HTMLElement>) => {
    const pending = mobileLongPressRef.current;
    if (!pending || pending.pointerId !== event.pointerId) return;
    if (!pending.active) {
      if (Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY) > 8) {
        window.clearTimeout(pending.timer);
        mobileLongPressRef.current = null;
      }
      return;
    }
    event.preventDefault();
    applyMiniPlayerPosition({
      x: pending.originX + event.clientX - pending.startX,
      y: pending.originY + event.clientY - pending.startY,
    }, false, pending);
  };

  const finishPhoneLongPress = (event: ReactPointerEvent<HTMLElement>) => {
    const pending = mobileLongPressRef.current;
    if (!pending || pending.pointerId !== event.pointerId) return;
    window.clearTimeout(pending.timer);
    mobileLongPressRef.current = null;
    if (!pending.active) return;
    dragRef.current = null;
    const dock = dockRef.current;
    const rect = dock?.getBoundingClientRect();
    if (rect) applyMiniPlayerPosition({ x: rect.left, y: rect.top }, true);
    dock?.removeAttribute('data-mobile-dragging');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const moveMiniPlayerByKeyboard = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const amount = event.shiftKey ? 48 : 16;
    const rect = dockRef.current?.getBoundingClientRect();
    if (!rect) return;
    const current = positionRef.current ?? { x: rect.left, y: rect.top };
    const directions: Record<string, MiniPlayerPosition> = {
      ArrowLeft: { x: current.x - amount, y: current.y },
      ArrowRight: { x: current.x + amount, y: current.y },
      ArrowUp: { x: current.x, y: current.y - amount },
      ArrowDown: { x: current.x, y: current.y + amount },
    };
    const next = directions[event.key];
    if (!next) return;
    event.preventDefault();
    applyMiniPlayerPosition(next, true);
  };

  useEffect(() => {
    const preventScrollDuringActiveDrag = (event: TouchEvent) => {
      const pending = mobileLongPressRef.current;
      const dock = dockRef.current;
      if (!pending?.active || !dock || !(event.target instanceof Node) || !dock.contains(event.target)) return;
      if (event.cancelable) event.preventDefault();
    };
    window.addEventListener('touchmove', preventScrollDuringActiveDrag, { passive: false });
    return () => {
      window.removeEventListener('touchmove', preventScrollDuringActiveDrag);
      if (mobileLongPressRef.current) window.clearTimeout(mobileLongPressRef.current.timer);
      mobileLongPressRef.current = null;
      dragRef.current = null;
      dockRef.current?.removeAttribute('data-mobile-dragging');
    };
  }, []);

  // Global Keyboard shortcuts
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
        if (universalRef.current.activeVideo || universalRef.current.activeAudio) {
          const currentVol = universalRef.current.volume;
          if (currentVol > 0.01) previousVolume.current = currentVol;
          const nextVolume = currentVol > 0.01 ? 0 : previousVolume.current || 1;
          if (universalRef.current.activeVideo) universalRef.current.setVideoVolume(nextVolume);
          else universalRef.current.setVolume(nextVolume);
        } else if (localRef.current.vol > 0) {
          previousVolume.current = localRef.current.vol;
          localRef.current.setVol(0);
        } else {
          localRef.current.setVol(previousVolume.current || 1);
        }
      } else if (event.code === 'ArrowRight' && (event.metaKey || event.ctrlKey || event.altKey)) {
        event.preventDefault();
        universalRef.current.next();
      } else if (event.code === 'ArrowLeft' && (event.metaKey || event.ctrlKey || event.altKey)) {
        event.preventDefault();
        universalRef.current.prev();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const external = player.activeAudio;
  const currentItem = player.currentItem;
  const title = currentItem.title;
  const artist = currentItem.artist;
  const provider = currentItem.provider;
  const titlePositionKey = phoneLayout ? `${miniPlayerPosition?.x ?? ''},${miniPlayerPosition?.y ?? ''}` : '';

  // Measure only the title and its available viewport. CSS handles the motion;
  // ResizeObserver covers track changes and responsive dock resizing without a timer loop.
  useLayoutEffect(() => {
    const viewport = titleViewportRef.current;
    const measure = titleMeasureRef.current;
    if (!showDock || !viewport || !measure) {
      setTitleOverflows(false);
      return;
    }
    const update = () => {
      const measuredWidth = measure.getBoundingClientRect().width;
      const trailingGap = Number.parseFloat(window.getComputedStyle(measure).paddingRight) || 0;
      const textWidth = Math.max(0, measuredWidth - trailingGap);
      const overflowing = textWidth > viewport.clientWidth + 1;
      setTitleOverflows((current) => current === overflowing ? current : overflowing);
      if (overflowing) {
        const duration = Math.max(16, Math.min(42, (textWidth / 22) + 6));
        setTitleMarqueeDuration((current) => Math.abs(current - duration) < 0.5 ? current : duration);
      }
    };
    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(viewport);
    observer?.observe(measure);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [showDock, title, phoneLayout, titlePositionKey]);

  const isPlaying = video ? player.videoPlaying : external ? player.playing : local.playing;
  const currentTime = video ? playerClock.videoTime : external ? playerClock.time : localTime.t;
  const duration = video
    ? playerClock.videoDuration || video.durationSeconds || 0
    : external
    ? playerClock.duration || external.durationSeconds || 0
    : localTime.dur || currentItem.durationSeconds;

  const volume = video || external ? player.volume : local.vol;
  const repeat = video || external ? player.repeat : local.repeat;
  const shuffle = video || external ? player.shuffle : local.shuffle;

  const canSeek = video
    ? player.videoMode && player.videoReady && playerClock.videoDuration > 0
    : external
    ? playerClock.duration > 0
    : Boolean(local.track.src && localTime.dur > 0);

  const playToggle = video ? player.toggleVideo : external ? player.toggle : local.toggle;
  const setVolume = video ? player.setVideoVolume : external ? player.setVolume : local.setVol;
  const seek = video ? player.seekVideo : external ? player.seek : local.seek;
  const previous = () => player.prev();
  const next = () => player.next();

  const hasFloatingAudioSource = !video && Boolean(external || (currentItem.kind === 'local' && local.hasInitiatedPlayback && local.track.src));
  const canOpenBrowserPip = hasFloatingAudioSource && supportsDocumentPictureInPicture();

  const openBrowserPip = useCallback(async () => {
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      return;
    }
    if (!canOpenBrowserPip || pipRequestPendingRef.current) return;
    pipRequestPendingRef.current = true;
    setPipError('');
    try {
      // requestWindow is called directly from this user activation, as required
      // by browsers. It creates a browser-managed always-on-top document window.
      const api = (window as PictureInPictureWindow).documentPictureInPicture;
      if (!api) throw new Error('Picture-in-Picture API is unavailable.');
      // These are initial preferred dimensions for AAK's custom audio Document
      // PiP window. The browser may constrain them; this does not size YouTube's
      // separate provider-managed PiP window.
      const nextWindow = await api.requestWindow({ width: 390, height: 190 });
      if (video || !hasFloatingAudioSource) {
        nextWindow.close();
        return;
      }
      const mount = copyPlayerStyles(nextWindow);
      pipWindowRef.current = nextWindow;
      nextWindow.addEventListener('pagehide', () => {
        if (pipWindowRef.current === nextWindow) pipWindowRef.current = null;
        setPipWindow((current) => current === nextWindow ? null : current);
        setPipMount(null);
      }, { once: true });
      setPipMount(mount);
      setPipWindow(nextWindow);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      setPipError(name === 'NotAllowedError'
        ? 'The browser blocked the floating window. Try again directly from this button.'
        : 'The browser could not open a floating window. Continue using the in-page player.');
    } finally {
      pipRequestPendingRef.current = false;
    }
  }, [canOpenBrowserPip, video, hasFloatingAudioSource]);

  useEffect(() => {
    pipWindowRef.current = pipWindow;
  }, [pipWindow]);

  useEffect(() => () => { pipWindowRef.current?.close(); }, []);

  useEffect(() => {
    if ((video || !hasFloatingAudioSource) && pipWindow) pipWindow.close();
  }, [video, hasFloatingAudioSource, pipWindow]);

  useEffect(() => {
    if (!pipWindow) return;
    const syncRootPreferences = () => {
      pipWindow.document.documentElement.dataset.theme = document.documentElement.dataset.theme || 'dark';
      pipWindow.document.documentElement.dataset.performanceMode = document.documentElement.dataset.performanceMode || 'balance';
    };
    syncRootPreferences();
    const observer = new MutationObserver(syncRootPreferences);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-performance-mode'] });
    return () => observer.disconnect();
  }, [pipWindow]);

  // Recent desktop Chrome can request a PiP transition when media is playing
  // and the user switches tabs. Register only for supported, active audio;
  // Chrome still applies its own eligibility checks and user permission.
  useEffect(() => {
    if (!canOpenBrowserPip || !hasFloatingAudioSource || !isPlaying || !('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    const setActionHandler = session.setActionHandler as unknown as (action: string, handler: (() => void) | null) => void;
    const enterPip = () => { void openBrowserPip(); };
    try {
      setActionHandler.call(session, 'enterpictureinpicture', enterPip);
    } catch {
      // Media Session PiP actions are not implemented by every browser.
      return;
    }
    return () => {
      try { setActionHandler.call(session, 'enterpictureinpicture', null); } catch { /* Unsupported action. */ }
    };
  }, [canOpenBrowserPip, hasFloatingAudioSource, isPlaying, openBrowserPip]);

  const toggleShuffle = () =>
    video || external ? player.setShuffle(!shuffle) : local.toggleShuffle();

  const toggleRepeat = () =>
    video || external
      ? player.setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')
      : local.toggleRepeat();

  const changeVolume = (value: number) => {
    if (value > 0.01) previousVolume.current = value;
    setVolume(value);
  };

  const toggleMute = () => {
    if (volume > 0.01) {
      previousVolume.current = volume;
      setVolume(0);
    } else {
      setVolume(previousVolume.current || 1);
    }
  };

  const handleDismiss = () => {
    if (isPlaying) playToggle();
    setDismissed(true);
  };

  const openMainPlayer = () => {
    if (!isPlayerRoute) navigate('/player');
    local.setIsExpanded(true);
  };

  const isFavorite = local.isFavorite(currentItem.id);
  const queueCount = player.userQueue.length;
  const artImage = currentItem.image
    ? <img src={currentItem.image} alt="" className="h-full w-full object-cover" />
    : <Art a={240} b={190} className="h-full w-full object-cover" />;
  const titleContent = (
    <span ref={titleViewportRef} className="aak-mini-player__title-viewport">
      <span key={title} className={`aak-mini-player__title-track ${titleOverflows ? 'is-overflowing' : ''}`} style={{ animationDuration: `${titleMarqueeDuration}s`, '--aak-mini-title-duration': `${titleMarqueeDuration}s` } as CSSProperties}>
        <span ref={titleMeasureRef} className="aak-mini-player__title-copy">{title}</span>
        {titleOverflows && <span aria-hidden="true" className="aak-mini-player__title-copy aak-mini-player__title-copy--duplicate">{title}</span>}
      </span>
    </span>
  );

  return (
    <>
      {/* Full Player Modal */}
      {local.isExpanded && !isPlayerRoute && <FullPlayerModal />}

      {/* Shared Playback Queue Drawer */}
      <QueuePanel />

      {/* One persistent mini-player presentation for every route. */}
      {showDock && !local.isExpanded && (
        <section
          ref={dockRef}
          role="region"
          aria-label="AAK Music mini player"
          className={`aak-mini-player fixed z-50 text-bone ${video && player.videoMode ? 'aak-mini-player--video' : ''}`}
          style={miniPlayerPosition ? { left: miniPlayerPosition.x, top: miniPlayerPosition.y, right: 'auto', bottom: 'auto' } : undefined}
          onPointerDown={beginPhoneLongPress}
          onPointerMove={movePhoneLongPress}
          onPointerUp={finishPhoneLongPress}
          onPointerCancel={finishPhoneLongPress}
          onLostPointerCapture={finishPhoneLongPress}
        >
          <div className="aak-mini-player__header">
            {canOpenBrowserPip && (
              <button
                type="button"
                onClick={() => void openBrowserPip()}
                aria-label={pipWindow ? 'Close Picture-in-Picture window' : 'Open Picture-in-Picture'}
                title={pipWindow ? 'Close Picture-in-Picture' : 'Picture-in-Picture'}
                aria-pressed={Boolean(pipWindow)}
                className={`aak-mini-player__pip-button ${pipWindow ? 'is-active' : ''}`}
              >
                <Icon n="pip" s={16} />
              </button>
            )}
            <button
              type="button"
              className="aak-mini-player__drag-handle"
              aria-label="Move mini player. Use the arrow keys to reposition it."
              title="Move mini player · Arrow keys to reposition"
              onPointerDown={beginMiniPlayerDrag}
              onPointerMove={moveMiniPlayerDrag}
              onPointerUp={finishMiniPlayerDrag}
              onPointerCancel={finishMiniPlayerDrag}
              onLostPointerCapture={finishMiniPlayerDrag}
              onKeyDown={moveMiniPlayerByKeyboard}
            >
              <Icon n="move" s={15} />
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Pause and hide mini player"
              title="Pause and hide mini player"
              className="aak-mini-player__header-button aak-mini-player__close-button"
            >
              <Icon n="close" s={16} />
            </button>
          </div>
          {video && player.videoMode && (
            <div
              data-aak-youtube-player-slot
              aria-label={`Official YouTube player: ${video.title}`}
              className="aak-mini-player__video-slot mx-auto w-full bg-black"
            />
          )}

          {!video && (
            <div className="aak-mini-player__progress group relative h-1.5 w-full cursor-pointer bg-bone/10 transition-[height] hover:h-2">
              <div
                className="h-full rounded-r-full bg-gradient-to-r from-cyan to-accent"
                style={{ width: `${Math.min(100, duration > 0 ? (currentTime / duration) * 100 : 0)}%` }}
              />
              <input
                aria-label="Seek track position"
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                disabled={!canSeek}
                onChange={(event) => seek(Number(event.target.value))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
            </div>
          )}

          <div className="aak-mini-player__body">
            <div className="aak-mini-player__identity min-w-0">
              {phoneLayout ? (
                <button
                  type="button"
                  onClick={openMainPlayer}
                  aria-label={`Open music player for ${title}`}
                  title="Open music player"
                  className="aak-mini-player__art relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-bone/15 bg-raised sm:h-14 sm:w-14"
                >{artImage}</button>
              ) : (
                <button
                  type="button"
                  onClick={() => local.setIsExpanded(true)}
                  aria-label="Expand full player"
                  className="aak-mini-player__art group relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-bone/15 bg-raised sm:h-14 sm:w-14"
                >
                  {artImage}
                  <span className="absolute inset-0 grid place-items-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Icon n="expand" s={16} />
                  </span>
                </button>
              )}
              <div className="min-w-0 flex-1">
                {phoneLayout
                  ? <div className="aak-mini-player__title-button aak-mini-player__title-button--static block w-full min-w-0 text-left font-display text-sm font-bold leading-tight text-bone" title={title}>{titleContent}</div>
                  : <button type="button" onClick={() => local.setIsExpanded(true)} className="aak-mini-player__title-button block w-full min-w-0 text-left font-display text-sm font-bold leading-tight text-bone transition hover:text-cyan" title={title} aria-label={title}>{titleContent}</button>}
                <p className="aak-mini-player__artist mt-1 truncate text-xs" title={artist}>{artist}</p>
                <span className="aak-mini-player__provider mt-1 inline-flex max-w-full truncate rounded-md bg-cyan/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan">{provider}</span>
              </div>
              {!video && currentItem.kind === 'local' && (
                <button type="button" onClick={() => local.toggleFavorite(currentItem.id)} aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={isFavorite} className={`hidden h-9 w-9 shrink-0 place-items-center rounded-full transition sm:grid ${isFavorite ? 'text-pink-400' : 'text-bone/45 hover:text-pink-300'}`}>
                  <Icon n="heart" s={17} />
                </button>
              )}
            </div>

            <div className="aak-mini-player__transport" aria-label="Playback controls">
              <button type="button" onClick={previous} disabled={currentItem.kind === 'video' ? player.videoQueue.length < 2 && player.userQueue.length === 0 : external ? player.queue.length < 2 && player.userQueue.length === 0 : tracks.length < 2} aria-label="Previous track" title="Previous track" className="aak-mini-player__control text-bone/70 hover:bg-bone/10 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-30"><Icon n="prev" s={18} /></button>
              <button type="button" onClick={playToggle} aria-label={isPlaying ? 'Pause' : 'Play'} title={isPlaying ? 'Pause' : 'Play'} className="aak-mini-player__play"><Icon n={isPlaying ? 'pause' : 'play'} s={19} /></button>
              <button type="button" onClick={next} disabled={player.userQueue.length === 0 && (currentItem.kind === 'video' ? player.videoQueue.length < 2 : external ? player.queue.length < 2 : tracks.length < 2)} aria-label="Next track" title="Next track" className="aak-mini-player__control text-bone/70 hover:bg-bone/10 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-30"><Icon n="next" s={18} /></button>
              <span className="aak-mini-player__time hidden font-mono text-[10px] tabular-nums text-bone/45 md:inline-flex">{fmt(currentTime)} / {fmt(duration)}</span>
            </div>

            <div className="aak-mini-player__actions">
              <button type="button" onClick={toggleShuffle} aria-label={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'} aria-pressed={shuffle} title="Shuffle" className={`aak-mini-player__control aak-mini-player__secondary ${shuffle ? 'bg-cyan/10 text-cyan' : 'text-bone/55 hover:text-bone'}`}><Icon n="shuffle" s={16} /></button>
              <button type="button" onClick={toggleRepeat} aria-label={`Repeat ${repeat}`} aria-pressed={repeat !== 'off'} title={`Repeat: ${repeat}`} className={`aak-mini-player__control aak-mini-player__secondary relative ${repeat !== 'off' ? 'bg-cyan/10 text-cyan' : 'text-bone/55 hover:text-bone'}`}><Icon n="repeat" s={16} />{repeat === 'one' && <span className="absolute bottom-1 right-1 text-[8px] font-bold">1</span>}</button>
              <div className="aak-mini-player__volume items-center gap-1.5">
                <button type="button" onClick={toggleMute} aria-label={volume <= 0.01 ? 'Unmute' : 'Mute'} className="aak-mini-player__control text-bone/55 hover:text-cyan"><Icon n={volume <= 0.01 ? 'muted' : 'volume'} s={16} /></button>
                <input aria-label="Player volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => changeVolume(Number(event.target.value))} className="aak-mini-player__volume-slider h-1.5 w-16 cursor-pointer accent-cyan" />
              </div>
              {!video && <div className="aak-mini-player__audio-tools flex items-center gap-1"><VisualizerToolbar embedded /><div className="aak-mini-player__equalizer"><EqualizerControl available={!external} compact /></div></div>}
              {video && <div className="aak-mini-player__equalizer"><EqualizerControl available={false} compact /></div>}
              <button type="button" onClick={player.toggleQueue} aria-label={`Open playback queue, ${queueCount} user queued tracks`} aria-pressed={player.isQueueOpen} title="Playback queue" className={`aak-mini-player__control relative rounded-xl border border-bone/15 ${player.isQueueOpen ? 'border-cyan bg-cyan/10 text-cyan' : 'text-bone/65 hover:border-cyan hover:text-cyan'}`}>
                <Icon n="queue" s={17} />
                {queueCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan px-1 font-mono text-[9px] font-bold text-ink">{queueCount}</span>}
              </button>
              <button type="button" onClick={() => local.setIsExpanded(true)} aria-label="Expand player" title="Expand player" className="aak-mini-player__control rounded-xl border border-bone/15 text-bone/65 hover:border-cyan hover:text-cyan"><Icon n="expand" s={16} /></button>
            </div>
            {(pipError || video || (hasFloatingAudioSource && !canOpenBrowserPip)) && <p role={pipError ? 'status' : undefined} className={`aak-mini-player__pip-status ${pipError ? 'text-amber-200' : 'text-bone/45'}`}>{pipError || (video ? "Use YouTube's own Picture-in-Picture control when available; the browser and OS control its window size." : 'Picture-in-Picture is unavailable in this browser; the in-page player remains available.')}</p>}
          </div>
        </section>
      )}
      {/* Official YouTube video host frame */}
      {video && player.videoMode && (
        <>
          <YouTubeVideoModal
            key={video.id}
            inline
            autoPlay
            video={video}
            onClose={player.exitVideoMode}
            startSeconds={playerClock.videoTime}
            onPlayback={onVideoPlayback}
            onController={onVideoController}
            onError={onVideoError}
          />
        </>
      )}
      {pipWindow && pipMount && createPortal(
        <FloatingPlayerSurface
          title={title}
          artist={artist}
          image={currentItem.image}
          provider={provider}
          playing={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          canSeek={canSeek}
          onToggle={playToggle}
          onPrevious={previous}
          onNext={next}
          onSeek={seek}
          onVolume={changeVolume}
          onClose={() => pipWindowRef.current?.close()}
        />,
        pipMount
      )}
    </>
  );
}
