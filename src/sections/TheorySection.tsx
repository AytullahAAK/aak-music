import { useState } from 'react';
import { useReveal } from '../hooks/useReveal';
import Button from '../components/Button';

const CHORDS = [
  {
    name: 'C MINOR 9 (Cm9)',
    mood: 'Late-Night Melancholy & Deep Nostalgia',
    notes: [
      { note: 'C3', role: 'Root (Fundamental)', freq: '130.8 Hz', interval: '0 st' },
      { note: 'Eb3', role: 'Minor 3rd', freq: '155.6 Hz', interval: '+3 st' },
      { note: 'G3', role: 'Perfect 5th', freq: '196.0 Hz', interval: '+7 st' },
      { note: 'Bb3', role: 'Minor 7th', freq: '233.1 Hz', interval: '+10 st' },
      { note: 'D4', role: 'Major 9th (Colour)', freq: '293.7 Hz', interval: '+14 st' },
    ],
    theory:
      'The addition of the Major 9th (D) on top of a minor seventh chord resolves harsh dissonance into an ethereal, cinematic warmth common in atmospheric electronic production.',
  },
  {
    name: 'Ab MAJOR 7 (Abmaj7)',
    mood: 'Celestial Euphoria & Cinematic Expansion',
    notes: [
      { note: 'Ab2', role: 'Root', freq: '103.8 Hz', interval: '0 st' },
      { note: 'C3', role: 'Major 3rd', freq: '130.8 Hz', interval: '+4 st' },
      { note: 'Eb3', role: 'Perfect 5th', freq: '155.6 Hz', interval: '+7 st' },
      { note: 'G3', role: 'Major 7th', freq: '196.0 Hz', interval: '+11 st' },
    ],
    theory:
      'The pure 11-semitone spread creates a shimmering harmonic shimmer. In EDM, shifting from Cm9 to Abmaj7 delivers monumental emotional release.',
  },
  {
    name: 'F SUSPENDED 4 (Fsus4)',
    mood: 'Tension, Anticipation & Unresolved Motion',
    notes: [
      { note: 'F2', role: 'Root', freq: '87.3 Hz', interval: '0 st' },
      { note: 'Bb2', role: 'Perfect 4th', freq: '116.5 Hz', interval: '+5 st' },
      { note: 'C3', role: 'Perfect 5th', freq: '130.8 Hz', interval: '+7 st' },
    ],
    theory:
      'Replacing the third with the fourth creates harmonic instability. The ear craves resolution back to the major or minor triad, propelling track progression forward.',
  },
];

export default function TheorySection() {
  const [activeChordIdx, setActiveChordIdx] = useState(0);
  const r = useReveal<HTMLDivElement>();
  const activeChord = CHORDS[activeChordIdx];

  return (
    <section id="theory" className="relative min-h-[100svh] px-6 py-28 md:px-12 md:py-40">
      <div
        ref={r}
        className="reveal relative mx-auto grid max-w-[1600px] items-center gap-12 lg:grid-cols-12"
      >
        {/* Left Column: Theory storytelling & chord tabs */}
        <div className="lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/10 px-3.5 py-1 text-xs font-mono font-medium tracking-widest text-violet">
            <span>SCENE 05</span>
            <span>//</span>
            <span>HARMONIC ARCHITECTURE</span>
          </div>

          <h2 className="mt-5 font-display text-4xl font-extrabold leading-[.95] tracking-[-.03em] md:text-7xl">
            THE PHYSICS OF <br />
            EMOTION & CHORDS.
          </h2>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-bone/75">
            Music theory in electronic composition is the art of acoustic physics.
            By stacking harmonic intervals and tension ratios, simple sine waves are transformed
            into visceral emotional storytelling.
          </p>

          {/* Chord Selector */}
          <div className="mt-8">
            <p className="text-xs font-mono uppercase tracking-wider text-bone/60">
              Select Harmonic Progression:
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {CHORDS.map((c, idx) => (
                <button
                  key={c.name}
                  onClick={() => setActiveChordIdx(idx)}
                  className={`rounded-full px-5 py-2.5 text-xs font-mono font-semibold tracking-wider transition-all duration-300 ${
                    activeChordIdx === idx
                      ? 'bg-violet text-bone shadow-[0_0_24px_-6px_rgba(134,88,255,0.7)]'
                      : 'border border-bone/20 bg-void/50 text-bone/80 hover:border-bone/60'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mood & Explanation */}
          <div className="mt-6 rounded-3xl border border-bone/15 bg-void/70 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-bone/10 pb-3">
              <span className="font-mono text-sm font-semibold text-bone">{activeChord.name}</span>
              <span className="font-mono text-xs text-cyan">{activeChord.mood}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-bone/75">
              {activeChord.theory}
            </p>
          </div>

          <div className="mt-8 flex gap-4">
            <Button href="#music">HEAR IN RELEASES</Button>
            <Button href="#about" variant="ghost">ABOUT AAK MUSIC</Button>
          </div>
        </div>

        {/* Right Column: Note interval breakdown & harmonic spectrum */}
        <div className="lg:col-span-5 lg:col-start-8">
          <div className="rounded-3xl border border-bone/15 bg-ink/75 p-6 shadow-2xl backdrop-blur-2xl md:p-8">
            <div className="flex items-center justify-between border-b border-bone/15 pb-4">
              <span className="text-xs font-mono text-cyan">INTERVAL DECONSTRUCTION</span>
              <span className="text-xs font-mono text-bone/60">EQUAL TEMPERAMENT (A=440Hz)</span>
            </div>

            {/* Note Interval Rows */}
            <div className="mt-6 space-y-2.5">
              {activeChord.notes.map((n) => (
                <div
                  key={n.note}
                  className="flex items-center justify-between rounded-xl border border-bone/10 bg-void/60 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-bone">{n.note}</span>
                    <span className="font-mono text-xs text-bone/60">{n.role}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-cyan">{n.freq}</span>
                    <span className="rounded bg-violet/20 px-2 py-0.5 font-mono text-[10px] text-violet">
                      {n.interval}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Harmonic Overtone series callout */}
            <div className="mt-6 rounded-2xl border border-bone/10 bg-raised/40 p-4">
              <span className="text-xs font-mono text-bone/60 block">HARMONIC RESONANCE RATIOS:</span>
              <p className="mt-1 font-mono text-xs text-cyan">
                Fundamental (1:1) • Octave (2:1) • Perfect 5th (3:2) • Major 3rd (5:4)
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-bone/60">
                In the 3D space behind, the concentric rings orbit at speeds directly governed by these mathematical ratios.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
