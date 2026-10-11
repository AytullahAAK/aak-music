import { useState } from 'react';
import { useReveal } from '../hooks/useReveal';
import Button from '../components/Button';

const MODULAR_BLOCKS = [
  {
    tag: 'VCO',
    name: 'Voltage-Controlled Oscillator',
    role: 'Raw Tone Generator',
    desc: 'Converts DC electric voltage into oscillating sound waves: sharp saw waves for leads, square waves for hollow bass, and triangles for warm pads.',
    cables: 'OUT -> VCF IN (Luminous Cyan)',
  },
  {
    tag: 'VCF',
    name: 'Voltage-Controlled Filter',
    role: 'Harmonic Sculptor',
    desc: 'The heart of subtractive synthesis. Carves away high frequencies and adds resonant feedback, giving electronic music its vocal, breathing quality.',
    cables: 'MOD <- LFO OUT (Ultraviolet)',
  },
  {
    tag: 'ADSR',
    name: 'Envelope Generator',
    role: 'Dynamic Contour',
    desc: 'Defines how a sound evolves from initial strike to complete silence across four stages: Attack, Decay, Sustain, and Release.',
    cables: 'GATE -> VCA GAIN (Luminous Amber)',
  },
  {
    tag: 'LFO',
    name: 'Low-Frequency Oscillator',
    role: 'Organic Movement',
    desc: 'Cycles below human hearing (0.2 Hz – 15 Hz) to automatically sweep filter cutoffs, modulate pitch vibrato, and create rhythmic pulses.',
    cables: 'RATE -> MULTIPLE DESTINATIONS',
  },
];

