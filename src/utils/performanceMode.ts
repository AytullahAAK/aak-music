export type PerformanceMode = 'low' | 'balanced' | 'high';
export type PerformancePreference = 'auto' | PerformanceMode;
export const PERFORMANCE_MODE_EVENT = 'aak-performance-mode-change';
export const PERFORMANCE_PREFERENCE_KEY = 'aak-performance-preference-v1';

/**
 * Conservative, local-only capability estimate. Browser APIs expose memory and
 * logical CPUs but not a trustworthy GPU benchmark, so ambiguous devices stay
 * on Balance. This is a starting point, not a hardware fingerprint.
 */
export function getDevicePerformanceMode(): PerformanceMode {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'balanced';

  const width = window.innerWidth || 0;
  const screenWidth = window.screen?.width || 0;
  const screenHeight = window.screen?.height || 0;
  const screenShortEdge = screenWidth && screenHeight ? Math.min(screenWidth, screenHeight) : 0;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  const constrained = (typeof memory === 'number' && memory <= 2) || (typeof cores === 'number' && cores <= 2);
  if (prefersReducedMotion() || constrained) return 'low';

  const phoneLikeScreen = screenShortEdge > 0 && screenShortEdge <= 540;
  const phone = (coarse || navigator.maxTouchPoints > 0) && (phoneLikeScreen || (!screenShortEdge && width > 0 && width < 700));
  if (phone) return 'low';

  const tablet = (coarse && width < 1200) || (width >= 700 && width < 1100);
  if (tablet || width < 1200) return 'balanced';

  // A wide viewport plus several logical cores is a useful, imperfect signal
  // for a capable desktop. Missing signals deliberately fall back to Balance.
  const hasAdequateCpu = typeof cores === 'number' && cores >= 8;
  const hasAdequateMemory = typeof memory === 'number' && memory >= 8;
  return hasAdequateCpu && (hasAdequateMemory || memory === undefined) && !coarse ? 'high' : 'balanced';
}

export function readPerformancePreference(): PerformancePreference {
  try {
    const saved = localStorage.getItem(PERFORMANCE_PREFERENCE_KEY);
    if (saved === 'auto' || saved === 'low' || saved === 'balanced' || saved === 'high') return saved;
    // Migrate the old visualizer-quality preference as an explicit user choice.
    const legacy = localStorage.getItem('aak_viz_quality');
    if (legacy === 'low' || legacy === 'balanced' || legacy === 'high') return legacy;
  } catch {
    // Storage can be unavailable in private browsing; Auto still works in memory.
  }
  return 'auto';
}

// The React preference is authoritative; this DOM attribute is its synchronous
// mirror for CSS and long-lived canvas/pointer systems.
export function getPerformanceMode(): PerformanceMode {
  const value = typeof document === 'undefined' ? '' : document.documentElement.dataset.performanceMode;
  return value === 'low' || value === 'high' ? value : 'balanced';
}

export function prefersReducedMotion() {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function decorativeMotionAllowed() {
  return getPerformanceMode() !== 'low' && !prefersReducedMotion();
}

export function publishPerformanceMode(mode: PerformanceMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.performanceMode = mode;
  window.dispatchEvent(new CustomEvent<PerformanceMode>(PERFORMANCE_MODE_EVENT, { detail: mode }));
}
