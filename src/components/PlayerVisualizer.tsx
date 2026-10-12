import { memo, useEffect, useRef } from 'react';
import { motion, reduced } from '../hooks/motion';
import { sampleAnalyser } from '../hooks/analyser';
import { useVisualizer } from '../hooks/useVisualizer';

const EMPTY_BANDS = new Float32Array(32);
const EMPTY_WAVEFORM = new Float32Array(128);

function PlayerVisualizer({ analyserAvailable = true }: { analyserAvailable?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { style, quality } = useVisualizer();
  const styleRef = useRef(style);
  const qualityRef = useRef(quality);
  const analyserAvailableRef = useRef(analyserAvailable);
  styleRef.current = style;
  qualityRef.current = quality;
  analyserAvailableRef.current = analyserAvailable;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !ctx) return;
    let width = 0; let height = 0; let dpr = 1; let raf = 0; let visible = false; let lastFrame = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, qualityRef.current === 'low' ? 1 : qualityRef.current === 'balanced' ? 1.25 : 1.5);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
    };
    const color = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || (name === '--accent' ? '134 88 255' : '95 212 255');
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const available = analyserAvailableRef.current;
      const active = available && motion.playing;
      const level = active ? Math.min(1, motion.level) : 0;
      const bass = active ? Math.min(1, motion.bass) : 0;
      const accent = color('--accent'); const secondary = color('--accent2');
      const bands = available ? motion.bands : EMPTY_BANDS; const wave = available ? motion.waveform : EMPTY_WAVEFORM;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const mode = styleRef.current;

      if (mode === 'waveform' || mode === 'ambient') {
        const center = height / 2; const amplitude = Math.min(height * (mode === 'ambient' ? 0.38 : 0.44), (mode === 'ambient' ? 8 : 12) + level * height * 0.38);
        const points = Math.min(wave.length, Math.max(32, Math.floor(width / 3)));
        ctx.beginPath(); ctx.moveTo(0, center + (wave[0] || 0) * amplitude);
        for (let i = 1; i < points - 1; i++) {
          const x = i / (points - 1) * width; const nextX = (i + 1) / (points - 1) * width;
          const y = center + wave[Math.floor(i / points * wave.length)] * amplitude;
          const nextY = center + wave[Math.floor((i + 1) / points * wave.length)] * amplitude;
          ctx.quadraticCurveTo(x, y, (x + nextX) / 2, (y + nextY) / 2);
        }
        ctx.strokeStyle = `rgb(${secondary} / ${active ? .88 : .28})`; ctx.lineWidth = mode === 'ambient' ? 2.5 : 1.7; ctx.stroke();
        if (mode === 'ambient') { ctx.strokeStyle = `rgb(${accent} / .22)`; ctx.lineWidth = 5; ctx.stroke(); }
      } else if (mode === 'circular') {
        const cx = width / 2; const cy = height / 2; const radius = Math.min(width, height) * .19; const bars = Math.min(48, bands.length);
        for (let i = 0; i < bars; i++) { const angle = i / bars * Math.PI * 2; const value = bands[Math.floor(i / bars * bands.length)] || 0; const length = 4 + value * height * .31; ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius); ctx.lineTo(cx + Math.cos(angle) * (radius + length), cy + Math.sin(angle) * (radius + length)); ctx.strokeStyle = `rgb(${i % 2 ? secondary : accent} / ${active ? .8 : .28})`; ctx.lineWidth = 2; ctx.stroke(); }
      } else if (mode === 'minimal') {
        const pulse = 3 + bass * height * .28; ctx.beginPath(); ctx.arc(width / 2, height / 2, pulse, 0, Math.PI * 2); ctx.strokeStyle = `rgb(${secondary} / ${active ? .8 : .28})`; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(width * .36, height / 2); ctx.lineTo(width * .64, height / 2); ctx.strokeStyle = `rgb(${accent} / ${active ? .7 : .25})`; ctx.stroke();
      } else if (mode === 'aurora') {
        const y = height * .5; const gradient = ctx.createLinearGradient(0, 0, width, height); gradient.addColorStop(0, `rgb(${accent} / ${.12 + level * .22})`); gradient.addColorStop(.5, `rgb(${secondary} / ${.08 + bass * .25})`); gradient.addColorStop(1, `rgb(${accent} / ${.1 + level * .18})`);
        ctx.beginPath(); ctx.moveTo(0, y); for (let i = 0; i <= 32; i++) { const x = width * i / 32; const idx = Math.floor(i / 32 * (bands.length - 1)); const h = (bands[idx] || 0) * height * .48; ctx.lineTo(x, y + (i % 2 ? -h : h)); } ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
      } else if (mode === 'particles') {
        const count = qualityRef.current === 'low' ? 12 : 24;
        for (let i = 0; i < count; i++) { const value = bands[(i * 7) % bands.length] || 0; const x = (i + .5) / count * width; const y = height * (.25 + ((i * 37) % 70) / 100); const radius = 1.2 + value * 4; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = `rgb(${i % 2 ? secondary : accent} / ${active ? .28 + value * .65 : .25})`; ctx.fill(); }
      } else {
        const count = mode === 'studio' ? Math.min(36, Math.floor(width / 8)) : Math.min(28, Math.floor(width / 10));
        const gap = mode === 'studio' ? 2 : 3; const barWidth = Math.max(2, (width - gap * (count - 1)) / count);
        for (let i = 0; i < count; i++) {
          const value = bands[Math.floor(i / count * bands.length)] || 0;
          const h = Math.max(2, (mode === 'studio' ? 3 : 4) + value * (height * (mode === 'studio' ? .82 : .65)) + (mode === 'spectrum' ? bass * Math.max(0, 1 - i / (count * .24)) * height * .18 : 0));
          const x = i * (barWidth + gap); const y = (height - h) / 2; ctx.fillStyle = `rgb(${i % 3 ? accent : secondary} / ${active ? .52 + value * .45 : .25})`;
          if (mode === 'studio') ctx.fillRect(x, y, barWidth, h); else { ctx.beginPath(); ctx.roundRect(x, y, barWidth, h, barWidth / 2); ctx.fill(); }
        }
      }
    };
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const frame = (time: number) => {
      if (!visible || document.hidden) { stop(); return; }
      if (time - lastFrame >= (qualityRef.current === 'low' ? 50 : 33)) {
        lastFrame = time;
        if (analyserAvailableRef.current && motion.playing && !reduced) sampleAnalyser();
        draw();
      }
      if (analyserAvailableRef.current && motion.playing && !reduced) raf = requestAnimationFrame(frame);
      else { draw(); stop(); }
    };
    const start = () => {
      if (visible && analyserAvailableRef.current && motion.playing && !document.hidden) sampleAnalyser();
      if (visible && analyserAvailableRef.current && motion.playing && !document.hidden && !reduced && !raf) raf = requestAnimationFrame(frame);
      else draw();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting); window.dispatchEvent(new CustomEvent('aak-inline-visualizer-state', { detail: visible }));
      if (visible) start(); else stop();
    }, { threshold: .12 });
    observer.observe(canvas);
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas);
    const activity = () => start(); const visibility = () => document.hidden ? stop() : start();
    const theme = new MutationObserver(draw); theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    window.addEventListener('aak-audio-activity', activity); document.addEventListener('visibilitychange', visibility);
    resize();
    return () => { stop(); observer.disconnect(); resizeObserver.disconnect(); theme.disconnect(); window.removeEventListener('aak-audio-activity', activity); document.removeEventListener('visibilitychange', visibility); window.dispatchEvent(new CustomEvent('aak-inline-visualizer-state', { detail: false })); };
  }, []);

  return <div className="relative h-20 min-w-0 overflow-hidden rounded-xl border border-bone/10 bg-void/25" data-aak-player-visualizer>
    <canvas ref={canvasRef} role="img" aria-label={analyserAvailable ? `${style} audio visualizer${motion.playing ? ' active' : ' idle'}` : `${style} visualizer, audio analysis unavailable for this source`} className="h-full w-full" />
    <span aria-hidden="true" className="pointer-events-none absolute left-3 top-2 rounded-full bg-ink/55 px-2 py-1 text-[8px] font-mono uppercase tracking-wider text-bone/45">{style.replace(/^./, (letter) => letter.toUpperCase())}</span>
  </div>;
}

export default memo(PlayerVisualizer);
