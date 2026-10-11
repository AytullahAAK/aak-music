// Native Web Audio Synthesis Engine for interactive chord exploration and sample library auditioning.
// Uses 0 external libraries, pure browser Web Audio API with zero latency.
import { claimPlayback, getAudioBus, markAudioActivity } from './audioBus';

function getContext(): AudioContext | null {
  const bus = getAudioBus();
  if (!bus) return null;
  claimPlayback('generated-preview');
  if (bus?.context.state === 'suspended') void bus.context.resume();
  return bus?.context ?? null;
}

// Map note name like "C3", "Eb4", "F#2" to frequency in Hz
export function noteToFreq(note: string): number {
  const NOTES: Record<string, number> = {
    C: 0, 'C#': 1, Db: 1,
    D: 2, 'D#': 3, Eb: 3,
    E: 4,
    F: 5, 'F#': 6, Gb: 6,
    G: 7, 'G#': 8, Ab: 8,
    A: 9, 'A#': 10, Bb: 10,
    B: 11,
  };

  const match = note.match(/^([A-G][b#]?)(-?\d+)$/);
  if (!match) return 440;

  const key = match[1];
  const octave = parseInt(match[2], 10);
  const semitonesFromA4 = (octave - 4) * 12 + (NOTES[key] - 9);
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}

// 1. Play Polyphonic Synthesizer Chord / Notes (Used in Music Theory Section)
export function playSynthChord(notes: string[], duration = 1.4) {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  const release = Math.min(0.55, Math.max(0.22, duration * 0.2));
  const noteLevel = 0.22 / Math.max(1, Math.sqrt(notes.length));
  masterGain.gain.setValueAtTime(noteLevel, now);
  masterGain.connect(getAudioBus()?.input ?? ctx.destination);

  // Filter
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2800, now);
  filter.frequency.exponentialRampToValueAtTime(1900, now + duration);
  filter.Q.value = 0.75;
  filter.connect(masterGain);

  notes.forEach((n, idx) => {
    const freq = noteToFreq(n);
    if (!freq) return;

    // A restrained two-oscillator voice adds body without the pronounced
    // beating and resonant filter that made the old chords sound buzzy.
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const noteGain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, now);
    osc1.detune.setValueAtTime(-6, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq, now);
    osc2.detune.setValueAtTime(+6, now);

    // Micro-delay per note for natural acoustic strum feel
    const noteStart = now + idx * 0.006;

    // ADSR Envelope
    const releaseStart = Math.max(noteStart + 0.1, noteStart + duration - release);
    noteGain.gain.setValueAtTime(0.0001, noteStart);
    noteGain.gain.linearRampToValueAtTime(0.72, noteStart + 0.055); // soft attack
    noteGain.gain.exponentialRampToValueAtTime(0.52, noteStart + 0.3); // decay
    noteGain.gain.setValueAtTime(0.52, releaseStart); // held sustain
    noteGain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + release); // natural release

    osc1.connect(noteGain);
    osc2.connect(noteGain);
    noteGain.connect(filter);

    osc1.start(noteStart);
    osc2.start(noteStart);
    osc1.stop(releaseStart + release + 0.04);
    osc2.stop(releaseStart + release + 0.04);
  });
  markAudioActivity('generated-preview', duration + release + 0.08);
}

// 2. Play Individual Note
export function playSynthNote(note: string, duration = 0.8) {
  playSynthChord([note], duration);
}

// 3. EDM Sample Library Audition Synthesizers
export const sampleSynth = {
  // Kick drum (Sub bass pitch envelope + transient click)
  kick() {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.35);

    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(getAudioBus()?.input ?? ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
    markAudioActivity('generated-preview', 0.52);
  },

  // Snare drum (Pitched body + white noise burst)
  snare() {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Tone body
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.1);
    oscGain.gain.setValueAtTime(0.7, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(oscGain);
    oscGain.connect(getAudioBus()?.input ?? ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    // Noise snap
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1200;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(getAudioBus()?.input ?? ctx.destination);
    noise.start(now);
    noise.stop(now + 0.26);
    markAudioActivity('generated-preview', 0.3);
  },

  // Hi-Hat (Metallic filtered frequency burst)
  hihat(open = false) {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dur = open ? 0.38 : 0.07;

    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 8800;
    filter.Q.value = 3.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(getAudioBus()?.input ?? ctx.destination);
    noise.start(now);
    noise.stop(now + dur + 0.02);
    markAudioActivity('generated-preview', dur + 0.03);
  },

  // Clap (Triple micro-transient impulse)
  clap() {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 2.0;

    const gain = ctx.createGain();
    gain.connect(getAudioBus()?.input ?? ctx.destination);
    filter.connect(gain);

    // Initial 3 flam pulses
    [0, 0.012, 0.025].forEach((offset) => {
      gain.gain.setValueAtTime(0.5, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.08, now + offset + 0.008);
    });

    // Main body decay
    gain.gain.setValueAtTime(0.8, now + 0.038);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.connect(filter);
    noise.start(now);
    noise.stop(now + 0.3);
    markAudioActivity('generated-preview', 0.32);
  },

  // 808 Sub Bass
  bass808(note = 'C2') {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freq = noteToFreq(note);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.06);

    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    osc.connect(gain);
    gain.connect(getAudioBus()?.input ?? ctx.destination);
    osc.start(now);
    osc.stop(now + 0.9);
    markAudioActivity('generated-preview', 0.92);
  },

  // Original dual-saw Reese bass audition.
  reese(note = 'F2') {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freq = noteToFreq(note);
    const filter = ctx.createBiquadFilter();
    const master = ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, now);
    filter.frequency.exponentialRampToValueAtTime(260, now + 0.8);
    master.gain.setValueAtTime(0.2, now);
    master.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    filter.connect(master);
    master.connect(getAudioBus()?.input ?? ctx.destination);
    for (const detune of [-9, 9]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(detune, now);
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + 0.9);
    }
    markAudioActivity('generated-preview', 0.92);
  },

  // Synth Lead Stab
  synthLead(note = 'C4') {
    playSynthChord([note], 0.7);
  },

  // Chord Stab
  chordStab(notes = ['C3', 'Eb3', 'G3', 'Bb3']) {
    playSynthChord(notes, 0.9);
  },

  // Atmospheric Pad
  pad(notes = ['C3', 'G3', 'Eb4', 'Bb4']) {
    playSynthChord(notes, 2.2);
  },

  // Noise Riser / Transition
  riser() {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 1.8;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(9500, now + 1.6);
    filter.Q.value = 6.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.8, now + 1.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(getAudioBus()?.input ?? ctx.destination);

    noise.start(now);
    noise.stop(now + 1.85);
    markAudioActivity('generated-preview', 1.9);
  },
};

