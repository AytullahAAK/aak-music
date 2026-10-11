import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type VisualizerStyle = 'spectrum' | 'waveform' | 'circular' | 'minimal' | 'ambient' | 'aurora' | 'particles' | 'studio';
export type VisualizerQuality = 'low' | 'balanced' | 'high';

interface VisualizerContextType {
  style: VisualizerStyle;
  setStyle: (style: VisualizerStyle) => void;
  quality: VisualizerQuality;
  setQuality: (quality: VisualizerQuality) => void;
  toggleQuality: () => void;
  nextStyle: () => void;
}

const VisualizerContext = createContext<VisualizerContextType>({
  style: 'spectrum',
  setStyle: () => {},
  quality: 'balanced',
  setQuality: () => {},
  toggleQuality: () => {},
  nextStyle: () => {},
});

const STYLES: VisualizerStyle[] = ['spectrum', 'waveform', 'circular', 'minimal', 'ambient', 'aurora', 'particles', 'studio'];

export function VisualizerProvider({ children }: { children: ReactNode }) {
  const [style, setStyleState] = useState<VisualizerStyle>(() => {
    try {
      const saved = localStorage.getItem('aak_viz_style');
      if (saved && STYLES.includes(saved as VisualizerStyle)) {
        return saved as VisualizerStyle;
      }
    } catch {
      // ignore
    }
    return 'spectrum';
  });

  const [quality, setQualityState] = useState<VisualizerQuality>(() => {
    try {
      const saved = localStorage.getItem('aak_viz_quality');
      if (saved && (saved === 'low' || saved === 'balanced' || saved === 'high')) {
        return saved as VisualizerQuality;
      }
    } catch {
      // ignore
    }
    return 'balanced';
  });

  const setStyle = (s: VisualizerStyle) => {
    setStyleState(s);
    try {
      localStorage.setItem('aak_viz_style', s);
    } catch {
      // ignore
    }
  };

  const setQuality = (q: VisualizerQuality) => {
    setQualityState(q);
    try {
      localStorage.setItem('aak_viz_quality', q);
    } catch {
      // ignore
    }
  };

  const nextStyle = () => {
    const idx = STYLES.indexOf(style);
    const next = STYLES[(idx + 1) % STYLES.length];
    setStyle(next);
  };

  const toggleQuality = () => {
    const nextQ: Record<VisualizerQuality, VisualizerQuality> = {
      low: 'balanced',
      balanced: 'high',
      high: 'low',
    };
    setQuality(nextQ[quality]);
  };

  return (
    <VisualizerContext.Provider
      value={{
        style,
        setStyle,
        quality,
        setQuality,
        toggleQuality,
        nextStyle,
      }}
    >
      {children}
    </VisualizerContext.Provider>
  );
}

export const useVisualizer = () => useContext(VisualizerContext);

