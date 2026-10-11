export interface NoteInfo {
  note: string;
  role: string;
  freq: string;
  interval: string;
}

export interface ChordItem {
  id: string;
  name: string;
  symbol: string;
  category: 'Extended' | 'Seventh' | 'Suspended' | 'Triad';
  mood: string;
  theory: string;
  rootNotes: string[];
  inversions: {
    label: string;
    notes: string[];
  }[];
}

export interface ScaleItem {
  name: string;
  mode: string;
  formula: string;
  mood: string;
  notes: string[];
  description: string;
}

export interface ProgressionItem {
  genre: string;
  bpm: number;
  roman: string;
  key: string;
  chords: string[];
  chordNotes: string[][];
  description: string;
}

export const CHORDS_CATALOGUE: ChordItem[] = [
  {
    id: 'cm9',
    name: 'C Minor 9',
    symbol: 'Cm9',
    category: 'Extended',
    mood: 'Late-Night Melancholy & Deep Nostalgia',
    theory: 'The Major 9th (D) on top of a minor 7th chord introduces lush, cinematic warmth. Essential in Melodic Techno & Deep House.',
    rootNotes: ['C3', 'Eb3', 'G3', 'Bb3', 'D4'],
    inversions: [
      { label: 'Root Position', notes: ['C3', 'Eb3', 'G3', 'Bb3', 'D4'] },
      { label: '1st Inversion', notes: ['Eb3', 'G3', 'Bb3', 'C4', 'D4'] },
      { label: '2nd Inversion', notes: ['G3', 'Bb3', 'C4', 'Eb4', 'D4'] },
    ],
  },
  {
    id: 'abmaj7',
    name: 'Ab Major 7',
    symbol: 'Abmaj7',
    category: 'Seventh',
    mood: 'Celestial Euphoria & Expansive Release',
    theory: 'The natural major 7th interval produces a luminous, wide sheen. Moving from Cm to Abmaj7 delivers monumental emotional lift in builds.',
    rootNotes: ['Ab2', 'C3', 'Eb3', 'G3'],
    inversions: [
      { label: 'Root Position', notes: ['Ab2', 'C3', 'Eb3', 'G3'] },
      { label: '1st Inversion', notes: ['C3', 'Eb3', 'G3', 'Ab3'] },
      { label: '2nd Inversion', notes: ['Eb3', 'G3', 'Ab3', 'C4'] },
    ],
  },
  {
    id: 'fsus4',
    name: 'F Suspended 4',
    symbol: 'Fsus4',
    category: 'Suspended',
    mood: 'Anticipation, Tension & Unresolved Motion',
    theory: 'Replacing the 3rd with the perfect 4th creates harmonic suspension. The ear craves resolution to F major or minor, driving momentum into the drop.',
    rootNotes: ['F2', 'Bb2', 'C3'],
    inversions: [
      { label: 'Root Position', notes: ['F2', 'Bb2', 'C3'] },
      { label: '1st Inversion', notes: ['Bb2', 'C3', 'F3'] },
      { label: '2nd Inversion', notes: ['C3', 'F3', 'Bb3'] },
    ],
  },
  {
    id: 'fm9',
    name: 'F Minor 9',
    symbol: 'Fm9',
    category: 'Extended',
    mood: 'Dark Cinematic Weight & Atmospheric Tension',
    theory: 'The iv9 chord in C minor establishes heavy, dramatic gravitas. Frequently used right before pre-drop silence.',
    rootNotes: ['F2', 'Ab2', 'C3', 'Eb3', 'G3'],
    inversions: [
      { label: 'Root Position', notes: ['F2', 'Ab2', 'C3', 'Eb3', 'G3'] },
      { label: '1st Inversion', notes: ['Ab2', 'C3', 'Eb3', 'F3', 'G3'] },
    ],
  },
  {
    id: 'ebmaj9',
    name: 'Eb Major 9',
    symbol: 'Ebmaj9',
    category: 'Extended',
    mood: 'Shimmering Hope & Uplifting Warmth',
    theory: 'The relative major III chord in C minor. Stacking the major 9th gives a floating, weightless acoustic sensation.',
    rootNotes: ['Eb3', 'G3', 'Bb3', 'D4', 'F4'],
    inversions: [
      { label: 'Root Position', notes: ['Eb3', 'G3', 'Bb3', 'D4', 'F4'] },
      { label: '1st Inversion', notes: ['G3', 'Bb3', 'D4', 'Eb4', 'F4'] },
    ],
  },
  {
    id: 'bb7',
    name: 'Bb Dominant 7',
    symbol: 'Bb7',
    category: 'Seventh',
    mood: 'Driving Pulse & Harmonic Propellant',
    theory: 'The VII chord in natural minor. The tritone interval between D and Ab propels the listener forcefully back to the root tonic.',
    rootNotes: ['Bb2', 'D3', 'F3', 'Ab3'],
    inversions: [
      { label: 'Root Position', notes: ['Bb2', 'D3', 'F3', 'Ab3'] },
      { label: '1st Inversion', notes: ['D3', 'F3', 'Ab3', 'Bb3'] },
    ],
  },
];

