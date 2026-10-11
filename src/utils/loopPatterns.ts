export type LaneId = 'kick' | 'snare' | 'hats' | 'percussion' | 'bass' | 'chords' | 'melody';
export type ScaleName = 'minor' | 'major' | 'dorian' | 'phrygian' | 'minor pentatonic';

export interface LanePattern {
  steps: boolean[];
  notes: (number[] | null)[];
  muted: boolean;
}

export interface LoopComposition {
  bpm: number;
  key: string;
  scale: ScaleName;
  genre: string;
  bars: number;
  density: number;
  seed: number;
  mood: 'neutral' | 'dark' | 'bright' | 'energetic' | 'atmospheric';
  buildUp: boolean;
  solo: LaneId | null;
  progression: number[];
  tracks: Record<LaneId, LanePattern>;
}

export const LANES: { id: LaneId; label: string; kind: 'drum' | 'tonal'; short: string }[] = [
  { id: 'kick', label: 'Kick', kind: 'drum', short: 'KCK' },
  { id: 'snare', label: 'Snare / clap', kind: 'drum', short: 'SNR' },
  { id: 'hats', label: 'Hi-hats', kind: 'drum', short: 'HAT' },
  { id: 'percussion', label: 'Percussion', kind: 'drum', short: 'PRC' },
  { id: 'bass', label: 'Bass', kind: 'tonal', short: 'BAS' },
  { id: 'chords', label: 'Chords', kind: 'tonal', short: 'CHD' },
  { id: 'melody', label: 'Melody', kind: 'tonal', short: 'MEL' },
];

export const GENRES = [
  { id: 'electronic-edm', label: 'Electronic / EDM', bpm: 126, type: 'four' },
  { id: 'house-tech-house', label: 'House / Tech House', bpm: 124, type: 'four' },
  { id: 'melodic-techno', label: 'Melodic Techno / Progressive', bpm: 126, type: 'four' },
  { id: 'techno', label: 'Techno', bpm: 132, type: 'four' },
  { id: 'trance', label: 'Trance', bpm: 138, type: 'four' },
  { id: 'trap', label: 'Trap', bpm: 140, type: 'half' },
  { id: 'hip-hop', label: 'Hip-hop', bpm: 92, type: 'half' },
  { id: 'drill', label: 'Drill', bpm: 142, type: 'half' },
  { id: 'afro-house', label: 'Afro House', bpm: 118, type: 'afro' },
  { id: 'latin-guaracha', label: 'Latin / Guaracha', bpm: 100, type: 'latin' },
  { id: 'ambient-cinematic', label: 'Ambient / Cinematic', bpm: 76, type: 'ambient' },
  { id: 'experimental', label: 'Experimental / Other', bpm: 110, type: 'experimental' },
] as const;

export const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const SCALES: ScaleName[] = ['minor', 'major', 'dorian', 'phrygian', 'minor pentatonic'];
const PITCH_CLASS: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const SCALE_INTERVALS: Record<ScaleName, number[]> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  'minor pentatonic': [0, 3, 5, 7, 10],
};

const seededRandom = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const makeLane = (count: number, source?: LanePattern): LanePattern => ({
  steps: Array.from({ length: count }, (_, index) => source ? source.steps[index % source.steps.length] : false),
  notes: Array.from({ length: count }, (_, index) => source ? source.notes[index % source.notes.length] : null),
  muted: source?.muted ?? false,
});

export function createStarterComposition(): LoopComposition {
  const count = 16;
  const tracks = Object.fromEntries(LANES.map(({ id }) => [id, makeLane(count)])) as Record<LaneId, LanePattern>;
  return generateLoop({
    bpm: 126, key: 'F', scale: 'minor', genre: 'melodic-techno', bars: 1, density: 0.58,
    seed: 42, mood: 'dark', buildUp: false, solo: null, progression: [0, 5, 2, 6], tracks,
  }, 42);
}

