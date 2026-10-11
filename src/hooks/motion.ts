import { useEffect } from 'react';

const mq = (query: string) => typeof matchMedia !== 'undefined' && matchMedia(query).matches;
export const fine = mq('(hover:hover) and (pointer:fine)');
export const reduced = mq('(prefers-reduced-motion:reduce)');

// High-frequency pointer and audio values are shared outside React state.
export const motion = {
  mx: 0, my: 0, seen: false, level: 0, bass: 0, kick: 0, transient: 0,
  bands: new Float32Array(32), waveform: new Float32Array(128), playing: false,
};

export function usePointerTracking() {
  useEffect(() => {
    const visualViewport = window.visualViewport;
    const updateViewport = () => {
      const root = document.documentElement;
      const width = root.clientWidth || visualViewport?.width || window.innerWidth;
      const height = visualViewport?.height || window.innerHeight;
      root.style.setProperty('--visual-viewport-width', `${Math.round(width)}px`);
      root.style.setProperty('--visual-viewport-height', `${Math.round(height)}px`);
      root.style.setProperty('--visual-viewport-left', `${Math.round(visualViewport?.offsetLeft ?? 0)}px`);
      root.style.setProperty('--visual-viewport-top', `${Math.round(visualViewport?.offsetTop ?? 0)}px`);
    };
    updateViewport();
    const viewportObserver = new ResizeObserver(updateViewport);
    viewportObserver.observe(document.documentElement);
    window.addEventListener('resize', updateViewport, { passive: true });
    visualViewport?.addEventListener('resize', updateViewport, { passive: true });
    visualViewport?.addEventListener('scroll', updateViewport, { passive: true });

    let raf = 0;
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      motion.mx = event.clientX;
      motion.my = event.clientY;
      motion.seen = true;
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        const root = document.documentElement;
        root.style.setProperty('--pointer-x', `${motion.mx}px`);
        root.style.setProperty('--pointer-y', `${motion.my}px`);
      });
    };
    if (fine && !reduced) addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      window.removeEventListener('resize', updateViewport);
      viewportObserver.disconnect();
      visualViewport?.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('scroll', updateViewport);
      if (fine && !reduced) removeEventListener('pointermove', onPointerMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}
