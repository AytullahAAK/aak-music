import { useState } from 'react';
import { useReveal } from '../hooks/useReveal';
import Button from '../components/Button';

const RHYTHM_STEMS = [
  {
    name: '01 SUB KICK',
    freq: '52 Hz PUNCH',
    steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    role: 'Low-frequency pneumatic drive delivering chest-thump energy in EDM and Techno.',
    color: 'bg-cyan',
  },
  {
    name: '02 LAYERED CLAP',
    freq: '1.2 kHz CRACK',
    steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    role: 'Crisp stereo transient on beats 2 and 4 providing the physical head-nod impulse.',
    color: 'bg-amber-400',
  },
  {
    name: '03 ROLLING HI-HATS',
    freq: '8.5 kHz SIZZLE',
    steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    role: 'Micro-delayed 16th-note swing creating fluid velocity and continuous momentum.',
    color: 'bg-violet',
  },
  {
    name: '04 SYNCOPATED PERC',
    freq: '450 Hz TONE',
    steps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0],
    role: 'Off-beat rimshots and organic woodblocks introducing polyrhythmic groove.',
    color: 'bg-emerald-400',
  },
];

export default function RhythmSection() {
  const [selectedStem, setSelectedStem] = useState(0);
  const r = useReveal<HTMLDivElement>();
  const stem = RHYTHM_STEMS[selectedStem];

  return (
    <section id="rhythm" className="relative min-h-[100svh] px-6 py-28 md:px-12 md:py-40">
      <div
        ref={r}
        className="reveal relative mx-auto grid max-w-[1600px] items-center gap-12 lg:grid-cols-12"
      >
        {/* Left Column: 3D Drum Machine HUD & 16-Step Grid */}
        <div className="order-2 lg:order-1 lg:col-span-5">
          <div className="rounded-3xl border border-bone/15 bg-ink/75 p-6 shadow-2xl backdrop-blur-2xl md:p-8">
            <div className="flex items-center justify-between border-b border-bone/15 pb-4">
              <span className="text-xs font-mono text-cyan">AAK-909 GROOVE MATRIX</span>
              <span className="text-xs font-mono text-bone/60">TEMPO: 124.0 BPM</span>
            </div>

            {/* 16-Step Sequencer Grid Visualizer */}
            <div className="mt-6">
              <div className="flex justify-between text-[11px] font-mono text-bone/60 mb-2">
                <span>16-STEP TIMELINE</span>
                <span>BAR 01 // 4/4 TIME</span>
              </div>
              <div className="grid grid-cols-[repeat(8,minmax(0,1fr))] gap-1.5 sm:grid-cols-[repeat(16,minmax(0,1fr))]">
                {stem.steps.map((active, idx) => (
                  <div
                    key={idx}
                    className={`flex h-12 flex-col items-center justify-between rounded-lg p-1 text-[9px] font-mono transition-all duration-300 ${
                      active
                        ? `${stem.color} text-ink font-bold shadow-[0_0_12px_rgba(95,212,255,0.4)]`
                        : 'border border-bone/10 bg-void/60 text-bone/40'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-bone/10 bg-raised/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-bone">{stem.name}</span>
                <span className="text-xs font-mono text-cyan">{stem.freq}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-bone/70">
                {stem.role}
              </p>
            </div>

            <div className="mt-6 flex justify-between border-t border-bone/10 pt-4 text-xs font-mono text-bone/60">
              <span>SWING VALUE: 54.2%</span>
              <span>GROOVE QUANTIZE: 1/16T</span>
            </div>
          </div>
        </div>

        {/* Right Column: Narrative storytelling */}
        <div className="order-1 lg:order-2 lg:col-span-6 lg:col-start-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/10 px-3.5 py-1 text-xs font-mono font-medium tracking-widest text-violet">
            <span>SCENE 03</span>
            <span>//</span>
            <span>RHYTHMIC KINETICS</span>
          </div>

          <h2 className="mt-5 font-display text-4xl font-extrabold leading-[.95] tracking-[-.03em] md:text-7xl">
            PRECISION <br />
            STEP SEQUENCING.
          </h2>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-bone/75">
            Rhythm in electronic music is more than repetitive loops—it is calibrated kinetic motion.
            Every beat is layered across sub-frequency punch, transient acoustic slap, and rolling swing.
          </p>

          {/* Stem selection tabs */}
          <div className="mt-8 space-y-2.5">
            {RHYTHM_STEMS.map((s, idx) => (
              <button
                key={s.name}
                onClick={() => setSelectedStem(idx)}
                className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all duration-300 ${
                  selectedStem === idx
                    ? 'border-cyan bg-cyan/10 shadow-[0_0_20px_-5px_rgba(95,212,255,0.3)]'
                    : 'border-bone/15 bg-void/40 hover:border-bone/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${s.color}`} />
                  <span className="font-mono text-sm font-semibold text-bone">{s.name}</span>
                </div>
                <span className="font-mono text-xs text-bone/60">{s.freq}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 flex gap-4">
            <Button href="#modular">EXPLORE MODULAR SOUND</Button>
            <Button href="#music" variant="ghost">HEAR THE TRACKS</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