export function resizeLoop(comp: LoopComposition, bars: number): LoopComposition {
  const safeBars = Math.max(1, Math.min(4, Math.round(bars)));
  const length = safeBars * 16;
  const tracks = Object.fromEntries(LANES.map(({ id }) => [id, makeLane(length, comp.tracks[id])])) as Record<LaneId, LanePattern>;
  return { ...comp, bars: safeBars, tracks };
}

const degreeMidi = (comp: Pick<LoopComposition, 'key' | 'scale'>, degree: number, octave = 3) => {
  const scale = SCALE_INTERVALS[comp.scale];
  const wrappedDegree = ((degree % scale.length) + scale.length) % scale.length;
  const octaveOffset = Math.floor(degree / scale.length);
  return (octave + 1 + octaveOffset) * 12 + (PITCH_CLASS[comp.key] ?? 0) + scale[wrappedDegree];
};

const chordForDegree = (comp: LoopComposition, degree: number) => [
  degreeMidi(comp, degree, 3),
  degreeMidi(comp, degree + 2, 3),
  degreeMidi(comp, degree + 4, 3),
];

function emptyTrackLike(track: LanePattern, length: number): LanePattern {
  return { steps: Array(length).fill(false), notes: Array(length).fill(null), muted: track.muted };
}

export function generateRhythm(comp: LoopComposition, seed = comp.seed + 1): LoopComposition {
  const random = seededRandom(seed);
  const length = comp.bars * 16;
  const tracks = { ...comp.tracks };
  for (const lane of ['kick', 'snare', 'hats', 'percussion'] as const) tracks[lane] = emptyTrackLike(comp.tracks[lane], length);
  const type = GENRES.find((genre) => genre.id === comp.genre)?.type ?? 'four';

  for (let step = 0; step < length; step++) {
    const inBar = step % 16;
    const bar = Math.floor(step / 16);
    const buildScale = comp.buildUp && comp.bars > 1 ? 0.68 + bar / (comp.bars - 1) * 0.32 : 1;
    const density = Math.min(0.98, comp.density * buildScale);
    let kick = false;
    if (type === 'four') {
      const houseSyncopation = comp.genre === 'house-tech-house' && [6, 14].includes(inBar) && random() < density * 0.12;
      const technoPulse = comp.genre === 'techno' && inBar % 4 === 2 && random() < density * 0.1;
      kick = [0, 4, 8, 12].includes(inBar) || houseSyncopation || technoPulse || (inBar % 4 !== 0 && random() < density * 0.045);
    }
    else if (type === 'half') kick = [0, 7, 10, 14].includes(inBar) ? random() < 0.72 + density * 0.25 : random() < density * 0.16;
    else if (type === 'afro') kick = [0, 5, 8, 13].includes(inBar) || (inBar === 11 && random() < density * 0.55);
    else if (type === 'latin') kick = [0, 3, 6, 8, 11, 14].includes(inBar) ? random() < 0.6 + density * 0.35 : false;
    else if (type === 'ambient') kick = [0, 8].includes(inBar) && random() < density;
    else kick = [0, 8].includes(inBar) || (inBar % 4 === 2 && random() < density * 0.28);
    tracks.kick.steps[step] = kick;

    if (type === 'latin') tracks.snare.steps[step] = [3, 7, 11, 15].includes(inBar) && random() < density + 0.15;
    else if (type === 'half') tracks.snare.steps[step] = [4, 12].includes(inBar) && random() < 0.86;
    else if (type === 'ambient') tracks.snare.steps[step] = inBar === 12 && random() < density * 0.35;
    else if (comp.genre === 'techno') tracks.snare.steps[step] = inBar === 12 || ([6, 14].includes(inBar) && random() < density * 0.12);
    else if (comp.genre === 'melodic-techno') tracks.snare.steps[step] = [4, 12].includes(inBar) && random() < 0.7;
    else tracks.snare.steps[step] = [4, 12].includes(inBar) || ([6, 14].includes(inBar) && random() < density * 0.12);

    const hatBase = type === 'ambient' ? 0.12 : type === 'half' ? 0.68 : 0.72;
    tracks.hats.steps[step] = inBar % 2 === 0 && random() < hatBase * (0.45 + density * 0.65);
    const sixteenthChance = comp.genre === 'trance' ? 0.18 : comp.genre === 'techno' ? 0.15 : type === 'half' ? 0.24 : 0.1;
    if (inBar % 2 === 1 && random() < density * sixteenthChance) tracks.hats.steps[step] = true;

    let percChance = type === 'latin' || type === 'afro' ? density * 0.72 : type === 'ambient' ? 0.04 : density * 0.25;
    if (comp.genre === 'melodic-techno' && [2, 6, 10, 14].includes(inBar)) percChance = density * 0.58;
    if (comp.genre === 'techno' && inBar === 15 && bar % 2 === 1) percChance = density * 0.78;
    if (comp.genre === 'house-tech-house' && [6, 14].includes(inBar)) percChance = density * 0.66;
    if (type === 'latin' && [2, 6, 10, 14].includes(inBar)) percChance = 0.9;
    tracks.percussion.steps[step] = random() < percChance;
  }
  return { ...comp, seed, tracks };
}

