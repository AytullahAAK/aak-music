import { motion } from './motion';
import { getAudioBus } from '../utils/audioBus';

// One graph for the player's single reusable <audio> element. MediaElementAudioSourceNode
// may only be created once for an element, so this module owns it for the app lifetime.
let analyser: AnalyserNode | null = null;
const mediaSources = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
let resumePending = false;
let frequencyData: Float32Array<ArrayBuffer> | null = null;
let waveformData: Uint8Array<ArrayBuffer> | null = null;
const previousBands = new Float32Array(32);
let previousBass = 0;
let previousRms = 0;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function resumeAnalyser() {
  const ctx = getAudioBus()?.context;
  if (ctx?.state === 'suspended' && !resumePending) {
    resumePending = true;
    void ctx.resume().catch(() => {}).finally(() => { resumePending = false; });
  }
}

export function attachAnalyser(el: HTMLAudioElement) {
  if (!el) return;
  const shared = getAudioBus();
  if (!shared) return;
  analyser = shared.analyser;
  const existing = mediaSources.get(el);
  if (existing) {
    resumeAnalyser();
    return;
  }

  try {
    // MediaElementAudioSourceNode is created once per element and joins the same
    // mix bus used by the Loop Studio and generated instrument previews.
    const source = shared.context.createMediaElementSource(el);
    source.connect(shared.input);
    mediaSources.set(el, source);
    frequencyData = new Float32Array(analyser.frequencyBinCount);
    waveformData = new Uint8Array(analyser.fftSize);
    resumeAnalyser();
  } catch {
    // Browsers that have already claimed this media element must not break playback.
  }
}

function getBandLevel(lowHz: number, highHz: number, sampleRate: number) {
  if (!analyser || !frequencyData) return 0;
  const hzPerBin = sampleRate / analyser.fftSize;
  const first = Math.max(1, Math.floor(lowHz / hzPerBin)); // omit the DC bin
  const last = Math.min(frequencyData.length - 1, Math.max(first + 1, Math.ceil(highHz / hzPerBin)));
  let energy = 0;
  let count = 0;
  for (let bin = first; bin <= last; bin++) {
    const db = frequencyData[bin];
    if (Number.isFinite(db) && db > -120) {
      const amplitude = Math.pow(10, db / 20);
      energy += amplitude * amplitude;
      count++;
    }
  }
  if (!count) return 0;
  const rms = Math.sqrt(energy / count);
  // Broad, fixed floor/ceiling makes the display useful across mastered and quiet audio.
  const db = 20 * Math.log10(Math.max(1e-6, rms));
  return clamp01((db + 62) / 48);
}

export function sampleAnalyser(): boolean {
  const shared = getAudioBus();
  if (!shared) return false;
  analyser = shared.analyser;
  if (!frequencyData || frequencyData.length !== analyser.frequencyBinCount) {
    frequencyData = new Float32Array(analyser.frequencyBinCount);
    waveformData = new Uint8Array(analyser.fftSize);
  }
  if (!waveformData || !motion.playing) return false;
  resumeAnalyser();
  const ctx = shared.context;
  if (ctx?.state !== 'running') return false;

  analyser.getFloatFrequencyData(frequencyData);
  analyser.getByteTimeDomainData(waveformData);

  const sampleRate = ctx.sampleRate;
  const lowHz = 32;
  const topHz = Math.min(16000, sampleRate / 2);
  let sum = 0;
  for (let band = 0; band < motion.bands.length; band++) {
    // Log spacing gives bass and treble useful resolution at any device sample rate.
    const low = lowHz * Math.pow(topHz / lowHz, band / motion.bands.length);
    const high = lowHz * Math.pow(topHz / lowHz, (band + 1) / motion.bands.length);
    const raw = getBandLevel(low, high, sampleRate);
    const smoothed = raw > previousBands[band]
      ? previousBands[band] + (raw - previousBands[band]) * 0.68
      : previousBands[band] + (raw - previousBands[band]) * 0.16;
    previousBands[band] = smoothed;
    motion.bands[band] = smoothed;
    sum += smoothed;
  }

  let waveformEnergy = 0;
  for (let i = 0; i < waveformData.length; i++) {
    const sample = (waveformData[i] - 128) / 128;
    waveformEnergy += sample * sample;
  }
  const rms = Math.sqrt(waveformEnergy / waveformData.length);
  const normalizedRms = clamp01((20 * Math.log10(Math.max(rms, 1e-5)) + 62) / 48);
  const bass = getBandLevel(38, 180, sampleRate);
  const bassRise = Math.max(0, bass - previousBass);
  const levelRise = Math.max(0, normalizedRms - previousRms);
  motion.transient = clamp01(Math.max(bassRise * 3.1, levelRise * 2.4));
  motion.kick = clamp01(bass * 0.78 + motion.transient * 0.75);
  motion.bass = bass;
  motion.level = clamp01(sum / motion.bands.length * 1.7 + normalizedRms * 0.2);
  const sampleStride = waveformData.length / motion.waveform.length;
  for (let point = 0; point < motion.waveform.length; point++) {
    const sampleIndex = Math.floor(point * sampleStride);
    motion.waveform[point] = (waveformData[sampleIndex] - 128) / 128;
  }

  previousBass = bass;
  previousRms = normalizedRms;
  return true;
}
