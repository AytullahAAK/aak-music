import { memo, useEffect, useState } from 'react';
import { useVisualizer } from '../hooks/useVisualizer';
import { usePlayer } from '../hooks/usePlayer';
import { motion } from '../hooks/motion';
import Icon from './Icon';

const LABELS: Record<string, string> = {
  spectrum: 'Ambient Spectrum', waveform: 'Oscilloscope', circular: 'Circular Spectrum',
  minimal: 'Minimal Pulse', ambient: 'Liquid Wave', aurora: 'Aurora Field',
  particles: 'Particle Pulse', studio: 'Studio Spectrum',
};

function VisualizerToolbar({ embedded = false }: { embedded?: boolean }) {
  const { style, nextStyle } = useVisualizer();
  const { isExpanded } = usePlayer();
  const [playing, setPlaying] = useState(motion.playing);
  useEffect(() => {
    const update = () => setPlaying(motion.playing);
    window.addEventListener('aak-audio-activity', update);
    return () => window.removeEventListener('aak-audio-activity', update);
  }, []);

  if (isExpanded && !embedded) return null;
  return <button
    type="button"
    onClick={nextStyle}
    aria-label={`Change visualizer mode. Current mode: ${LABELS[style]}. Press to switch to the next mode.`}
    title={`Visualizer mode: ${LABELS[style]}. Press to cycle.`}
    className={`inline-flex shrink-0 items-center justify-center border font-mono transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan ${embedded ? 'h-10 w-10 rounded-xl p-0' : 'min-h-10 min-w-10 gap-1.5 rounded-full px-2.5 text-[10px]'} ${playing ? 'border-cyan/40 bg-ink text-cyan hover:border-cyan' : 'border-bone/15 bg-ink text-bone/70 hover:border-bone/35 hover:text-bone'}`}
  >
    <Icon n="spectrum" s={15} />
    {!embedded && <><span>VIZ</span><span className="hidden max-w-24 truncate text-bone/60 sm:inline">· {LABELS[style]}</span></>}
  </button>;
}

export default memo(VisualizerToolbar);