export function generateChords(comp: LoopComposition, seed = comp.seed + 1): LoopComposition {
  const random = seededRandom(seed);
  const major = comp.scale === 'major';
  const options = major ? [0, 4, 5, 3] : [0, 5, 2, 6];
  const alternate = major ? [0, 3, 4, 5] : [0, 6, 3, 4];
  const palette = random() > 0.45 ? options : alternate;
  const progression = Array.from({ length: 4 }, (_, index) => palette[index]);
  const lane = emptyTrackLike(comp.tracks.chords, comp.bars * 16);
  for (let bar = 0; bar < comp.bars; bar++) {
    const step = bar * 16;
    const degree = progression[bar % progression.length];
    lane.steps[step] = true;
    const triad = chordForDegree(comp, degree);
    if (comp.genre === 'house-tech-house' || comp.genre === 'melodic-techno') {
      triad.push(degreeMidi(comp, degree + 6, 3)); // smooth diatonic seventh voicing
    } else if (comp.genre === 'trance' || comp.genre === 'electronic-edm') {
      triad.push(degreeMidi(comp, degree, 4)); // open octave reinforces the lift
    } else if (comp.genre === 'ambient-cinematic') {
      triad[1] += 12; // open, slow pad voicing with less low-mid crowding
    } else if (comp.genre === 'afro-house') {
      triad[1] += 12; // open fifth/third spacing leaves room for hand percussion
    }
    lane.notes[step] = triad;
  }
  return { ...comp, seed, progression, tracks: { ...comp.tracks, chords: lane } };
}

export function generateBassline(comp: LoopComposition, seed = comp.seed + 1): LoopComposition {
  const random = seededRandom(seed);
  const type = GENRES.find((genre) => genre.id === comp.genre)?.type ?? 'four';
  const lane = emptyTrackLike(comp.tracks.bass, comp.bars * 16);
  const fills = type === 'half' ? [0, 6, 10, 14] : type === 'ambient' ? [0, 8] : type === 'latin' ? [0, 3, 6, 8, 11, 14] : [0, 6, 8, 10, 14];
  for (let step = 0; step < lane.steps.length; step++) {
    const inBar = step % 16;
    const bar = Math.floor(step / 16);
    const eligible = fills.includes(inBar) || (type !== 'ambient' && inBar % 4 === 2 && random() < comp.density * 0.22);
    if (!eligible || random() > (fills.includes(inBar) ? 0.48 + comp.density * 0.5 : comp.density)) continue;
    lane.steps[step] = true;
    const degree = comp.progression[bar % Math.max(1, comp.progression.length)] ?? 0;
    const chordTone = random() < 0.28 ? degree + 4 : degree;
    lane.notes[step] = [degreeMidi(comp, chordTone, 2)];
  }
  return { ...comp, seed, tracks: { ...comp.tracks, bass: lane } };
}