export const SCALES_CATALOGUE: ScaleItem[] = [
  {
    name: 'Natural Minor',
    mode: 'Aeolian',
    formula: '1 - 2 - b3 - 4 - 5 - b6 - b7',
    mood: 'Melancholic, serious, cinematic, foundational in EDM.',
    notes: ['C3', 'D3', 'Eb3', 'F3', 'G3', 'Ab3', 'Bb3', 'C4'],
    description: 'The definitive scale of electronic dance music. Provides dark emotional tension without sounding completely dissonant.',
  },
  {
    name: 'Dorian Mode',
    mode: 'Dorian',
    formula: '1 - 2 - b3 - 4 - 5 - 6 - b7',
    mood: 'Sophisticated, hopeful sadness, signature of Daft Punk & Deadmau5.',
    notes: ['C3', 'D3', 'Eb3', 'F3', 'G3', 'A3', 'Bb3', 'C4'],
    description: 'The natural 6th degree adds a bright ray of light over a minor foundation. Perfect for deep progressive grooves.',
  },
  {
    name: 'Phrygian Mode',
    mode: 'Phrygian',
    formula: '1 - b2 - b3 - 4 - 5 - b6 - b7',
    mood: 'Aggressive, exotic, menacing, dark techno & psytrance.',
    notes: ['C3', 'Db3', 'Eb3', 'F3', 'G3', 'Ab3', 'Bb3', 'C4'],
    description: 'The flat second (b2) creates maximum tension against the root, used heavily in peak-time techno and festival drops.',
  },
  {
    name: 'Harmonic Minor',
    mode: 'Harmonic',
    formula: '1 - 2 - b3 - 4 - 5 - b6 - 7',
    mood: 'Classical drama, neoclassical, epic cinematic builds.',
    notes: ['C3', 'D3', 'Eb3', 'F3', 'G3', 'Ab3', 'B3', 'C4'],
    description: 'The raised leading tone (B natural) introduces classical European tension that resolves violently to the tonic minor.',
  },
];

export const PROGRESSIONS_CATALOGUE: ProgressionItem[] = [
  {
    genre: 'Melodic Techno',
    bpm: 124,
    roman: 'i — VI — III — VII',
    key: 'C Minor',
    chords: ['Cm9', 'Abmaj7', 'Ebmaj9', 'Bb7'],
    chordNotes: [
      ['C3', 'Eb3', 'G3', 'Bb3', 'D4'],
      ['Ab2', 'C3', 'Eb3', 'G3'],
      ['Eb3', 'G3', 'Bb3', 'D4', 'F4'],
      ['Bb2', 'D3', 'F3', 'Ab3'],
    ],
    description: 'The ultimate four-chord journey in electronic music. Builds relentless emotional momentum over rolling 16th-note basslines.',
  },
  {
    genre: 'Progressive House',
    bpm: 126,
    roman: 'i — iv — v — VI',
    key: 'A Minor',
    chords: ['Am7', 'Dm7', 'Em7', 'Fmaj7'],
    chordNotes: [
      ['A2', 'C3', 'E3', 'G3'],
      ['D3', 'F3', 'A3', 'C4'],
      ['E3', 'G3', 'B3', 'D4'],
      ['F2', 'A3', 'C4', 'E4'],
    ],
    description: 'Ascending stepwise movement creating an uplifting, soaring feeling perfect for festival anthems and mainstage climaxes.',
  },
  {
    genre: 'Future Bass / Melodic EDM',
    bpm: 140,
    roman: 'vi — IV — I — V',
    key: 'C Major',
    chords: ['Am9', 'Fmaj9', 'Cadd9', 'Gadd9'],
    chordNotes: [
      ['A2', 'C3', 'E3', 'G3', 'B3'],
      ['F2', 'A3', 'C4', 'E4', 'G4'],
      ['C3', 'E3', 'G3', 'D4'],
      ['G2', 'B2', 'D3', 'A3'],
    ],
    description: 'Huge supersaw chord stack with detuned extensions. Sidechained heavily to 808 kicks for punchy modern dynamics.',
  },
  {
    genre: 'Uplifting Trance',
    bpm: 138,
    roman: 'VI — VII — i — III',
    key: 'C Minor',
    chords: ['Abmaj7', 'Bb7', 'Cm7', 'Ebmaj7'],
    chordNotes: [
      ['Ab2', 'C3', 'Eb3', 'G3'],
      ['Bb2', 'D3', 'F3', 'Ab3'],
      ['C3', 'Eb3', 'G3', 'Bb3'],
      ['Eb3', 'G3', 'Bb3', 'D4'],
    ],
    description: 'Starting on the VI chord gives immediate emotional elevation before resolving back through the minor tonic into the major III.',
  },
];