export default function ModularSection() {
  const [activeMod, setActiveMod] = useState(0);
  const r = useReveal<HTMLDivElement>();
  const mod = MODULAR_BLOCKS[activeMod];

  return (
    <section id="modular" className="relative min-h-[100svh] px-5 py-20 md:px-12 md:py-40">
      <div
        ref={r}
        className="reveal relative mx-auto grid max-w-[1600px] items-center gap-10 lg:grid-cols-12 lg:gap-12"
      >
        {/* Left Column: Narrative storytelling */}
        <div className="lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-[10px] font-mono font-medium tracking-widest text-cyan sm:px-3.5 sm:text-xs">
            <span>MODULAR SOUND DESIGN</span>
          </div>

          <h2 className="mt-5 font-display text-3xl font-extrabold leading-[.95] tracking-[-.03em] sm:text-4xl md:text-7xl">
            TENSION & VOLTAGE <br />
            SIGNAL PATHS.
          </h2>

          <p className="mt-5 max-w-lg text-sm leading-relaxed text-bone/75 sm:text-base md:mt-6 md:text-lg">
            Eurorack modular synthesis frees sound from fixed architectures. By routing physical
            patch cables between independent analog modules, we sculpt living, organic electronic textures.
          </p>

          {/* Module Selector */}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 md:mt-8">
            {MODULAR_BLOCKS.map((m, idx) => (
              <button
                key={m.tag}
                onClick={() => setActiveMod(idx)}
                className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all duration-300 sm:p-4 ${
                  activeMod === idx
                    ? 'border-cyan bg-cyan/15 text-cyan shadow-[0_0_20px_-6px_rgba(95,212,255,0.4)]'
                    : 'border-bone/15 bg-void/40 text-bone/70 hover:border-bone/50 hover:text-bone'
                }`}
              >
                <span className="font-mono text-sm font-bold sm:text-base">{m.tag}</span>
                <span className="mt-1 font-mono text-[9px] uppercase text-bone/60 sm:text-[10px]">{m.role}</span>
              </button>
            ))}
          </div>

          {/* Module Description Card */}
          <div className="mt-5 rounded-3xl border border-bone/15 bg-void/70 p-4 backdrop-blur-xl sm:mt-6 sm:p-6">
            <div className="flex flex-col gap-2 border-b border-bone/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono text-xs font-semibold text-bone sm:text-sm">{mod.name}</span>
              <span className="rounded-full bg-cyan/20 px-3 py-1 font-mono text-[10px] text-cyan sm:text-[11px]">
                {mod.role}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-bone/75 sm:mt-4 sm:text-sm">
              {mod.desc}
            </p>
            <div className="mt-3 flex items-center gap-2 border-t border-bone/10 pt-3 font-mono text-[10px] text-bone/60 sm:mt-4 sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-cyan" />
              <span>ACTIVE PATCH: {mod.cables}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 md:mt-8 md:gap-4">
            <Button href="#theory">EXPLORE MUSIC THEORY</Button>
            <Button href="#music" variant="ghost">CATALOGUE</Button>
          </div>
        </div>

        {/* Right Column: Signal Flow Telemetry */}
        <div className="lg:col-span-5 lg:col-start-8">
          <div className="rounded-3xl border border-bone/15 bg-ink/75 p-4 shadow-2xl backdrop-blur-2xl sm:p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-bone/15 pb-4">
              <span className="text-[10px] font-mono text-cyan sm:text-xs">EURORACK RACK ROUTING</span>
              <span className="text-[10px] font-mono text-bone/60 sm:text-xs">SIGNAL CHAIN: 4 STAGES</span>
            </div>

            {/* Signal Flow Diagram */}
            <div className="mt-5 space-y-3 sm:mt-6 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cyan text-[10px] font-mono font-bold text-ink sm:h-8 sm:w-8 sm:text-xs">
                  01
                </span>
                <div className="flex-1 rounded-xl border border-bone/10 bg-void/50 p-2.5 sm:p-3">
                  <div className="flex justify-between text-[10px] font-mono sm:text-xs">
                    <span className="font-semibold text-bone">VCO 1 / SUB</span>
                    <span className="text-cyan">PITCH CV (1V/OCT)</span>
                  </div>
                  <p className="text-[9px] text-bone/60 mt-0.5 sm:text-[11px]">Raw dual sawtooth waveform output</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet text-[10px] font-mono font-bold text-ink sm:h-8 sm:w-8 sm:text-xs">
                  02
                </span>
                <div className="flex-1 rounded-xl border border-bone/10 bg-void/50 p-2.5 sm:p-3">
                  <div className="flex justify-between text-[10px] font-mono sm:text-xs">
                    <span className="font-semibold text-bone">VCF LADDER</span>
                    <span className="text-violet">24dB CUTOFF + RES</span>
                  </div>
                  <p className="text-[9px] text-bone/60 mt-0.5 sm:text-[11px]">Frequency subtraction & formant resonance</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-400 text-[10px] font-mono font-bold text-ink sm:h-8 sm:w-8 sm:text-xs">
                  03
                </span>
                <div className="flex-1 rounded-xl border border-bone/10 bg-void/50 p-2.5 sm:p-3">
                  <div className="flex justify-between text-[10px] font-mono sm:text-xs">
                    <span className="font-semibold text-bone">VCA AMPLIFIER</span>
                    <span className="text-amber-400">DYNAMIC GATE</span>
                  </div>
                  <p className="text-[9px] text-bone/60 mt-0.5 sm:text-[11px]">Envelope-controlled output velocity</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-400 text-[10px] font-mono font-bold text-ink sm:h-8 sm:w-8 sm:text-xs">
                  04
                </span>
                <div className="flex-1 rounded-xl border border-bone/10 bg-void/50 p-2.5 sm:p-3">
                  <div className="flex justify-between text-[10px] font-mono sm:text-xs">
                    <span className="font-semibold text-bone">MASTER STEREO</span>
                    <span className="text-emerald-400">+4 dBu LINE OUT</span>
                  </div>
                  <p className="text-[9px] text-bone/60 mt-0.5 sm:text-[11px]">Studio monitors & final master bus</p>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-bone/10 pt-3 text-[10px] font-mono text-bone/60 sm:mt-6 sm:pt-4 sm:text-xs">
              <p>
                Each module in the signal chain transforms the raw waveform — from oscillation
                through filtering to final amplification and stereo output.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
