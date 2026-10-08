import { useEffect, useRef } from 'react';
import { motion, fine, reduced } from '../hooks/motion';
import { sampleAnalyser } from '../hooks/analyser';

const tok = (v: string) =>
  getComputedStyle(document.documentElement)
    .getPropertyValue(v)
    .trim();

export default function AudioVisualizerBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let frame = 0;

    let level = 0;
    let bass = 0;
    let smoothBass = 0;
    let pulse = 0;
    let mouseX = 0.5;
    let mouseY = 0.5;

    let accent = '134 88 255';
    let accent2 = '95 212 255';
    let vizAlpha = 0.5;

    const startTime = performance.now();

    const desktopBars = 72;
    const mobileBars = 36;

    let bars = new Float32Array(desktopBars);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      W = window.innerWidth;
      H = window.innerHeight;

      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);

      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = W < 700 ? mobileBars : desktopBars;

      if (bars.length !== count) {
        bars = new Float32Array(count);
      }
    };

    const readTheme = () => {
      accent = tok('--accent') || '134 88 255';
      accent2 = tok('--accent2') || '95 212 255';

      const parsed = parseFloat(tok('--viz-a'));
      vizAlpha = Number.isFinite(parsed) ? parsed : 0.5;
    };

    const lerp = (a: number, b: number, amount: number) =>
      a + (b - a) * amount;

    const drawBackground = (
      time: number,
      intensity: number,
      bassAmount: number
    ) => {
      const centerX = W * (0.5 + (mouseX - 0.5) * 0.035);
      const centerY = H * (0.5 + (mouseY - 0.5) * 0.035);

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        Math.max(W, H) * 0.72
      );

      gradient.addColorStop(
        0,
        `rgb(${accent} / ${0.10 + intensity * 0.12 + bassAmount * 0.12})`
      );

      gradient.addColorStop(
        0.35,
        `rgb(${accent} / ${0.055 + bassAmount * 0.07})`
      );

      gradient.addColorStop(
        0.72,
        `rgb(${accent2} / ${0.025 + intensity * 0.025})`
      );

      gradient.addColorStop(1, 'rgb(0 0 0 / 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      // Slow cinematic light movement
      const lightX =
        W * (0.5 + Math.sin(time * 0.13) * 0.32);

      const lightY =
        H * (0.48 + Math.cos(time * 0.17) * 0.25);

      const movingGlow = ctx.createRadialGradient(
        lightX,
        lightY,
        0,
        lightX,
        lightY,
        Math.max(W, H) * 0.38
      );

      movingGlow.addColorStop(
        0,
        `rgb(${accent2} / ${0.025 + bassAmount * 0.055})`
      );

      movingGlow.addColorStop(
        1,
        `rgb(${accent2} / 0)`
      );

      ctx.fillStyle = movingGlow;
      ctx.fillRect(0, 0, W, H);
    };

    const drawParticles = (
      time: number,
      intensity: number,
      bassAmount: number
    ) => {
      const count = W < 700 ? 22 : 42;

      for (let i = 0; i < count; i++) {
        const seed = i * 17.371;

        const baseX =
          (Math.sin(seed * 2.17) * 0.5 + 0.5) * W;

        const baseY =
          (Math.cos(seed * 1.73) * 0.5 + 0.5) * H;

        const driftX =
          Math.sin(time * (0.08 + (i % 5) * 0.012) + seed) *
          24;

        const driftY =
          Math.cos(time * (0.07 + (i % 4) * 0.014) + seed) *
          20;

        const x = baseX + driftX;
        const y = baseY + driftY;

        const size =
          0.7 +
          (Math.sin(seed) * 0.5 + 0.5) * 1.4 +
          bassAmount * 1.8;

        const alpha =
          0.08 +
          intensity * 0.12 +
          bassAmount * 0.16;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);

        ctx.fillStyle =
          i % 2 === 0
            ? `rgb(${accent} / ${alpha})`
            : `rgb(${accent2} / ${alpha * 0.8})`;

        ctx.fill();
      }
    };

    const drawSpectrum = (
      analyserLive: boolean,
      intensity: number,
      bassAmount: number,
      scrollIntensity: number
    ) => {
      const count = bars.length;
      const center = W / 2;

      const maxHeight =
        Math.min(H * 0.28, 240) *
        (0.55 + scrollIntensity * 0.45);

      const spacing = Math.min(W / count, 18);
      const totalWidth = spacing * count;
      const startX = center - totalWidth / 2;

      for (let i = 0; i < count; i++) {
        let target = 0;

        if (analyserLive) {
          const sourceIndex = Math.floor(
            (i / count) * 32
          );

          target =
            motion.bands[sourceIndex] || 0;
        } else {
          const wave =
            Math.sin(i * 0.32 + performance.now() * 0.001) *
            0.5 +
            0.5;

          target = 0.12 + wave * 0.08;
        }

        // Make low frequencies stronger
        const lowBoost =
          1 +
          Math.max(0, 1 - i / count) *
            bassAmount *
            2.2;

        target *= lowBoost;

        bars[i] = lerp(
          bars[i],
          Math.min(1, target),
          analyserLive ? 0.18 : 0.035
        );

        const value = bars[i];

        const barHeight =
          Math.max(2, value * maxHeight);

        const x = startX + i * spacing;

        const y =
          H * 0.69 - barHeight;

        const alpha =
          0.12 +
          value * 0.42 +
          intensity * 0.08;

        const gradient = ctx.createLinearGradient(
          0,
          y,
          0,
          H * 0.69
        );

        gradient.addColorStop(
          0,
          `rgb(${accent2} / ${alpha})`
        );

        gradient.addColorStop(
          0.5,
          `rgb(${accent} / ${alpha * 0.72})`
        );

        gradient.addColorStop(
          1,
          `rgb(${accent} / 0)`
        );

        ctx.fillStyle = gradient;

        const width = Math.max(
          2,
          spacing * 0.48
        );

        ctx.fillRect(
          x - width / 2,
          y,
          width,
          barHeight
        );

        // Small glowing cap
        if (value > 0.08) {
          ctx.fillStyle =
            `rgb(${accent2} / ${Math.min(
              0.75,
              alpha + 0.15
            )})`;

          ctx.fillRect(
            x - width / 2,
            y - 1,
            width,
            1.5
          );
        }
      }
    };

    const drawWaveform = (
      time: number,
      analyserLive: boolean,
      intensity: number,
      bassAmount: number
    ) => {
      const centerY = H * 0.51;

      ctx.beginPath();

      const step = W < 700 ? 8 : 6;

      for (let x = 0; x <= W; x += step) {
        const normalized = x / W;

        let wave = 0;

        if (analyserLive) {
          const bandIndex = Math.floor(
            normalized * 31
          );

          const band =
            motion.bands[bandIndex] || 0;

          wave =
            Math.sin(
              normalized * Math.PI * 12 +
                time * 1.8
            ) *
            (8 + band * 22);

          wave +=
            Math.sin(
              normalized * Math.PI * 26 -
                time * 2.4
            ) *
            band *
            8;
        } else {
          wave =
            Math.sin(
              normalized * Math.PI * 8 +
                time * 0.8
            ) *
            5;
        }

        const envelope =
          Math.sin(normalized * Math.PI) *
          (1 + bassAmount * 1.5);

        const y =
          centerY +
          wave *
            envelope *
            (0.5 + intensity);

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.shadowBlur = 16;
      ctx.shadowColor =
        `rgb(${accent2} / ${0.35 + intensity * 0.25})`;

      ctx.strokeStyle =
        `rgb(${accent2} / ${0.18 + intensity * 0.3})`;

      ctx.lineWidth = W < 700 ? 1.2 : 1.6;

      ctx.stroke();

      ctx.shadowBlur = 0;

      // Secondary waveform
      ctx.beginPath();

      for (let x = 0; x <= W; x += step) {
        const normalized = x / W;

        const wave =
          Math.sin(
            normalized * Math.PI * 9 -
              time * 1.1
          ) *
          Math.sin(normalized * Math.PI) *
          (4 + intensity * 10);

        const y = centerY + 13 + wave;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle =
        `rgb(${accent} / ${0.08 + intensity * 0.16})`;

      ctx.lineWidth = 1;

      ctx.stroke();
    };

    const drawCenterVisualizer = (
      time: number,
      intensity: number,
      bassAmount: number
    ) => {
      const cx = W / 2;
      const cy = H * 0.51;

      const baseRadius =
        Math.min(W, H) *
        (W < 700 ? 0.105 : 0.115);

      const radius =
        baseRadius *
        (1 + bassAmount * 0.28);

      // Outer atmospheric glow
      const glowRadius =
        radius *
        (2.4 + bassAmount * 1.2);

      const glow = ctx.createRadialGradient(
        cx,
        cy,
        radius * 0.2,
        cx,
        cy,
        glowRadius
      );

      glow.addColorStop(
        0,
        `rgb(${accent} / ${0.11 + bassAmount * 0.16})`
      );

      glow.addColorStop(
        0.35,
        `rgb(${accent2} / ${0.055 + bassAmount * 0.08})`
      );

      glow.addColorStop(
        1,
        `rgb(${accent2} / 0)`
      );

      ctx.fillStyle = glow;

      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        glowRadius,
        0,
        Math.PI * 2
      );

      ctx.fill();

      // Main ring
      ctx.beginPath();

      ctx.arc(
        cx,
        cy,
        radius,
        0,
        Math.PI * 2
      );

      ctx.shadowBlur =
        18 + bassAmount * 28;

      ctx.shadowColor =
        `rgb(${accent2} / ${0.45 + bassAmount * 0.35})`;

      ctx.strokeStyle =
        `rgb(${accent2} / ${0.28 + intensity * 0.35})`;

      ctx.lineWidth =
        1.4 + bassAmount * 2.5;

      ctx.stroke();

      ctx.shadowBlur = 0;

      // Rotating broken ring
      ctx.save();

      ctx.translate(cx, cy);
      ctx.rotate(time * 0.12);

      ctx.beginPath();

      const segments = 48;

      for (let i = 0; i < segments; i++) {
        const angle =
          (Math.PI * 2 * i) / segments;

        const band =
          motion.bands[
            Math.floor(
              (i / segments) * 32
            )
          ] || 0;

        const r =
          radius +
          7 +
          band * 13 +
          bassAmount * 7;

        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle =
        `rgb(${accent} / ${0.16 + intensity * 0.22})`;

      ctx.lineWidth = 1;

      ctx.stroke();

      ctx.restore();

      // Inner core
      const core = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        radius
      );

      core.addColorStop(
        0,
        `rgb(${accent2} / ${0.16 + bassAmount * 0.18})`
      );

      core.addColorStop(
        0.35,
        `rgb(${accent} / ${0.08 + intensity * 0.12})`
      );

      core.addColorStop(
        1,
        `rgb(${accent} / 0)`
      );

      ctx.fillStyle = core;

      ctx.beginPath();

      ctx.arc(
        cx,
        cy,
        radius,
        0,
        Math.PI * 2
      );

      ctx.fill();
    };

    const drawShockwave = (
      intensity: number,
      bassAmount: number
    ) => {
      if (bassAmount < 0.42) return;

      const cx = W / 2;
      const cy = H * 0.51;

      const waveSize =
        Math.min(W, H) *
        (0.14 + bassAmount * 0.22);

      ctx.beginPath();

      ctx.arc(
        cx,
        cy,
        waveSize,
        0,
        Math.PI * 2
      );

      ctx.strokeStyle =
        `rgb(${accent2} / ${
          Math.min(0.28, bassAmount * 0.3)
        })`;

      ctx.lineWidth = 1.2;

      ctx.stroke();
    };

    const draw = (now: number) => {
      const time =
        (now - startTime) / 1000;

      const analyserLive = sampleAnalyser();

      const scroll =
        window.scrollY /
        Math.max(
          1,
          document.documentElement.scrollHeight -
            window.innerHeight
        );

      const scrollIntensity =
        0.25 +
        0.75 *
          Math.pow(
            Math.max(0, 1 - scroll),
            1.25
          );

      const targetLevel = analyserLive
        ? motion.level
        : 0.16 +
          Math.sin(time * 0.65) * 0.035;

      const targetBass = analyserLive
        ? motion.bass
        : 0.12 +
          Math.sin(time * 0.9) * 0.035;

      level = lerp(
        level,
        Math.max(0, targetLevel),
        0.09
      );

      smoothBass = lerp(
        smoothBass,
        Math.max(0, targetBass),
        0.13
      );

      bass = Math.max(
        0,
        smoothBass
      );

      // Stronger reaction to actual kick
      pulse = lerp(
        pulse,
        bass > 0.55 ? bass : 0,
        0.2
      );

      const intensity =
        Math.min(
          1,
          level * 1.45
        ) *
        scrollIntensity *
        vizAlpha;

      ctx.clearRect(0, 0, W, H);

      drawBackground(
        time,
        intensity,
        bass
      );

      drawParticles(
        time,
        intensity,
        bass
      );

      drawSpectrum(
        analyserLive,
        intensity,
        bass,
        scrollIntensity
      );

      drawWaveform(
        time,
        analyserLive,
        intensity,
        bass
      );

      drawCenterVisualizer(
        time,
        intensity,
        bass
      );

      drawShockwave(
        intensity,
        pulse
      );

      frame++;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);

      // Mobile / low-power mode
      if (
        !fine &&
        now - last < 40
      ) {
        return;
      }

      last = now;
      draw(now);
    };

    const start = () => {
      cancelAnimationFrame(raf);

      if (document.hidden) return;

      readTheme();

      if (reduced) {
        draw(performance.now());
        return;
      }

      raf =
        requestAnimationFrame(loop);
    };

    const handleMouse = (
      event: MouseEvent
    ) => {
      if (W < 700) return;

      mouseX =
        event.clientX / W;

      mouseY =
        event.clientY / H;
    };

    resize();
    start();

    window.addEventListener(
      'resize',
      resize
    );

    window.addEventListener(
      'mousemove',
      handleMouse,
      { passive: true }
    );

    document.addEventListener(
      'visibilitychange',
      start
    );

    return () => {
      cancelAnimationFrame(raf);

      window.removeEventListener(
        'resize',
        resize
      );

      window.removeEventListener(
        'mousemove',
        handleMouse
      );

      document.removeEventListener(
        'visibilitychange',
        start
      );
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Cinematic base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            `
            radial-gradient(
              80% 60% at 50% 42%,
              rgb(var(--accent) / calc(var(--field-a) * 0.72)),
              transparent 62%
            ),
            radial-gradient(
              60% 50% at 0% 0%,
              rgb(var(--accent) / calc(var(--field-a) * 0.7)),
              transparent 65%
            ),
            radial-gradient(
              55% 45% at 100% 65%,
              rgb(var(--accent2) / calc(var(--field-a) * 0.45)),
              transparent 68%
            ),
            linear-gradient(
              180deg,
              rgb(var(--bg) / .92),
              rgb(var(--bg) / .98)
            )
            `,
        }}
      />

      {/* Soft vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            `
            radial-gradient(
              ellipse at center,
              transparent 28%,
              rgb(var(--bg) / .10) 68%,
              rgb(var(--bg) / .28) 100%
            )
            `,
        }}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}