import { motion } from '../hooks/motion';

export interface SharedAudioBus {
  context: AudioContext;
  input: GainNode;
  analyser: AnalyserNode;
}

let bus: SharedAudioBus | null = null;
const activityTimers = new Map<string, number>();

export function getAudioBus(): SharedAudioBus | null {
  if (typeof window === 'undefined') return null;
  if (!bus) {
    const AudioContextConstructor = window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    const context = new AudioContextConstructor();
    const input = context.createGain();
    input.gain.value = 0.88;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -9;
    compressor.knee.value = 12;
    compressor.ratio.value = 1.7;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.16;
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    input.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(context.destination);
    bus = { context, input, analyser };
  }
  return bus;
}

export async function resumeAudioBus() {
  const shared = getAudioBus();
  if (!shared) throw new Error('This browser does not support Web Audio.');
  if (shared.context.state === 'suspended') await shared.context.resume();
  if (shared.context.state !== 'running') throw new Error('Audio is paused by the browser. Tap Start again to resume it.');
  return shared;
}

export function setAudioActivity(id: string, active: boolean) {
  const previous = activityTimers.get(id);
  if (typeof previous === 'number' && previous !== -1) window.clearTimeout(previous);
  if (active) activityTimers.set(id, -1);
  else activityTimers.delete(id);
  motion.playing = activityTimers.size > 0;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('aak-audio-activity'));
}

export function markAudioActivity(id: string, durationSeconds: number) {
  const previous = activityTimers.get(id);
  if (typeof previous === 'number' && previous !== -1) window.clearTimeout(previous);
  const timer = window.setTimeout(() => {
    activityTimers.delete(id);
    motion.playing = activityTimers.size > 0;
    window.dispatchEvent(new Event('aak-audio-activity'));
  }, Math.max(100, durationSeconds * 1000));
  activityTimers.set(id, timer);
  motion.playing = true;
  window.dispatchEvent(new Event('aak-audio-activity'));
}
