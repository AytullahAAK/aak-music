import { useEffect, useRef, useState } from 'react';
import { CinematicDirector } from './CinematicDirector';
import { useTheme } from '../../hooks/useTheme';

export default function CinematicCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const directorRef = useRef<CinematicDirector | null>(null);
  const { theme } = useTheme();
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Test WebGL support
    try {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    let director: CinematicDirector;
    try {
      director = new CinematicDirector(canvas);
      directorRef.current = director;
      director.setTheme(theme === 'dark');
    } catch (e) {
      console.warn('Cinematic 3D initialization failed, falling back:', e);
      setWebglSupported(false);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? window.scrollY / docHeight : 0;
      director.updateScrollProgress(progress);
    };

    const handleResize = () => {
      director.resize(window.innerWidth, window.innerHeight);
      handleScroll();
    };

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      if (document.hidden) return;
      const time = (now - startTime) / 1000;
      director.render(time);
    };

    // Initial setup
    handleResize();
    handleScroll();
    rafId = requestAnimationFrame(loop);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      director.destroy();
      directorRef.current = null;
    };
  }, []);

  // Update theme dynamically
  useEffect(() => {
    if (directorRef.current) {
      directorRef.current.setTheme(theme === 'dark');
    }
  }, [theme]);

  if (!webglSupported) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-5 overflow-hidden transition-opacity duration-1000"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full block"
      />
    </div>
  );
}