export function generateMelody(comp: LoopComposition, seed = comp.seed + 1): LoopComposition {
  const random = seededRandom(seed);
  const lane = emptyTrackLike(comp.tracks.melody, comp.bars * 16);
  for (let bar = 0; bar < comp.bars; bar++) {
    const candidates = [2, 5, 7, 10, 13, 15];
    let hits = 0;
    for (const inBar of candidates) {
      if (hits >= Math.max(1, Math.round(comp.density * 4)) || random() > comp.density * 0.62) continue;
      const step = bar * 16 + inBar;
      const chordDegree = comp.progression[bar % Math.max(1, comp.progression.length)] ?? 0;
      const degree = random() < 0.62 ? chordDegree + [0, 2, 4][Math.floor(random() * 3)] : Math.floor(random() * 7);
      lane.steps[step] = true;
      lane.notes[step] = [degreeMidi(comp, degree, 4)];
      hits++;
    }
  }
  return { ...comp, seed, tracks: { ...comp.tracks, melody: lane } };
}

export function generateLoop(comp: LoopComposition, seed = comp.seed + 1): LoopComposition {
  const withChords = generateChords(comp, seed);
  const withRhythm = generateRhythm(withChords, seed + 1);
  const withBass = generateBassline(withRhythm, seed + 2);
  return { ...generateMelody(withBass, seed + 3), seed: seed + 3 };
}

export function retuneLoop(comp: LoopComposition, key: string, scale: ScaleName): LoopComposition {
  const changed = { ...comp, key, scale };
  const chords = generateChords(changed, comp.seed);
  const bass = generateBassline(chords, comp.seed + 1);
  return generateMelody(bass, comp.seed + 2);
}

