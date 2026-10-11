export interface ArtistService {
  id: string;
  title: string;
  category: string;
  tagline: string;
  description: string;
  deliverables: string[];
  specs: string;
}

export const ARTIST_SERVICES: ArtistService[] = [
  {
    id: 'production',
    title: 'Full Track Production',
    category: 'Production',
    tagline: 'From initial melodic motif to finished, club-ready electronic master.',
    description: 'Bespoke original production across Melodic Techno, Progressive House, Trance, and Cinematic EDM. Built from scratch inside professional DAW environments with analog-modeled processing.',
    deliverables: [
      'Original full-length arrangement (Extended & Radio mix)',
      'High-resolution 24-bit 48kHz WAV master',
      'Full dry & wet uncompressed audio stems',
      'Full MIDI data for melodies, chords & basslines',
    ],
    specs: 'Turnaround: 7 – 14 business days • Stems Included',
  },
  {
    id: 'sound-design',
    title: 'Sound Design & Synthesizer Programming',
    category: 'Sound Design',
    tagline: 'Custom analog patches, signature wavetables, and bespoke FX.',
    description: 'Hardware and software synth architecture: sculpting unique basslines, signature supersaws, atmospheric textures, and custom risers engineered to distinguish your sound identity.',
    deliverables: [
      'Custom Serum, Vital, or hardware-compatible patches',
      'Key-labeled one-shot and loop sound samples',
      'Documentation on modulation routing and macro assignments',
    ],
    specs: 'Deliverable: Patch bundles & 24-bit WAV renders',
  },
  {
    id: 'scoring',
    title: 'Cinematic Scoring & Sync Music',
    category: 'Composition',
    tagline: 'Futuristic, emotive soundscapes for game trailers, films, and media.',
    description: 'Hybrid electronic and orchestral scoring designed to elevate visual narratives. Powerful low-end impacts, tension-building arpeggios, and memorable thematic melodies.',
    deliverables: [
      'Scene-synced custom composition and cues',
      'Stem breakouts (Strings/Pads, Percussion, Sub, Lead)',
      'Loopable game audio segments & cut-down edits (15s, 30s, 60s)',
    ],
    specs: 'Commercial sync license & full stems included',
  },
  {
    id: 'mixing',
    title: 'Electronic Music Mixing & Finishing',
    category: 'Audio Engineering',
    tagline: 'Precise low-end separation, stereo depth, and monumental loudness.',
    description: 'Specialized mixing for club sound systems: resolving kick-bass masking, transient shaping, mono-compatibility verification, dynamic resonance management, and competitive LUFS mastering.',
    deliverables: [
      'Club-optimized Pre-Master & Streaming Master',
      'Instrumental & Vocal Acapella print',
      'Detailed mix notes and stem feedback',
    ],
    specs: 'Calibrated for festival systems and streaming platforms',
  },
  {
    id: 'collaboration',
    title: 'Artist Collaboration & Ghost Writing',
    category: 'Creative Collaboration',
    tagline: 'Co-writing and production partnerships with international vocalists and producers.',
    description: 'Collaborative songwriting sessions, chord progression development, melody vocal tuning, and arrangement polishing for label pitches and release campaigns.',
    deliverables: [
      'Collaborative production sessions',
      'Split-sheet registration assistance',
      'Co-producer promotional support',
    ],
    specs: 'Open to label releases and select independent artists',
  },
];

