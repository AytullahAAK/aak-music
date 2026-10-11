import type { LaneId, LoopComposition } from './loopPatterns';
import { GENRES } from './loopPatterns';
import { getAudioBus, resumeAudioBus, setAudioActivity } from './audioBus';

let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
const voices = new Set<AudioScheduledSourceNode>();

export async function prepareLoopAudio() {
  const shared = await resumeAudioBus();
  if (!master || master.context !== shared.context) {
    master = shared.context.createGain();
    master.gain.value = 0.0001;
    master.connect(shared.input);
  }
  return shared.context;
}

function output() {
  const shared = getAudioBus();
  if (!shared || !master) throw new Error('Start the studio audio engine first.');
  return { context: shared.context, master };
}

interface Envelope {
  duration: number;
  release?: number;
  attack?: number;
  sustain?: number;
  peak: number;
}

function makeEnvelope(ctx: AudioContext, when: number, spec: Envelope, target: AudioNode) {
  const gain = ctx.createGain();
  const attack = Math.min(spec.duration * 0.35, spec.attack ?? 0.012);
  const release = spec.release ?? 0.045;
  const sustain = spec.sustain ?? 0.72;
  const sustainLevel = Math.max(0.0001, spec.peak * sustain);
  const attackEnd = when + Math.max(0.004, attack);
  const releaseStart = when + spec.duration;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, spec.peak), attackEnd);
  if (spec.duration > attack + 0.02) {
    gain.gain.exponentialRampToValueAtTime(sustainLevel, Math.min(releaseStart, attackEnd + Math.min(0.16, spec.duration * 0.22)));
    gain.gain.setValueAtTime(sustainLevel, releaseStart);
  }
  gain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + release);
  gain.connect(target);
  return { gain, end: releaseStart + release };
}

function trackSource(source: AudioScheduledSourceNode, end: number, ...nodes: AudioNode[]) {
  voices.add(source);
  source.addEventListener('ended', () => {
    voices.delete(source);
    source.disconnect();
    nodes.forEach((node) => node.disconnect());
  }, { once: true });
  source.stop(end);
}

function ensureNoise(ctx: AudioContext) {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  const length = Math.ceil(ctx.sampleRate * 0.4);
  noise = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noise.getChannelData(0);
  // Slightly softened noise avoids the harsh, full-band hiss of the previous generator.
  let previous = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.12 + white * 0.88;
    data[i] = previous;
  }
  return noise;
}

function noiseHit(ctx: AudioContext, out: GainNode, when: number, duration: number, cutoff: number, peak: number, filterType: BiquadFilterType = 'bandpass') {
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = cutoff;
  filter.Q.value = filterType === 'highpass' ? 0.7 : 0.9;
  source.buffer = ensureNoise(ctx);
  source.connect(filter);
  const env = makeEnvelope(ctx, when, { duration, peak, attack: 0.003, release: Math.min(0.07, duration * 0.35), sustain: 0.18 }, out);
  filter.connect(env.gain);
  source.start(when);
  trackSource(source, env.end + 0.008, filter, env.gain);
}

function tone(
  ctx: AudioContext, out: GainNode, midi: number, when: number, envelope: Envelope,
  wave: OscillatorType, cutoff = 0, glideSemitones = 0,
) {
  const osc = ctx.createOscillator();
  const env = makeEnvelope(ctx, when, envelope, out);
  osc.type = wave;
  const frequency = 440 * Math.pow(2, (midi - 69) / 12);
  osc.frequency.setValueAtTime(frequency * Math.pow(2, glideSemitones / 12), when);
  if (glideSemitones) osc.frequency.exponentialRampToValueAtTime(frequency, when + Math.min(0.085, envelope.duration * 0.55));
  if (cutoff > 0) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.65;
    filter.frequency.setValueAtTime(cutoff, when);
    filter.frequency.exponentialRampToValueAtTime(Math.max(100, cutoff * 0.72), when + envelope.duration + (envelope.release ?? 0.045));
    osc.connect(filter);
    filter.connect(env.gain);
    osc.start(when);
    trackSource(osc, env.end + 0.012, filter, env.gain);
  } else {
    osc.connect(env.gain);
    osc.start(when);
    trackSource(osc, env.end + 0.012, env.gain);
  }
}

function velocity(comp: LoopComposition, lane: LaneId, step: number) {
  // Repeatable small level variation keeps repeated hats and percussion from
  // landing with identical force while preserving the saved seed's identity.
  let hash = (comp.seed * 31 + step * 17 + lane.length * 13) | 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  const unit = ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
  return 0.88 + unit * 0.12;
}

