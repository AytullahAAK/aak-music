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
    <section id="rhythm" className="relative min-h-[100svh] px-5 py-20 md:px-12 md:py-40">
      <div
        ref={r}
        className="reveal relative mx-auto grid max-w-[1600px] items-center gap-10 lg:grid-cols-12 lg:gap-12"
      >
        {/* Left Column: Drum Machine HUD & 16-Step Grid */}
        <div className="order-2 lg:order-1 lg:col-span-5">
          <div className="rounded-3xl border border-bone/15 bg-ink/75 p-4 shadow-2xl backdrop-blur-2xl sm:p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-bone/15 pb-4">
              <span className="text-[10px] font-mono text-cyan sm:text-xs">AAK-909 GROOVE MATRIX</span>
              <span className="text-[10px] font-mono text-bone/60 sm:text-xs">TEMPO: 124.0 BPM</span>
            </div>

            {/* 16-Step Sequencer Grid Visualizer */}
            <div className="mt-5 sm:mt-6">
              <div className="flex justify-between text-[9px] font-mono text-bone/60 mb-2 sm:text-[11px]">
                <span>16-STEP TIMELINE</span>
                <span>BAR 01 // 4/4 TIME</span>
              </div>
              <div className="grid grid-cols-[repeat(8,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(16,minmax(0,1fr))] sm:gap-1.5">
                {stem.steps.map((active, idx) => (
                  <div
                    key={idx}
                    className={`flex h-10 flex-col items-center justify-between rounded-lg p-1 text-[8px] font-mono transition-all duration-300 sm:h-12 sm:text-[9px] ${
                      active
                        ? `${stem.color} text-ink font-bold shadow-[0_0_12px_rgba(95,212,255,0.4)]`
                        : 'border border-bone/10 bg-void/60 text-bone/40'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    <span className="h-1 w-1 rounded-full bg-current opacity-80 sm:h-1.5 sm:w-1.5" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-bone/10 bg-raised/50 p-3 sm:mt-6 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold text-bone sm:text-xs">{stem.name}</span>
                <span className="text-[10px] font-mono text-cyan sm:text-xs">{stem.freq}</span>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-bone/70 sm:text-xs">
                {stem.role}
              </p>
            </div>

            <div className="mt-5 flex justify-between border-t border-bone/10 pt-3 text-[10px] font-mono text-bone/60 sm:mt-6 sm:pt-4 sm:text-xs">
              <span>SWING VALUE: 54.2%</span>
              <span>GROOVE QUANTIZE: 1/16T</span>
            </div>
          </div>
        </div>

        {/* Right Column: Narrative storytelling */}
        <div className="order-1 lg:order-2 lg:col-span-6 lg:col-start-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/10 px-3 py-1 text-[10px] font-mono font-medium tracking-widest text-violet sm:px-3.5 sm:text-xs">
            <span>RHYTHMIC KINETICS</span>
          </div>

          <h2 className="mt-5 font-display text-3xl font-extrabold leading-[.95] tracking-[-.03em] sm:text-4xl md:text-7xl">
            PRECISION <br />
            STEP SEQUENCING.
          </h2>

          <p className="mt-5 max-w-lg text-sm leading-relaxed text-bone/75 sm:text-base md:mt-6 md:text-lg">
            Rhythm in electronic music is more than repetitive loops—it is calibrated kinetic motion.
            Every beat is layered across sub-frequency punch, transient acoustic slap, and rolling swing.
          </p>

          {/* Stem selection tabs */}
          <div className="mt-6 space-y-2 md:mt-8 md:space-y-2.5">
            {RHYTHM_STEMS.map((s, idx) => (
              <button
                key={s.name}
                onClick={() => setSelectedStem(idx)}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all duration-300 sm:p-4 ${
                  selectedStem === idx
                    ? 'border-cyan bg-cyan/10 shadow-[0_0_20px_-5px_rgba(95,212,255,0.3)]'
                    : 'border-bone/15 bg-void/40 hover:border-bone/40'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3 ${s.color}`} />
                  <span className="font-mono text-xs font-semibold text-bone sm:text-sm">{s.name}</span>
                </div>
                <span className="font-mono text-[10px] text-bone/60 sm:text-xs">{s.freq}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3 md:mt-8 md:gap-4">
            <Button href="#modular">EXPLORE MODULAR SOUND</Button>
            <Button href="#music" variant="ghost">HEAR THE TRACKS</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
