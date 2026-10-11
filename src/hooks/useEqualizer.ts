import { useSyncExternalStore } from 'react';
import { setEqualizerBands } from '../utils/audioBus';

export const EQUALIZER_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0],
  'Bass Boost': [5, 4, 2, 0, -1, 0],
  Balanced: [2, 1, 0, 1, 1, 2],
  Vocal: [-2, -1, 1, 3, 2, 0],
  Treble: [-2, -1, 0, 1, 4, 5],
};

interface EqualizerState { preset: string; values: number[] }
let state: EqualizerState = { preset: 'Flat', values: EQUALIZER_PRESETS.Flat };
const subscribers = new Set<() => void>();
const subscribe = (listener: () => void) => { subscribers.add(listener); return () => subscribers.delete(listener); };
const getSnapshot = () => state;
function update(preset: string, values: number[]) {
  state = { preset, values };
  setEqualizerBands(values);
  subscribers.forEach((listener) => listener());
}

export function applyEqualizerPreset(preset: string) {
  const values = EQUALIZER_PRESETS[preset];
  if (values) update(preset, [...values]);
}

export function setEqualizerBand(index: number, value: number) {
  const values = state.values.map((current, band) => band === index ? Math.max(-9, Math.min(9, value)) : current);
  update('Custom', values);
}

export function useEqualizer() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
