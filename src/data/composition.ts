export interface GenreGuide {
  id: string;
  name: string;
  bpm: string;
  keyCharacteristic: string;
  kickStyle: string;
  bassDesign: string;
  leadStyle: string;
  arrangementTips: string;
  mixingFocus: string;
}

export interface ArrangementBlock {
  name: string;
  bars: number;
  energy: number; // 1 to 10
  color: string;
  description: string;
  elements: string[];
}

export const GENRE_GUIDES: GenreGuide[] = [
  {
    id: 'melodic-techno',
    name: 'Melodic Techno',
    bpm: '122 – 126 BPM',
    keyCharacteristic: 'Hypnotic rolling 16th-note sub-bass, minor emotional motifs, analog filter sweeps.',
    kickStyle: 'Deep, rounded 50Hz punch with minimal top-click, compressed with subtle saturation.',
    bassDesign: 'Rolling offbeat sub or 16th-note arp with automated cutoff frequency and decaying resonance.',
    leadStyle: 'Single-oscillator analog saw or triangle lead with heavy tape delay and lush stereo reverb.',
    arrangementTips: 'Long, patient builds (32 to 64 bars). No sudden transitions; introduce stems gradually over 8-bar cycles.',
    mixingFocus: 'Extreme sub-bass headroom control. High-pass all mid instruments strictly at 120Hz.',
  },
  {
    id: 'progressive-house',
    name: 'Progressive House',
    bpm: '126 – 128 BPM',
    keyCharacteristic: 'Euphoric chord progressions, soaring supersaw layers, atmospheric vocal pads.',
    kickStyle: 'Punchy 60Hz kick with defined click transient to cut through dense supersaw stacks.',
    bassDesign: 'Layered sub sine (mono) paired with a wide, stereo mid-frequency saw bass.',
    leadStyle: 'Multi-voiced supersaw (7-9 voices per osc) detuned wide with sidechain ducking.',
    arrangementTips: 'Extended emotional breakdown featuring piano and ambient pads, leading into a 16-bar riser build.',
    mixingFocus: 'Sidechain compression timed to 1/4 note pumping to give chords physical rhythm against the kick.',
  },
  {
    id: 'uplifting-trance',
    name: 'Uplifting Trance',
    bpm: '138 – 140 BPM',
    keyCharacteristic: 'Driving 138 BPM bassline triplets, dramatic neoclassical melodies, ecstatic breakdown climax.',
    kickStyle: 'Hard, clicky kick transient with fast decay to leave room for rapid 16th-note rolling bass.',
    bassDesign: '3-layer rolling bassline: Sub sine (root), Mid punch (short decay), High saw sizzle.',
    leadStyle: 'Aggressive detuned JP-8000 supersaws drenched in ping-pong delay and cathedral reverbs.',
    arrangementTips: 'The hallmark 64-bar emotional breakdown where all percussion stops, leaving pure harmony before the snare roll.',
    mixingFocus: 'Stereo width management: sub strictly mono (<150Hz), leads spread 120-140% wide.',
  },
  {
    id: 'future-bass',
    name: 'Future Bass',
    bpm: '140 – 160 BPM (75-80 Half-time)',
    keyCharacteristic: 'Half-time trap groove, LFO-wobbled lush 9th/11th chords, pitch-bent vocal chops.',
    kickStyle: 'Heavy 808 sub kick with prolonged decay, tuned specifically to the track key.',
    bassDesign: 'Distorted 808 glide sub bass carrying the harmonic foundation.',
    leadStyle: 'Vibrato-modulated supersaw chords with fast automation on volume and filter cutoff.',
    arrangementTips: 'Dramatic contrasts between delicate, intimate verses and thunderous half-time drop explosions.',
    mixingFocus: 'Transient shaping on snares/claps to ensure crisp snap above massive sustained 808 low end.',
  },
  {
    id: 'drum-and-bass',
    name: 'Drum & Bass (Liquid & Dancefloor)',
    bpm: '174 – 176 BPM',
    keyCharacteristic: 'High-speed 174 BPM syncopated breakbeats, reese bass filtering, deep emotional warmth.',
    kickStyle: 'Fast acoustic/electronic transient with short punch around 80Hz.',
    bassDesign: 'Detuned Reese bass (two detuned saws creating phasing flutter) processed through distortion & chorus.',
    leadStyle: 'Warm Rhodes piano, smooth sax chops, or soaring vocal top-lines.',
    arrangementTips: 'Fast 16-bar intro leading straight into the first drop. Rapid energy flow.',
    mixingFocus: 'Ultra-fast attack compression on breakbeats to retain snap and groove at 174 BPM.',
  },
];

export const ANTHEM_ARRANGEMENT: ArrangementBlock[] = [
  {
    name: 'Intro / DJ Mix',
    bars: 32,
    energy: 3,
    color: 'border-cyan/40 bg-cyan/10 text-cyan',
    description: 'Stripped percussion groove and subtle sub pulse for DJ mixing into the set.',
    elements: ['Kick Drum', 'Closed Hi-Hats', 'Sub Groove', 'Filtered Pad Tease'],
  },
  {
    name: 'Verse / Breakdown 1',
    bars: 16,
    energy: 5,
    color: 'border-violet/40 bg-violet/10 text-violet',
    description: 'Drums drop out; the core emotional harmony, piano, and vocal theme are introduced.',
    elements: ['Chord Progression', 'Atmospheric FX', 'Pluck Motif', 'Shaker Sweep'],
  },
  {
    name: 'The Buildup',
    bars: 16,
    energy: 8,
    color: 'border-amber-400/40 bg-amber-400/10 text-amber-400',
    description: 'Pitch risers, accelerating snare roll (1/4 -> 1/8 -> 1/16 -> 1/32), high-pass filter climb.',
    elements: ['Snare Roll', 'White Noise Riser', 'Pitch Automator', 'Pre-Drop Silence (1 beat)'],
  },
  {
    name: 'The Main Drop',
    bars: 32,
    energy: 10,
    color: 'border-cyan bg-cyan/20 text-cyan',
    description: 'Maximum acoustic impact: full sub-bass, main lead hook, un-filtered drums and groove.',
    elements: ['Punchy Kick', 'Full Sub Bass', 'Main Lead Theme', 'Open Hats & Claps', 'Sidechain Pump'],
  },
  {
    name: 'Breakdown 2 / Bridge',
    bars: 16,
    energy: 6,
    color: 'border-violet/40 bg-violet/10 text-violet',
    description: 'New harmonic variations or stripped arpeggio layers building tension for the finale.',
    elements: ['Secondary Arp', 'Reese Bass Pad', 'Vocal Chops', 'Tension Riser'],
  },
  {
    name: 'Climax Drop',
    bars: 32,
    energy: 10,
    color: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400',
    description: 'The highest energy moment of the track with extra counter-melodies and ride cymbals.',
    elements: ['Extra Lead Layer', 'Ride Cymbals', 'Sub Octave Stabs', 'Maximum Sidechain'],
  },
  {
    name: 'Outro / Mix Out',
    bars: 32,
    energy: 3,
    color: 'border-bone/20 bg-void/50 text-bone/60',
    description: 'Progressive removal of melody layers, returning to drums and sub for mixing into the next track.',
    elements: ['Percussion Loop', 'Fading Synth Loop', 'Sub Bass Outro'],
  },
];

