import { useEffect, useRef } from 'react';
import { motion, fine } from './motion';
import { decorativeMotionAllowed, PERFORMANCE_MODE_EVENT } from '../utils/performanceMode';

// A restrained 1–3px cursor drift. It only schedules frames while the target is easing.
export function usePointerShift<T extends HTMLElement>(amplitude = 3) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !fine) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    let visible = false;
    let listening = false;
    const schedule = () => {
      if (visible && motion.seen && decorativeMotionAllowed() && !raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      raf = 0;
      if (!visible || !motion.seen || !decorativeMotionAllowed()) return;
      const targetX = (motion.mx / Math.max(1, innerWidth) - 0.5) * 2;
      const targetY = (motion.my / Math.max(1, innerHeight) - 0.5) * 2;
      x += (targetX - x) * 0.06;
      y += (targetY - y) * 0.06;
      element.style.translate = `${x * amplitude}px ${y * amplitude * 0.7}px`;
      if (Math.abs(targetX - x) > 0.002 || Math.abs(targetY - y) > 0.002) schedule();
    };
    const onPointerMove = (event: PointerEvent) => { if (event.pointerType === 'mouse') schedule(); };
    const onVisibility = () => {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
      else schedule();
    };
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => {
      const enabled = decorativeMotionAllowed();
      if (enabled === listening) return;
      listening = enabled;
      if (enabled) window.addEventListener('pointermove', onPointerMove, { passive: true });
      else {
        window.removeEventListener('pointermove', onPointerMove);
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        element.style.translate = '';
        x = 0; y = 0;
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    });
    observer.observe(element);
    syncPreference();
    window.addEventListener(PERFORMANCE_MODE_EVENT, syncPreference);
    preference.addEventListener('change', syncPreference);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener(PERFORMANCE_MODE_EVENT, syncPreference);
      preference.removeEventListener('change', syncPreference);
      document.removeEventListener('visibilitychange', onVisibility);
      if (raf) cancelAnimationFrame(raf);
      element.style.translate = '';
    };
  }, [amplitude]);
  return ref;
}
