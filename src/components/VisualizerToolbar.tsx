import { useEffect, useState } from 'react';
import { useVisualizer, VisualizerStyle, VisualizerQuality } from '../hooks/useVisualizer';
import { usePlayer } from '../hooks/usePlayer';
import { motion } from '../hooks/motion';

const STYLES: { id: VisualizerStyle; label: string; icon: string }[] = [
  { id: 'spectrum', label: 'Ambient Spectrum', icon: '▮▮▮' },
  { id: 'waveform', label: 'Oscilloscope', icon: '∿' },
  { id: 'circular', label: 'Circular Spectrum', icon: '◉' },
  { id: 'minimal', label: 'Minimal Pulse', icon: '—' },
  { id: 'ambient', label: 'Liquid Wave', icon: '≈' },
  { id: 'aurora', label: 'Aurora Field', icon: '〰' },
  { id: 'particles', label: 'Particle Pulse', icon: '· ·' },
  { id: 'studio', label: 'Studio Spectrum', icon: '▥' },
];

const QUALITIES: { id: VisualizerQuality; label: string }[] = [
  { id: 'low', label: 'Battery / Low' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'high', label: 'High Fidelity' },
];

export default function VisualizerToolbar({ embedded = false }: { embedded?: boolean }) {
  const { style, setStyle, quality, setQuality } = useVisualizer();
  const { isExpanded } = usePlayer();
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(motion.playing);
  useEffect(() => {
    const update = () => setPlaying(motion.playing);
    window.addEventListener('aak-audio-activity', update);
    return () => window.removeEventListener('aak-audio-activity', update);
  }, []);

  if (isExpanded && !embedded) return null;

  return (
    <div style={embedded ? undefined : { left: 'var(--visual-viewport-left, 0px)', width: 'var(--visual-viewport-width, 100vw)', bottom: 'calc(100vh - var(--visual-viewport-height, 100vh) + max(5rem, calc(4.5rem + env(safe-area-inset-bottom))))' }} className={embedded ? 'relative z-[80] flex flex-col items-end' : 'pointer-events-none fixed bottom-[max(5rem,calc(4.5rem+env(safe-area-inset-bottom)))] z-40 flex w-[var(--visual-viewport-width,100vw)] flex-col items-end px-3 sm:bottom-24 sm:px-6'}>
      {open && (
        <div className={`pointer-events-auto ${embedded ? 'absolute bottom-[calc(100%+0.55rem)] right-0' : 'mb-3'} max-h-[min(70vh,36rem)] w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-bone/15 bg-ink/95 p-3 shadow-2xl backdrop-blur-2xl sm:p-4`}>
          <div className="flex items-center justify-between border-b border-bone/10 pb-2.5">
            <span className="font-mono text-xs font-semibold tracking-wider text-bone">AUDIO VISUALIZER</span>
            <button onClick={() => setOpen(false)} aria-label="Close visualizer settings" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg font-mono text-lg text-bone/70 hover:bg-bone/10 hover:text-cyan">×</button>
          </div>
          <div className="mt-3">
            <span className="block font-mono text-[10px] uppercase tracking-wider text-bone/50">Visualizer Mode</span>
            <div role="radiogroup" aria-label="Visualizer mode" className="mt-2 grid grid-cols-1 gap-1">
              {STYLES.map((mode) => (
                <button key={mode.id} role="radio" aria-checked={style === mode.id} onClick={() => setStyle(mode.id)} className={`flex min-h-10 items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-mono transition-colors ${style === mode.id ? 'border border-cyan/30 bg-cyan/15 font-semibold text-cyan' : 'text-bone/75 hover:bg-bone/5 hover:text-bone'}`}>
                  <span className="flex items-center gap-2"><span className="w-7 text-center opacity-70">{mode.icon}</span><span>{mode.label}</span></span>
                  {style === mode.id && <span className="h-1.5 w-1.5 rounded-full bg-cyan" />}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 border-t border-bone/10 pt-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-bone/50">Performance Mode</span>
              <span className="rounded bg-bone/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-cyan">{quality}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {QUALITIES.map((mode) => (
                <button key={mode.id} aria-pressed={quality === mode.id} title={mode.label} onClick={() => setQuality(mode.id)} className={`min-h-10 rounded-lg px-1 text-center font-mono text-[10px] transition-colors ${quality === mode.id ? 'bg-bone font-bold text-ink' : 'border border-bone/15 text-bone/60 hover:text-bone'}`}>{mode.id.toUpperCase()}</button>
              ))}
            </div>
            <p className="mt-2 font-mono text-[9px] leading-relaxed text-bone/50">Low reduces canvas resolution and visual density to save CPU and battery.</p>
          </div>
        </div>
      )}
      <button onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label="Visualizer settings" title="Visualizer Style & Performance" className={`pointer-events-auto group flex min-h-10 items-center gap-1.5 rounded-full border px-2.5 py-2 text-[10px] font-mono shadow-xl backdrop-blur-xl transition-all duration-300 ${playing ? 'border-cyan/40 bg-ink/80 text-cyan hover:border-cyan' : 'border-bone/15 bg-ink/70 text-bone/70 hover:border-bone/40 hover:text-bone'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${playing ? 'bg-cyan' : 'bg-bone/40'}`} />
        <span className="font-semibold">VIZ</span><span className="hidden text-bone/40 sm:inline">·</span><span className="hidden capitalize text-bone/75 sm:inline">{style}</span>
      </button>
    </div>
  );
}
