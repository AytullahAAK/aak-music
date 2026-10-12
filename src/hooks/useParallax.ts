import { useEffect, useRef } from 'react';
import { decorativeMotionAllowed, PERFORMANCE_MODE_EVENT } from '../utils/performanceMode';

// Decorative scroll drift is detached entirely in Low and reduced-motion modes.
export function useParallax<T extends HTMLElement>(k = 0.1) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let enabled = false;
    const update = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        const target = element.parentElement;
        if (!enabled || !target) return;
        const bounds = target.getBoundingClientRect();
        element.style.transform = `translate3d(0,${(bounds.top + bounds.height / 2 - innerHeight / 2) * k}px,0)`;
      });
    };
    const sync = () => {
      const next = decorativeMotionAllowed();
      if (next === enabled) return;
      enabled = next;
      if (enabled) {
        addEventListener('scroll', update, { passive: true });
        update();
      } else {
        removeEventListener('scroll', update);
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        element.style.transform = '';
      }
    };
    sync();
    window.addEventListener(PERFORMANCE_MODE_EVENT, sync);
    preference.addEventListener('change', sync);
    return () => {
      removeEventListener('scroll', update);
      window.removeEventListener(PERFORMANCE_MODE_EVENT, sync);
      preference.removeEventListener('change', sync);
      if (frame) cancelAnimationFrame(frame);
      element.style.transform = '';
    };
  }, [k]);
  return ref;
}
