import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { applyEqualizerPreset, EQUALIZER_PRESETS, setEqualizerBand, useEqualizer } from '../hooks/useEqualizer';

const BANDS = [
  { hz: '60 Hz', title: 'Sub bass' }, { hz: '170 Hz', title: 'Bass' },
  { hz: '350 Hz', title: 'Low mids' }, { hz: '1 kHz', title: 'Mids' },
  { hz: '3.5 kHz', title: 'Presence' }, { hz: '10 kHz', title: 'Air' },
];
function EqualizerControl({ available = true }: { available?: boolean }) {
  const [open, setOpen] = useState(false);
  const { preset, values } = useEqualizer();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) { setPosition(null); return; }
    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.visualViewport?.width || window.innerWidth;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const width = Math.min(400, Math.max(0, viewportWidth - 16));
      const left = Math.max(8, Math.min(rect.right - width, viewportWidth - width - 8));
      const naturalHeight = panelRef.current?.scrollHeight || 360;
      const spaceAbove = rect.top - 10;
      const spaceBelow = viewportHeight - rect.bottom - 10;
      const panelHeight = Math.min(naturalHeight, Math.max(120, viewportHeight - 16));
      const preferAbove = spaceAbove >= Math.min(panelHeight, 240) || spaceAbove >= spaceBelow;
      const preferredTop = preferAbove ? rect.top - panelHeight - 10 : rect.bottom + 10;
      const top = Math.max(8, Math.min(preferredTop, viewportHeight - panelHeight - 8));
      const maxHeight = Math.max(120, Math.min(naturalHeight, viewportHeight - top - 8));
      setPosition({ left, top, width, maxHeight });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('scroll', update, true);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('scroll', update, true);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('keydown', keydown); };
  }, [open]);
  const panel = open && <div ref={panelRef} id="aak-equalizer-panel" role="dialog" aria-label="Audio equalizer" style={position ? { left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight } : { left: 8, top: 8, width: 'calc(100vw - 16px)', visibility: 'hidden' }} className="fixed z-[100] max-w-[calc(100vw-16px)] overflow-y-auto overscroll-contain rounded-2xl border border-bone/20 bg-ink/98 p-4 text-bone shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-xs font-mono uppercase tracking-wider text-cyan">6 band equalizer</h3><p className="mt-1 text-[10px] text-bone/50">Web Audio processing for AAK audio, Apple previews, and generated site audio.</p></div><button type="button" aria-label="Close equalizer" onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg text-bone/60 hover:bg-bone/10">×</button></div>
      <div className="mt-3 flex flex-wrap gap-1.5">{Object.keys(EQUALIZER_PRESETS).map((name) => <button key={name} type="button" aria-pressed={preset === name} onClick={() => applyEqualizerPreset(name)} className={`min-h-9 rounded-full px-3 text-[10px] ${preset === name ? 'bg-cyan font-bold text-ink' : 'border border-bone/10 text-bone/60 hover:border-bone/30'}`}>{name}</button>)}<button type="button" onClick={() => applyEqualizerPreset('Flat')} className="min-h-9 rounded-full border border-bone/10 px-3 text-[10px] text-bone/55 hover:text-bone">Reset</button></div>
      <div className="mt-5 grid grid-cols-6 gap-2">{BANDS.map((band, index) => <label key={band.hz} className="flex min-w-0 flex-col items-center gap-2 text-center"><span className="text-[9px] font-mono text-bone/50">{band.hz}</span><input aria-label={`${band.title} equalizer band`} title={band.title} type="range" min={-9} max={9} step={1} value={values[index]} disabled={!available} onChange={(event) => setEqualizerBand(index, Number(event.target.value))} className="h-24 w-5 cursor-pointer accent-cyan [writing-mode:vertical-lr] [direction:rtl] disabled:opacity-35" /><span className="text-[9px] font-mono tabular-nums text-bone/55">{values[index] > 0 ? '+' : ''}{values[index]} dB</span></label>)}</div>
      {!available && <p role="status" className="mt-3 text-xs text-amber-100/75">The selected third party player does not expose audio to this equalizer.</p>}
      <p className="mt-3 text-[9px] leading-4 text-bone/40">Bands are limited to ±9 dB; the shared output includes headroom and compression.</p>
    </div>;

  return <>
    <div ref={rootRef} className="relative">
    <button ref={triggerRef} type="button" aria-expanded={open} aria-controls="aak-equalizer-panel" onClick={() => setOpen((state) => !state)} className="min-h-10 rounded-full border border-bone/15 px-3 text-[10px] font-mono text-bone/65 transition hover:border-cyan hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone/50">EQ <span className="text-cyan">{preset}</span></button>
    </div>
    {panel && createPortal(panel, document.body)}
  </>;
}

export default memo(EqualizerControl);
