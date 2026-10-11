import { memo, useEffect, useRef, useState } from 'react';
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
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('keydown', keydown); };
  }, [open]);
  return <div ref={rootRef} className="relative">
    <button ref={triggerRef} type="button" aria-expanded={open} aria-controls="aak-equalizer-panel" onClick={() => setOpen((state) => !state)} className="min-h-10 rounded-full border border-bone/15 px-3 text-[10px] font-mono text-bone/65 transition hover:border-cyan hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone/50">EQ <span className="text-cyan">{preset}</span></button>
    {open && <div id="aak-equalizer-panel" role="dialog" aria-label="Audio equalizer" className="absolute bottom-[calc(100%+0.65rem)] right-0 z-[90] w-[min(25rem,calc(100vw-2rem))] rounded-2xl border border-bone/20 bg-ink p-4 text-bone shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-xs font-mono uppercase tracking-wider text-cyan">6 band equalizer</h3><p className="mt-1 text-[10px] text-bone/50">Web Audio processing for AAK audio, Apple previews, and generated site audio.</p></div><button type="button" aria-label="Close equalizer" onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg text-bone/60 hover:bg-bone/10">×</button></div>
      <div className="mt-3 flex flex-wrap gap-1.5">{Object.keys(EQUALIZER_PRESETS).map((name) => <button key={name} type="button" aria-pressed={preset === name} onClick={() => applyEqualizerPreset(name)} className={`min-h-9 rounded-full px-3 text-[10px] ${preset === name ? 'bg-cyan font-bold text-ink' : 'border border-bone/10 text-bone/60 hover:border-bone/30'}`}>{name}</button>)}<button type="button" onClick={() => applyEqualizerPreset('Flat')} className="min-h-9 rounded-full border border-bone/10 px-3 text-[10px] text-bone/55 hover:text-bone">Reset</button></div>
      <div className="mt-5 grid grid-cols-6 gap-2">{BANDS.map((band, index) => <label key={band.hz} className="flex min-w-0 flex-col items-center gap-2 text-center"><span className="text-[9px] font-mono text-bone/50">{band.hz}</span><input aria-label={`${band.title} equalizer band`} title={band.title} type="range" min={-9} max={9} step={1} value={values[index]} disabled={!available} onChange={(event) => setEqualizerBand(index, Number(event.target.value))} className="h-24 w-5 cursor-pointer accent-cyan [writing-mode:vertical-lr] [direction:rtl] disabled:opacity-35" /><span className="text-[9px] font-mono tabular-nums text-bone/55">{values[index] > 0 ? '+' : ''}{values[index]} dB</span></label>)}</div>
      {!available && <p role="status" className="mt-3 text-xs text-amber-100/75">The selected third party player does not expose audio to this equalizer.</p>}
      <p className="mt-3 text-[9px] leading-4 text-bone/40">Bands are limited to ±9 dB; the shared output includes headroom and compression.</p>
    </div>}
  </div>;
}

export default memo(EqualizerControl);
