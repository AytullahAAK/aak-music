import { motion } from './motion';

// Web Audio analysis of the player's <audio>.
let ctx: AudioContext | null = null;
let an: AnalyserNode | null = null;
let buf: Uint8Array<ArrayBuffer> | null = null;
let connectedEl: HTMLAudioElement | null = null;


export function attachAnalyser(el: HTMLAudioElement) {
  if (!el || (connectedEl === el && an)) return;

  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AC) return;

    if (!ctx) {
      ctx = new AC();
    }

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    if (connectedEl !== el) {
      const s = ctx.createMediaElementSource(el);
      an = ctx.createAnalyser();
      an.fftSize = 128;
      an.smoothingTimeConstant = 0.82;

      s.connect(an);
      an.connect(ctx.destination);

      buf = new Uint8Array(an.frequencyBinCount);
      connectedEl = el;
    }
  } catch {
    // If element was already connected by browser or another instance, reuse existing node if available
  }
}

export function sampleAnalyser(): boolean {
  if (!an || !buf || !motion.playing) return false;

  if (ctx && ctx.state === 'suspended') {
    void ctx.resume();
  }

  an.getByteFrequencyData(buf);

  let s = 0;
  let b = 0;

  for (let i = 0; i < 32; i++) {
    const v = (buf[i * 2] + buf[i * 2 + 1]) / 510;
    motion.bands[i] = v;
    s += v;

    if (i < 4) b += v;
  }

  motion.level = s / 32;
  motion.bass = b / 4;

  return true;
}