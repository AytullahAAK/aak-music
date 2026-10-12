import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  getDevicePerformanceMode,
  publishPerformanceMode,
  readPerformancePreference,
  PERFORMANCE_PREFERENCE_KEY,
  type PerformanceMode,
  type PerformancePreference,
} from '../utils/performanceMode';

export type VisualizerStyle = 'spectrum' | 'waveform' | 'circular' | 'minimal' | 'ambient' | 'aurora' | 'particles' | 'studio';
export type VisualizerQuality = PerformanceMode;

interface VisualizerContextType {
  style: VisualizerStyle;
  setStyle: (style: VisualizerStyle) => void;
  /** Effective quality currently applied across the site. */
  quality: VisualizerQuality;
  /** Selecting a quality is an explicit manual override. */
  setQuality: (quality: VisualizerQuality) => void;
  preference: PerformancePreference;
  setPreference: (preference: PerformancePreference) => void;
  toggleQuality: () => void;
  nextStyle: () => void;
}

const VisualizerContext = createContext<VisualizerContextType>({
  style: 'spectrum',
  setStyle: () => {},
  quality: 'balanced',
  setQuality: () => {},
  preference: 'auto',
  setPreference: () => {},
  toggleQuality: () => {},
  nextStyle: () => {},
});

const STYLES: VisualizerStyle[] = ['spectrum', 'waveform', 'circular', 'minimal', 'ambient', 'aurora', 'particles', 'studio'];
const isMode = (value: string): value is PerformanceMode => value === 'low' || value === 'balanced' || value === 'high';
const rank: Record<PerformanceMode, number> = { low: 0, balanced: 1, high: 2 };

export function VisualizerProvider({ children }: { children: ReactNode }) {
  const [style, setStyleState] = useState<VisualizerStyle>(() => {
    try {
      const saved = localStorage.getItem('aak_viz_style');
      if (saved && STYLES.includes(saved as VisualizerStyle)) return saved as VisualizerStyle;
    } catch { /* Ignore unavailable storage. */ }
    return 'spectrum';
  });

  const [preference, setPreferenceState] = useState<PerformancePreference>(readPerformancePreference);
  const [autoQuality, setAutoQuality] = useState<PerformanceMode>(() => getDevicePerformanceMode());
  const autoDegraded = useRef(false);
  const quality = preference === 'auto' ? autoQuality : preference;

  useEffect(() => {
    document.documentElement.dataset.performancePreference = preference;
    try {
      localStorage.setItem(PERFORMANCE_PREFERENCE_KEY, preference);
      // Keep the previous visualizer setting in sync for older app versions.
      if (preference !== 'auto') localStorage.setItem('aak_viz_quality', preference);
    } catch { /* Preferences remain active for this session if storage is unavailable. */ }
  }, [preference]);

  useEffect(() => {
    if (preference !== 'auto') return;
    let resizeTimer = 0;
    const refreshAutoEstimate = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const estimate = getDevicePerformanceMode();
        setAutoQuality((current) => autoDegraded.current && !matchMedia('(prefers-reduced-motion: reduce)').matches
          ? rank[current] < rank[estimate] ? current : estimate
          : estimate);
      }, 180);
    };
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion.addEventListener('change', refreshAutoEstimate);
    window.addEventListener('resize', refreshAutoEstimate, { passive: true });
    return () => {
      reducedMotion.removeEventListener('change', refreshAutoEstimate);
      window.removeEventListener('resize', refreshAutoEstimate);
      window.clearTimeout(resizeTimer);
    };
  }, [preference]);

  useEffect(() => { publishPerformanceMode(quality); }, [quality]);

  // Auto mode listens only for the browser's event-based Long Tasks API. It
  // downgrades after repeated >50ms main-thread tasks, never on one spike, and
  // does no polling or benchmarking. Unsupported browsers retain the device estimate.
  useEffect(() => {
    if (preference !== 'auto' || autoQuality === 'low' || typeof PerformanceObserver === 'undefined') return;
    let observer: PerformanceObserver | null = null;
    let recent: number[] = [];
    let lastDowngrade = -Infinity;
    const observe = () => {
      observer?.disconnect();
      observer = null;
      if (document.hidden || !PerformanceObserver.supportedEntryTypes?.includes('longtask')) return;
      try {
        observer = new PerformanceObserver((list) => {
          const now = performance.now();
          recent = recent.filter((time) => now - time < 20_000);
          for (const entry of list.getEntries()) {
            if (entry.duration >= 50) recent.push(entry.startTime);
          }
          if (recent.length < 4 || now - lastDowngrade < 15_000) return;
          lastDowngrade = now;
          recent = [];
          setAutoQuality((current) => {
            if (current === 'low') return current;
            autoDegraded.current = true;
            return current === 'high' ? 'balanced' : 'low';
          });
        });
        observer.observe({ type: 'longtask', buffered: false });
      } catch {
        observer?.disconnect();
        observer = null;
      }
    };
    const visibility = () => {
      if (document.hidden) {
        observer?.disconnect();
        observer = null;
        recent = [];
      } else observe();
    };
    observe();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [preference, autoQuality]);

  const setStyle = useCallback((next: VisualizerStyle) => {
    setStyleState(next);
    try { localStorage.setItem('aak_viz_style', next); } catch { /* Ignore unavailable storage. */ }
  }, []);

  const setPreference = useCallback((next: PerformancePreference) => {
    if (next !== 'auto' && !isMode(next)) return;
    const nextQuality = next === 'auto' ? getDevicePerformanceMode() : next;
    // Publish before React commits so currently mounted canvas and CSS effects
    // stop/update in the same user interaction.
    publishPerformanceMode(nextQuality);
    document.documentElement.dataset.performancePreference = next;
    setPreferenceState(next);
    if (next === 'auto') {
      autoDegraded.current = false;
      setAutoQuality(nextQuality);
    }
  }, []);

  const setQuality = useCallback((next: VisualizerQuality) => setPreference(next), [setPreference]);

  const nextStyle = useCallback(() => {
    setStyle(STYLES[(STYLES.indexOf(style) + 1) % STYLES.length]);
  }, [setStyle, style]);

  const toggleQuality = useCallback(() => {
    const next: Record<VisualizerQuality, PerformancePreference> = {
      low: 'balanced', balanced: 'high', high: 'low',
    };
    setPreference(next[quality]);
  }, [quality, setPreference]);

  const value = useMemo(() => ({ style, setStyle, quality, setQuality, preference, setPreference, toggleQuality, nextStyle }), [
    style, setStyle, quality, setQuality, preference, setPreference, toggleQuality, nextStyle,
  ]);

  return <VisualizerContext.Provider value={value}>{children}</VisualizerContext.Provider>;
}

export const useVisualizer = () => useContext(VisualizerContext);
