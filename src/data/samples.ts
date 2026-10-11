export type SampleCategory =
  | 'Kicks & Percussion'
  | 'Snares & Claps'
  | 'Hi-Hats'
  | 'Bass & Low End'
  | 'Synth Leads'
  | 'Chords & Stabs'
  | 'Pads & Atmospheres'
  | 'FX & Transitions'
  | 'Loops & Sequences'
  | 'MIDI Patterns';

export interface SampleItem {
  id: string;
  name: string;
  category: SampleCategory;
  genre: string;
  key: string;
  bpm: number | string;
  format: string;
  synthType: 'kick' | 'snare' | 'clap' | 'hihat' | 'hihat-open' | 'bass808' | 'reese' | 'lead' | 'chord' | 'pad' | 'riser';
  notes?: string[];
  description: string;
  tags: string[];
}

export const SAMPLE_CATEGORIES: SampleCategory[] = [
  'Kicks & Percussion',
  'Snares & Claps',
  'Hi-Hats',
  'Bass & Low End',
  'Synth Leads',
  'Chords & Stabs',
  'Pads & Atmospheres',
  'FX & Transitions',
  'Loops & Sequences',
  'MIDI Patterns',
];

export const SAMPLES_LIBRARY: SampleItem[] = [
  {
    id: 'k-01',
    name: 'Pneumatic 52Hz Club Kick',
    category: 'Kicks & Percussion',
    genre: 'Techno / EDM',
    key: 'C',
    bpm: '124 – 128',
    format: 'Synthesized in browser · Web Audio',
    synthType: 'kick',
    description: 'Original synthesized kick with a fast falling sub pitch and a short low-frequency decay.',
    tags: ['Kick', 'Sub Punch', 'Peak-time', 'Analog'],
  },
  {
    id: 'k-02',
    name: 'Festival Mainstage Stomper Kick',
    category: 'Kicks & Percussion',
    genre: 'Big Room / EDM',
    key: 'F',
    bpm: '128',
    format: 'Synthesized in browser · Web Audio',
    synthType: 'kick',
    description: 'Original synthesized kick with a quick low-pitch drop and short envelope.',
    tags: ['Kick', 'Mainstage', 'Hard Transient'],
  },
  {
    id: 's-01',
    name: 'Stereo Layered Crack Snare',
    category: 'Snares & Claps',
    genre: 'Progressive House',
    key: 'A',
    bpm: '126',
    format: 'Synthesized in browser · Web Audio',
    synthType: 'snare',
    description: 'Synthesized triangle body layered with a short filtered-noise snap.',
    tags: ['Snare', 'Transient', 'Crisp'],
  },
  {
    id: 'c-01',
    name: 'Analog Room Flammed Clap',
    category: 'Snares & Claps',
    genre: 'Techno / House',
    key: '—',
    bpm: '124',
    format: 'Synthesized in browser · Web Audio',
    synthType: 'clap',
    description: 'Filtered noise with three close envelope accents; no external sample or reverb file.',
    tags: ['Clap', 'Stereo', 'Flam'],
  },
  {
    id: 'h-01',
    name: '909 Sizzle Closed Hat',
    category: 'Hi-Hats',
    genre: 'Techno',
    key: '—',
    bpm: '124 – 130',
    format: 'Synthesized in browser · Web Audio',
    synthType: 'hihat',
    description: 'Short band-pass filtered-noise hat synthesized at approximately 8.8 kHz.',
    tags: ['Hi-Hat', 'Closed', '909'],
  },
  {
    id: 'h-02',
    name: 'Offbeat Shimmer Open Hat',
    category: 'Hi-Hats',
    genre: 'House / Trance',
    key: '—',
    bpm: '126',
    format: 'Synthesized in browser · Web Audio',
    synthType: 'hihat-open',
    description: 'Longer filtered-noise hat synthesis for open offbeat accents.',
    tags: ['Hi-Hat', 'Open', 'Offbeat'],
  },
  {
    id: 'b-01',
    name: 'Pure Sub Sine 808 Glide',
    category: 'Bass & Low End',
    genre: 'Future Bass / Trap',
    key: 'C',
    bpm: '140',
    format: 'Synthesized in browser · Web Audio',
    synthType: 'bass808',
    notes: ['C2'],
    description: 'Sine-wave sub with a short pitch glide into the selected note.',
    tags: ['Sub Bass', '808', 'Sine', 'Mono'],
  },
  {
    id: 'b-02',
    name: 'Reese Bass Mid-Phaser',
    category: 'Bass & Low End',
    genre: 'DnB / Melodic Techno',
    key: 'F',
    bpm: '124 – 174',
    format: 'Synthesized in browser · Web Audio',
    synthType: 'reese',
    notes: ['F2'],
    description: 'Two detuned saw oscillators form a moving low-mid synth bass.',
    tags: ['Reese', 'Low End', 'Phasing'],
  },
  {
    id: 'l-01',
    name: 'Melodic Horizon Saw Lead',
    category: 'Synth Leads',
    genre: 'Melodic Techno',
    key: 'C Minor',
    bpm: '124',
    format: 'Synthesized in browser · Web Audio',
    synthType: 'lead',
    notes: ['C4'],
    description: 'A short dual-oscillator saw lead with a low-pass filter envelope.',
    tags: ['Lead', 'Analog Saw', 'Hook'],
  },
  {
    id: 'cs-01',
    name: 'Cm9 Atmospheric Chord Stab',
    category: 'Chords & Stabs',
    genre: 'Melodic Techno',
    key: 'C Minor',
    bpm: '124',
    format: 'Synthesized in browser · Web Audio',
    synthType: 'chord',
    notes: ['C3', 'Eb3', 'G3', 'Bb3', 'D4'],
    description: 'Five-note chord voicing played by detuned oscillators through a low-pass filter.',
    tags: ['Chord Stab', 'Cm9', 'Deep'],
  },
  {
    id: 'p-01',
    name: 'Ethereal Biosphere Pad',
    category: 'Pads & Atmospheres',
    genre: 'Cinematic / Ambient',
    key: 'Ab Major',
    bpm: 'Free',
    format: 'Synthesized in browser · Web Audio',
    synthType: 'pad',
    notes: ['Ab2', 'Eb3', 'C4', 'G4'],
    description: 'Longer multi-note synth chord with a slow filter fade.',
    tags: ['Pad', 'Atmosphere', 'Cinematic'],
  },
  {
    id: 'fx-01',
    name: 'White Noise Tension Riser 16-Bar',
    category: 'FX & Transitions',
    genre: 'All Electronic',
    key: '—',
    bpm: '126',
    format: 'Synthesized in browser · Web Audio',
    synthType: 'riser',
    description: 'Generated filtered noise with an upward frequency sweep for a transition.',
    tags: ['Riser', 'White Noise', 'Build', 'FX'],
  },
  {
    id: 'm-01',
    name: 'Cm9 Melodic Techno Chord Preview',
    category: 'MIDI Patterns',
    genre: 'Melodic Techno',
    key: 'C Minor',
    bpm: '124',
    format: 'Generated pattern · Web Audio',
    synthType: 'chord',
    notes: ['C3', 'Eb3', 'G3', 'Bb3', 'D4'],
    description: 'Browser-synthesized chord preview. Create and export editable MIDI patterns from Loop Studio.',
    tags: ['MIDI', 'Chords', 'Progression', 'DAW Ready'],
  },
];