export function parseLoopDescription(text: string, current: LoopComposition): LoopComposition {
  const value = text.toLowerCase();
  let next = { ...current };
  const genreAliases: [string, string[]][] = [
    ['latin-guaracha', ['guaracha', 'latin']],
    ['afro-house', ['afro house']],
    ['house-tech-house', ['tech house', 'house']],
    ['melodic-techno', ['melodic techno', 'progressive house']],
    ['ambient-cinematic', ['ambient', 'cinematic']],
    ['electronic-edm', ['edm', 'electronic']],
    ['hip-hop', ['hip hop', 'hip-hop']],
    ['drill', ['drill']], ['trap', ['trap']], ['techno', ['techno']], ['trance', ['trance']],
    ['experimental', ['experimental']],
  ];
  const match = genreAliases.find(([, aliases]) => aliases.some((alias) => value.includes(alias)));
  const genre = match && GENRES.find((preset) => preset.id === match[0]);
  if (genre) next.genre = genre.id;
  const bpm = value.match(/\b(\d{2,3})\s*bpm\b/i);
  if (bpm) next.bpm = Math.max(40, Math.min(220, Number(bpm[1])));
  const key = value.match(/\b([a-g](?:#|b)?)\s+(minor|major|dorian|phrygian)\b/i);
  if (key) {
    const normalized = key[1].replace(/^([a-g])/, (_, letter: string) => letter.toUpperCase());
    const root = ({ Db: 'C#', D: 'D', Eb: 'Eb', E: 'E', Gb: 'F#', G: 'G', Ab: 'Ab', A: 'A', Bb: 'Bb', B: 'B', C: 'C', 'C#': 'C#', F: 'F', 'F#': 'F#' } as Record<string, string>)[normalized] || normalized;
    if (KEYS.includes(root)) next.key = root;
    next.scale = key[2] as ScaleName;
  }
  if (/pentatonic/.test(value)) next.scale = 'minor pentatonic';
  if (/\b(dark|moody|brooding)\b/.test(value)) next.mood = 'dark';
  else if (/\b(bright|uplifting|happy)\b/.test(value)) next.mood = 'bright';
  else if (/\b(energetic|powerful|aggressive)\b/.test(value)) next.mood = 'energetic';
  else if (/\b(atmospheric|ambient|cinematic)\b/.test(value)) next.mood = 'atmospheric';
  if (/\b(gradual build|build-up|build up|riser|build)\b/.test(value)) next.buildUp = true;
  else if (/\b(no build|without a build)\b/.test(value)) next.buildUp = false;
  if (/\b(sparse|relaxed|minimal|calm)\b/.test(value)) next.density = 0.28;
  if (/\b(dense|busy|energetic|powerful|rolling)\b/.test(value)) next.density = 0.78;
  if (next.mood === 'dark' && !key) next.scale = 'minor';
  const targetBars = /\b(4|four)\s*bars?\b/.test(value) ? 4 : /\b(2|two)\s*bars?\b/.test(value) ? 2 : next.bars;
  next = resizeLoop(next, targetBars);
  return generateLoop(next, current.seed + 1);
}

export function midiNoteName(note: number) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${names[note % 12]}${Math.floor(note / 12) - 1}`;
}

const variableLength = (value: number) => {
  const bytes = [value & 0x7f];
  while ((value >>= 7) > 0) bytes.unshift((value & 0x7f) | 0x80);
  return bytes;
};

export function encodeLoopMidi(comp: LoopComposition): Uint8Array {
  const ppq = 480;
  const events: { tick: number; priority: number; data: number[] }[] = [];
  const microsPerBeat = Math.round(60_000_000 / comp.bpm);
  events.push({ tick: 0, priority: -2, data: [0xff, 0x51, 0x03, (microsPerBeat >> 16) & 255, (microsPerBeat >> 8) & 255, microsPerBeat & 255] });
  events.push({ tick: 0, priority: -1, data: [0xff, 0x58, 0x04, 4, 2, 24, 8] });
  const drumPitches: Record<string, number> = { kick: 36, snare: 38, hats: 42, percussion: 75 };
  const channels: Record<LaneId, number> = { kick: 9, snare: 9, hats: 9, percussion: 9, bass: 0, chords: 1, melody: 2 };
  const lengths: Record<LaneId, number> = { kick: 72, snare: 60, hats: 24, percussion: 40, bass: 96, chords: 360, melody: 72 };
  const totalSteps = comp.bars * 16;
  for (const { id } of LANES) {
    if (comp.tracks[id].muted || (comp.solo && comp.solo !== id)) continue;
    for (let step = 0; step < totalSteps; step++) {
      if (!comp.tracks[id].steps[step]) continue;
      const notes = comp.tracks[id].notes[step] ?? [drumPitches[id] ?? 60];
      const tick = step * (ppq / 4);
      for (const note of notes) {
        const channel = channels[id];
        const duration = lengths[id];
        events.push({ tick, priority: 1, data: [0x90 | channel, note, 96] });
        events.push({ tick: tick + duration, priority: 0, data: [0x80 | channel, note, 0] });
      }
    }
  }
  events.sort((a, b) => a.tick - b.tick || a.priority - b.priority);
  const trackBytes: number[] = [];
  let previousTick = 0;
  for (const event of events) {
    trackBytes.push(...variableLength(Math.max(0, event.tick - previousTick)), ...event.data);
    previousTick = event.tick;
  }
  trackBytes.push(0, 0xff, 0x2f, 0x00);
  const ascii = (text: string) => Array.from(text, (char) => char.charCodeAt(0));
  const be16 = (n: number) => [(n >> 8) & 255, n & 255];
  const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  return new Uint8Array([
    ...ascii('MThd'), ...be32(6), ...be16(0), ...be16(1), ...be16(ppq),
    ...ascii('MTrk'), ...be32(trackBytes.length), ...trackBytes,
  ]);
}