function playLane(comp: LoopComposition, id: LaneId, pitches: number[], when: number, step: number) {
  const { context: ctx, master: out } = output();
  const genreType = GENRES.find((genre) => genre.id === comp.genre)?.type ?? 'four';
  const strength = velocity(comp, id, step);
  const stepDuration = 60 / comp.bpm / 4;
  if ((id === 'bass' || id === 'melody') && step % 4 === 2) {
    const groove = genreType === 'latin' ? 0.12 : genreType === 'afro' ? 0.1 : genreType === 'half' ? 0.08 : 0.045;
    when += Math.min(0.014, stepDuration * groove);
  }

  if (id === 'kick') {
    const osc = ctx.createOscillator();
    const env = makeEnvelope(ctx, when, { duration: 0.31, release: 0.055, peak: 0.62 * strength, attack: 0.004, sustain: 0.12 }, out);
    osc.type = 'sine';
    const startHz = genreType === 'half' ? 128 : genreType === 'latin' ? 118 : 142;
    osc.frequency.setValueAtTime(startHz, when);
    osc.frequency.exponentialRampToValueAtTime(45, when + 0.075);
    osc.frequency.exponentialRampToValueAtTime(34, when + 0.28);
    osc.connect(env.gain);
    osc.start(when);
    trackSource(osc, env.end + 0.008, env.gain);
    // Quiet, very short filtered click restores the front edge without a loud click.
    noiseHit(ctx, out, when, 0.012, 2600, 0.065 * strength, 'highpass');
    return;
  }
  if (id === 'snare') {
    const body = genreType === 'half' ? 185 : 205;
    tone(ctx, out, 69 + 12 * Math.log2(body / 440), when,
      { duration: 0.105, release: 0.06, peak: 0.105 * strength, attack: 0.003, sustain: 0.17 }, 'triangle', 1400);
    noiseHit(ctx, out, when, 0.13, genreType === 'latin' ? 2300 : 1900, 0.17 * strength, 'bandpass');
    return;
  }
  if (id === 'hats') {
    const offbeat = step % 4 === 2;
    const swing = genreType === 'latin' ? 0.13 : genreType === 'afro' ? 0.10 : genreType === 'half' ? 0.08 : 0.035;
    const offset = offbeat ? Math.min(0.016, stepDuration * swing) : 0;
    const open = step % 4 === 2 && genreType === 'four' && strength > 0.96;
    noiseHit(ctx, out, when + offset, open ? 0.17 : 0.045, genreType === 'ambient' ? 5600 : 7600, (open ? 0.055 : 0.075) * strength, 'highpass');
    return;
  }
  if (id === 'percussion') {
    const duration = genreType === 'latin' || genreType === 'afro' ? 0.095 : 0.075;
    const pitch = genreType === 'latin' ? 55 : genreType === 'afro' ? 50 : 53;
    const note = 69 + 12 * Math.log2((pitch * 2) / 440);
    tone(ctx, out, Math.round(note), when + (step % 4 === 2 ? Math.min(0.014, stepDuration * 0.1) : 0),
      { duration, release: 0.045, peak: 0.105 * strength, attack: 0.004, sustain: 0.14 }, 'triangle', genreType === 'latin' ? 1150 : 1750);
    return;
  }

  const notes = pitches.length ? pitches : [id === 'bass' ? 36 : 60];
  if (id === 'bass') {
    const subStyle = genreType === 'half';
    const duration = Math.min(stepDuration * (subStyle ? 1.65 : 1.25), subStyle ? 0.42 : 0.3);
    tone(ctx, out, notes[0], when,
      { duration, release: subStyle ? 0.09 : 0.055, peak: subStyle ? 0.20 : 0.17, attack: 0.008, sustain: 0.65 },
      subStyle ? 'sine' : genreType === 'latin' ? 'square' : 'triangle', subStyle ? 0 : 700, subStyle ? 7 : 0);
  } else if (id === 'chords') {
    const bar = 240 / comp.bpm;
    const ambient = genreType === 'ambient';
    const sustain = bar * (ambient ? 0.96 : 0.88);
    const release = ambient ? Math.min(0.6, bar * 0.17) : Math.min(0.32, bar * 0.1);
    const peak = (ambient ? 0.13 : genreType === 'four' ? 0.115 : 0.105) / Math.sqrt(notes.length);
    const softChord = ambient || genreType === 'afro' || comp.genre === 'house-tech-house';
    const waveform: OscillatorType = softChord ? 'triangle' : 'sawtooth';
    const cutoff = ambient ? 1750 : comp.genre === 'trance' ? 2450 : comp.genre === 'techno' ? 1680 : comp.genre === 'melodic-techno' ? 1950 : genreType === 'half' ? 1850 : 2180;
    for (const note of notes) {
      tone(ctx, out, note, when,
        { duration: sustain, release, peak, attack: ambient ? 0.14 : 0.045, sustain: 0.7 }, waveform, cutoff);
    }
  } else {
    const ambient = genreType === 'ambient';
    const duration = ambient ? Math.min(stepDuration * 2, 0.48) : Math.min(stepDuration * 0.82, 0.19);
    tone(ctx, out, notes[0], when,
      { duration, release: ambient ? 0.24 : 0.075, peak: 0.095, attack: ambient ? 0.055 : 0.012, sustain: 0.66 },
      genreType === 'half' ? 'sine' : 'triangle', genreType === 'half' ? 0 : 2600);
  }
}

export function scheduleLoopStep(composition: LoopComposition, step: number, when: number) {
  for (const lane of ['kick', 'snare', 'hats', 'percussion', 'bass', 'chords', 'melody'] as LaneId[]) {
    const pattern = composition.tracks[lane];
    if (!pattern.steps[step] || pattern.muted || (composition.solo && composition.solo !== lane)) continue;
    playLane(composition, lane, pattern.notes[step] ?? [], when, step);
  }
}

export function fadeLoopAudio(out: boolean) {
  const shared = getAudioBus();
  if (!shared || !master) return;
  const now = shared.context.currentTime;
  const param = master.gain;
  param.cancelScheduledValues(now);
  param.setValueAtTime(Math.max(0.0001, param.value), now);
  param.exponentialRampToValueAtTime(out ? 0.0001 : 0.78, now + 0.035);
  setAudioActivity('loop-studio', !out);

  if (out) {
    // The short output fade removes scheduled look-ahead hits cleanly; stop the
    // oscillators too, so a rapid restart cannot reveal stale voices.
    for (const voice of voices) {
      try { voice.stop(now + 0.04); } catch { /* already stopped */ }
    }
  }
}
