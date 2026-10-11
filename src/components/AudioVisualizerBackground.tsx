import { useEffect, useRef } from 'react';
import { motion, reduced } from '../hooks/motion';
import { sampleAnalyser } from '../hooks/analyser';
import { useVisualizer } from '../hooks/useVisualizer';

const tok = (v: string) =>
  getComputedStyle(document.documentElement)
    .getPropertyValue(v)
    .trim();

export default function AudioVisualizerBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startLoopRef = useRef<(() => void) | null>(null);
  const { style, quality } = useVisualizer();
  const styleRef = useRef(style);
  styleRef.current = style;

  const qualityRef = useRef(quality);
  qualityRef.current = quality;

  const playingRef = useRef(motion.playing);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let raf = 0;
    let isLoopRunning = false;
    let inlinePlayerVisible = false;

    // Smoothed visualizer values
    let smoothLevel = 0;
    let smoothBass = 0;
    let smoothKick = 0;
    let smoothTransient = 0;
    let fadeOpacity = 0; // 0 = completely inactive, 1 = fully active
    let lastTime = performance.now();

    // Bars smoothing buffer
    let barCount = 48;
    let smoothBars = new Float32Array(barCount);
    let peakBars = new Float32Array(barCount);
    let smoothWaveform = new Float32Array(motion.waveform.length);
    let particles = Array.from({ length: 40 }, (_, i) => ({
      x: ((i * 0.61803398875) % 1),
      y: ((i * 0.41421356237 + 0.13) % 1),
      phase: i * 2.3999632297,
      band: i % 32,
    }));

    let accent = '134 88 255';
    let accent2 = '95 212 255';

    const resize = () => {
      const q = qualityRef.current;
      const maxDpr = q === 'low' ? 1.0 : q === 'balanced' ? 1.25 : 1.5;
      dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

      // On mobile, innerWidth can be the wider layout viewport while the
      // visual/layout viewport is narrower; sizing to it created page overflow.
      W = document.documentElement.clientWidth || window.innerWidth;
      H = Math.round(window.visualViewport?.height || window.innerHeight);

      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);

      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Bar count based on viewport & quality
      const isMobile = W < 768;
      let count = 48;
      if (q === 'low') {
        count = isMobile ? 24 : 36;
      } else if (q === 'balanced') {
        count = isMobile ? 32 : 56;
      } else {
        count = isMobile ? 48 : 72;
      }

      if (barCount !== count) {
        barCount = count;
        smoothBars = new Float32Array(barCount);
        peakBars = new Float32Array(barCount);
      }
      const particleCount = q === 'low' ? 18 : q === 'balanced' ? 30 : 42;
      if (particles.length !== particleCount) {
        particles = Array.from({ length: particleCount }, (_, i) => ({
          x: ((i * 0.61803398875) % 1), y: ((i * 0.41421356237 + 0.13) % 1),
          phase: i * 2.3999632297, band: i % 32,
        }));
      }
    };

    const readTheme = () => {
      accent = tok('--accent') || '134 88 255';
      accent2 = tok('--accent2') || '95 212 255';
    };

    // --- DRAWING STYLES ---

    // 1. SPECTRUM BARS
    const drawSpectrumBars = (alpha: number) => {
      const totalWidth = Math.min(W * 0.9, 1200);
      const startX = (W - totalWidth) / 2;
      const centerY = H * 0.65;
      const barWidth = totalWidth / barCount;
      const gap = Math.max(2, barWidth * 0.28);
      const activeWidth = barWidth - gap;

      const grad = ctx.createLinearGradient(0, centerY - 140, 0, centerY + 140);
      grad.addColorStop(0, `rgb(${accent2} / ${0.75 * alpha})`);
      grad.addColorStop(0.5, `rgb(${accent} / ${0.85 * alpha})`);
      grad.addColorStop(1, `rgb(${accent2} / ${0.65 * alpha})`);

      ctx.fillStyle = grad;

      for (let i = 0; i < barCount; i++) {
        const val = smoothBars[i];
        const lowWeight = i < Math.ceil(barCount * 0.16) ? 1 - i / (barCount * 0.2) : 0;
        const barH = Math.max(2, val * 190 + Math.max(0, lowWeight) * smoothKick * 58 + smoothTransient * 8);
        const x = startX + i * barWidth;

        // Symmetric vertical expansion
        const yTop = centerY - barH * 0.5;
        const radius = Math.min(activeWidth / 2, 4);

        ctx.beginPath();
        ctx.roundRect(x, yTop, activeWidth, barH, radius);
        ctx.fill();

        // Subtle peak caps
        if (qualityRef.current !== 'low' && peakBars[i] > val + 0.05) {
          const peakY = centerY - (peakBars[i] * 190 + Math.max(0, lowWeight) * smoothKick * 58) * 0.5 - 4;
          ctx.fillStyle = `rgb(${accent2} / ${0.9 * alpha})`;
          ctx.fillRect(x, peakY, activeWidth, 2);
          ctx.fillStyle = grad;
        }
      }

      // Bass reflection floor
      if (smoothKick > 0.12) {
        const glowGrad = ctx.createRadialGradient(W / 2, centerY, 10, W / 2, centerY, totalWidth * 0.5);
        glowGrad.addColorStop(0, `rgb(${accent} / ${smoothKick * 0.18 * alpha})`);
        glowGrad.addColorStop(1, 'rgb(0 0 0 / 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, centerY - 150, W, 300);
      }
    };

    // 2. OSCILLOSCOPE WAVEFORM
    const drawWaveform = (alpha: number) => {
      const centerY = H * 0.55;
      const points = smoothWaveform.length - 1;
      const step = W / points;
      const amplitude = Math.min(112, H * 0.18) * (0.25 + smoothLevel * 0.95);
      ctx.beginPath();
      ctx.moveTo(0, centerY + smoothWaveform[0] * amplitude);
      for (let i = 1; i < points; i++) {
        const midX = (i + 0.5) * step;
        const midY = centerY + (smoothWaveform[i] + smoothWaveform[i + 1]) * 0.5 * amplitude;
        ctx.quadraticCurveTo(i * step, centerY + smoothWaveform[i] * amplitude, midX, midY);
      }
      ctx.lineTo(W, centerY + smoothWaveform[points] * amplitude);
      ctx.strokeStyle = `rgb(${accent2} / ${0.82 * alpha})`;
      ctx.lineWidth = qualityRef.current === 'low' ? 1.5 : 2.25;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.shadowColor = `rgb(${accent2} / ${0.18 * alpha})`;
      ctx.shadowBlur = qualityRef.current === 'low' ? 0 : 8;
      ctx.strokeStyle = `rgb(${accent} / ${0.35 * alpha})`;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    // 3. CIRCULAR SPECTRUM (RADIAL AURA)
    const drawCircular = (alpha: number) => {
      const cx = W / 2;
      const cy = H * 0.52;
      const baseRadius = Math.min(W, H) * 0.22 + smoothKick * 48;
      const angleStep = (Math.PI * 2) / barCount;

      // Center subtle bloom
      const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 1.6);
      bloom.addColorStop(0, `rgb(${accent} / ${smoothKick * 0.2 * alpha})`);
      bloom.addColorStop(0.7, `rgb(${accent2} / ${smoothLevel * 0.08 * alpha})`);
      bloom.addColorStop(1, 'rgb(0 0 0 / 0)');
      ctx.fillStyle = bloom;
      ctx.fillRect(cx - baseRadius * 2, cy - baseRadius * 2, baseRadius * 4, baseRadius * 4);

      // Circular radiating spikes
      ctx.lineWidth = Math.max(2, (2 * Math.PI * baseRadius) / (barCount * 3.5));
      ctx.lineCap = 'round';

      for (let i = 0; i < barCount; i++) {
        const val = smoothBars[i];
        const angle = i * angleStep;
        const lowWeight = i < Math.ceil(barCount * 0.16) ? 1 - i / (barCount * 0.2) : 0;
        const len = val * (Math.min(W, H) * 0.2) + Math.max(0, lowWeight) * smoothKick * 34;

        const x1 = cx + Math.cos(angle) * baseRadius;
        const y1 = cy + Math.sin(angle) * baseRadius;
        const x2 = cx + Math.cos(angle) * (baseRadius + len);
        const y2 = cy + Math.sin(angle) * (baseRadius + len);

        ctx.strokeStyle = `rgb(${i % 2 === 0 ? accent : accent2} / ${0.75 * alpha})`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };

    // 4. MINIMAL FREQUENCY LINES
    const drawMinimal = (alpha: number) => {
      const centerY = H * 0.58;
      const margin = W * 0.1;
      const usableW = W - margin * 2;
      const step = usableW / barCount;

      // Clean baseline
      ctx.strokeStyle = `rgb(${accent} / ${0.2 * alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin, centerY);
      ctx.lineTo(W - margin, centerY);
      ctx.stroke();

      ctx.strokeStyle = `rgb(${accent} / ${0.16 * smoothKick * alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(W / 2, centerY, 34 + smoothKick * 36, 0, Math.PI * 2);
      ctx.stroke();

      // Precision vertical frequency needles
      ctx.lineWidth = 1.5;
      for (let i = 0; i < barCount; i++) {
        const val = smoothBars[i];
        if (val < 0.02) continue;
        const x = margin + i * step;
        const h = val * 120;

        ctx.strokeStyle = `rgb(${accent2} / ${0.7 * alpha})`;
        ctx.beginPath();
        ctx.moveTo(x, centerY);
        ctx.lineTo(x, centerY - h);
        ctx.stroke();

        // Terminal precision dot
        ctx.fillStyle = `rgb(${accent} / ${0.9 * alpha})`;
        ctx.beginPath();
        ctx.arc(x, centerY - h, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Liquid Wave uses the measured time-domain signal with a smooth curve.
    const drawAmbientWaveform = (alpha: number) => {
      const centerY = H * 0.62;
      const step = W / (smoothWaveform.length - 1);
      const amplitude = Math.min(92, H * 0.15) * (0.18 + smoothLevel * 0.72 + smoothBass * 0.16);
      const layers = qualityRef.current === 'low' ? 2 : 3;
      for (let layer = layers - 1; layer >= 0; layer--) {
        const scale = 1 - layer * 0.18;
        const offset = (layer - 1) * Math.min(22, H * 0.025);
        ctx.beginPath();
        ctx.moveTo(0, centerY + smoothWaveform[0] * amplitude * scale + offset);
        for (let i = 1; i < smoothWaveform.length - 1; i++) {
          const x = (i + 0.5) * step;
          const y = centerY + (smoothWaveform[i] + smoothWaveform[i + 1]) * 0.5 * amplitude * scale + offset;
          ctx.quadraticCurveTo(i * step, centerY + smoothWaveform[i] * amplitude * scale + offset, x, y);
        }
        ctx.lineTo(W, centerY + smoothWaveform[smoothWaveform.length - 1] * amplitude * scale + offset);
        ctx.strokeStyle = `rgb(${layer === 1 ? accent2 : accent} / ${(0.22 + smoothLevel * 0.36) * alpha / (layer + 1)})`;
        ctx.lineWidth = layer === 0 ? 2 : 1.25;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    };

    const drawAurora = (alpha: number, time: number) => {
      const drift = Math.sin(time * 0.00011) * W * 0.08;
      const fields = [
        { x: W * 0.28 + drift, y: H * 0.36, r: Math.max(W, H) * (0.38 + smoothBars[4] * 0.06), color: accent },
        { x: W * 0.72 - drift, y: H * 0.56, r: Math.max(W, H) * (0.34 + smoothBars[14] * 0.06), color: accent2 },
        { x: W * 0.5, y: H * 0.78, r: Math.max(W, H) * (0.25 + smoothKick * 0.05), color: accent },
      ];
      for (const field of fields) {
        const glow = ctx.createRadialGradient(field.x, field.y, 0, field.x, field.y, field.r);
        const energy = smoothLevel * 0.1 + smoothKick * 0.07;
        glow.addColorStop(0, `rgb(${field.color} / ${energy * alpha})`);
        glow.addColorStop(0.48, `rgb(${field.color} / ${energy * 0.42 * alpha})`);
        glow.addColorStop(1, `rgb(${field.color} / 0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
      }
    };

    const drawParticles = (alpha: number, time: number) => {
      for (const particle of particles) {
        const energy = smoothBars[particle.band] || 0;
        const drift = qualityRef.current === 'low' ? 3 : 7;
        const x = particle.x * W + Math.sin(time * 0.00022 + particle.phase) * drift;
        const y = particle.y * H + Math.cos(time * 0.00016 + particle.phase) * drift;
        const radius = 0.8 + energy * (qualityRef.current === 'low' ? 3 : 5) + smoothKick * 1.5;
        if (radius < 1.25) continue;
        ctx.fillStyle = `rgb(${particle.band % 3 === 0 ? accent2 : accent} / ${Math.min(0.42, (0.08 + energy * 0.3) * alpha)})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawStudioSpectrum = (alpha: number) => {
      const left = W * 0.09;
      const width = W * 0.82;
      const base = H * 0.74;
      const height = Math.min(H * 0.24, 170);
      ctx.lineWidth = 1;
      for (let line = 0; line <= 4; line++) {
        const y = base - (height * line) / 4;
        ctx.strokeStyle = `rgb(${accent2} / ${line === 0 ? 0.26 : 0.08})`;
        ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + width, y); ctx.stroke();
      }
      const gap = W < 600 ? 2 : 3;
      const barWidth = Math.max(2, (width - (barCount - 1) * gap) / barCount);
      for (let i = 0; i < barCount; i++) {
        const level = smoothBars[i];
        const barHeight = Math.max(1, level * height);
        ctx.fillStyle = `rgb(${i < barCount * 0.28 ? accent : accent2} / ${(0.26 + level * 0.58) * alpha})`;
        ctx.fillRect(left + i * (barWidth + gap), base - barHeight, barWidth, barHeight);
      }
    };

    // --- MAIN RENDER LOOP ---
    const render = (time: number) => {
      // If page is hidden, stop loop
      if (document.hidden) {
        isLoopRunning = false;
        return;
      }

      // Read audio data if playing
      const isPlaying = playingRef.current;
      if (isPlaying) sampleAnalyser();

      // Smooth fade-in and fade-out transition
      const dt = Math.min(32, time - lastTime);
      lastTime = time;

      if (isPlaying) {
        fadeOpacity = Math.min(1, fadeOpacity + dt * 0.004);
      } else {
        fadeOpacity = Math.max(0, fadeOpacity - dt * 0.005);
      }

      // If fully faded out and not playing, STOP loop and clear canvas
      if (!isPlaying && fadeOpacity <= 0.001) {
        ctx.clearRect(0, 0, W, H);
        isLoopRunning = false;
        return;
      }

      // Update smoothed levels
      const targetLevel = isPlaying ? motion.level : 0;
      const targetBass = isPlaying ? motion.bass : 0;
      const targetKick = isPlaying ? motion.kick : 0;
      const targetTransient = isPlaying ? motion.transient : 0;
      smoothLevel += (targetLevel - smoothLevel) * (targetLevel > smoothLevel ? 0.48 : 0.12);
      smoothBass += (targetBass - smoothBass) * (targetBass > smoothBass ? 0.5 : 0.14);
      smoothKick += (targetKick - smoothKick) * (targetKick > smoothKick ? 0.72 : 0.13);
      smoothTransient += (targetTransient - smoothTransient) * (targetTransient > smoothTransient ? 0.82 : 0.16);
      for (let i = 0; i < smoothWaveform.length; i++) {
        const sample = isPlaying ? motion.waveform[i] : 0;
        const coefficient = Math.abs(sample) > Math.abs(smoothWaveform[i]) ? 0.56 : 0.3;
        smoothWaveform[i] += (sample - smoothWaveform[i]) * coefficient;
      }

      // Update frequency bars buffer
      for (let i = 0; i < barCount; i++) {
        const raw = isPlaying ? (motion.bands[Math.min(31, Math.floor((i / barCount) * 32))] || 0) : 0;
        smoothBars[i] += (raw - smoothBars[i]) * (raw > smoothBars[i] ? 0.62 : 0.14);
        if (smoothBars[i] > peakBars[i]) {
          peakBars[i] = smoothBars[i];
        } else {
          peakBars[i] = Math.max(0, peakBars[i] - 0.012);
        }
      }

      // Clear for new frame
      ctx.clearRect(0, 0, W, H);

      // Render according to active visualizer style
      const curStyle = styleRef.current;
      if (curStyle === 'waveform') {
        drawWaveform(fadeOpacity);
      } else if (curStyle === 'circular') {
        drawCircular(fadeOpacity);
      } else if (curStyle === 'minimal') {
        drawMinimal(fadeOpacity);
      } else if (curStyle === 'ambient') {
        drawAmbientWaveform(fadeOpacity);
      } else if (curStyle === 'aurora') {
        drawAurora(fadeOpacity, time);
      } else if (curStyle === 'particles') {
        drawParticles(fadeOpacity, time);
      } else if (curStyle === 'studio') {
        drawStudioSpectrum(fadeOpacity);
      } else {
        drawSpectrumBars(fadeOpacity);
      }

      raf = requestAnimationFrame(render);
    };

    const startLoop = () => {
      if (isLoopRunning || inlinePlayerVisible) return;
      isLoopRunning = true;
      lastTime = performance.now();
      readTheme();
      raf = requestAnimationFrame(render);
    };
    startLoopRef.current = startLoop;

    const stopLoop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      isLoopRunning = false;
    };

    resize();
    readTheme();

    // If currently playing on mount, start immediately
    if (playingRef.current) {
      startLoop();
    }

    const onResize = () => {
      resize();
      readTheme();
    };

    const onVisibility = () => {
      if (document.hidden) {
        stopLoop();
      } else if (motion.playing) {
        startLoop();
      }
    };
    const onAudioActivity = () => {
      playingRef.current = motion.playing;
      if (motion.playing && !document.hidden && !inlinePlayerVisible) startLoopRef.current?.();
    };
    const onInlineVisualizer = (event: Event) => {
      inlinePlayerVisible = Boolean((event as CustomEvent<boolean>).detail);
      if (inlinePlayerVisible) stopLoop();
      else if (motion.playing && !document.hidden) startLoopRef.current?.();
    };

    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('aak-audio-activity', onAudioActivity);
    window.addEventListener('aak-inline-visualizer-state', onInlineVisualizer);
    const playerCanvas = document.querySelector('[data-aak-player-visualizer]');
    if (playerCanvas && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => onInlineVisualizer(new CustomEvent('aak-inline-visualizer-state', { detail: Boolean(entry?.isIntersecting) })), { threshold: .12 });
      observer.observe(playerCanvas);
      return () => {
        observer.disconnect();
        stopLoop();
        startLoopRef.current = null;
        window.removeEventListener('resize', onResize);
        window.visualViewport?.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('aak-audio-activity', onAudioActivity);
        window.removeEventListener('aak-inline-visualizer-state', onInlineVisualizer);
      };
    }

    return () => {
      stopLoop();
      startLoopRef.current = null;
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('aak-audio-activity', onAudioActivity);
      window.removeEventListener('aak-inline-visualizer-state', onInlineVisualizer);
    };
  }, []);

  // When playing state changes: start loop if playing, or let it fade out cleanly
  useEffect(() => {
    // The shared bus can be driven by the player, Beat Lab, or a synth audition.
    playingRef.current = motion.playing;
    if (motion.playing && !document.hidden) startLoopRef.current?.();
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-[var(--visual-viewport-left,0px)] top-[var(--visual-viewport-top,0px)] z-0 h-[var(--visual-viewport-height,100dvh)] w-[var(--visual-viewport-width,100vw)] overflow-hidden"
    >
      {/* Elegant, clean static backdrop (active at all times without CPU overhead) */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 110vw 76vh at 48% 28%, rgb(var(--accent) / calc(var(--field-a) * .38)), transparent 72%),
            radial-gradient(ellipse 78vw 68vh at 7% 74%, rgb(var(--accent2) / calc(var(--field-a) * .22)), transparent 74%),
            radial-gradient(ellipse 88vw 72vh at 94% 66%, rgb(var(--accent) / calc(var(--field-a) * .16)), transparent 76%),
            linear-gradient(180deg, rgb(var(--bg) / .90), rgb(var(--bg) / .97))
          `,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(38rem ellipse at var(--pointer-x, 50vw) var(--pointer-y, 38vh), rgb(var(--accent2) / .035), transparent 74%)',
        }}
      />

      {/* Subtle architectural vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse at center,
              transparent 45%,
              rgb(var(--bg) / 0.2) 80%,
              rgb(var(--bg) / 0.5) 100%
            )
          `,
        }}
      />

      {/* Music-Synchronized Canvas Visualizer (active ONLY when music is playing) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
