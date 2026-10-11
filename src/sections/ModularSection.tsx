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
    <section id="modular" className="relative min-h-[100svh] px-6 py-28 md:px-12 md:py-40">
      <div
        ref={r}
        className="reveal relative mx-auto grid max-w-[1600px] items-center gap-12 lg:grid-cols-12"
      >
        {/* Left Column: Narrative storytelling */}
        <div className="lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3.5 py-1 text-xs font-mono font-medium tracking-widest text-cyan">
            <span>SCENE 04</span>
            <span>//</span>
            <span>MODULAR SOUND DESIGN</span>
          </div>

          <h2 className="mt-5 font-display text-4xl font-extrabold leading-[.95] tracking-[-.03em] md:text-7xl">
            TENSION & VOLTAGE <br />
            SIGNAL PATHS.
          </h2>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-bone/75">
            Eurorack modular synthesis frees sound from fixed architectures. By routing physical
            patch cables between independent analog modules, we sculpt living, organic electronic textures.
          </p>

          {/* Module Selector */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MODULAR_BLOCKS.map((m, idx) => (
              <button
                key={m.tag}
                onClick={() => setActiveMod(idx)}
                className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all duration-300 ${
                  activeMod === idx
                    ? 'border-cyan bg-cyan/15 text-cyan shadow-[0_0_20px_-6px_rgba(95,212,255,0.4)]'
                    : 'border-bone/15 bg-void/40 text-bone/70 hover:border-bone/50 hover:text-bone'
                }`}
              >
                <span className="font-mono text-base font-bold">{m.tag}</span>
                <span className="mt-1 font-mono text-[10px] uppercase text-bone/60">{m.role}</span>
              </button>
            ))}
          </div>

          {/* Module Description Card */}
          <div className="mt-6 rounded-3xl border border-bone/15 bg-void/70 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-bone/10 pb-3">
              <span className="font-mono text-sm font-semibold text-bone">{mod.name}</span>
              <span className="rounded-full bg-cyan/20 px-3 py-1 font-mono text-[11px] text-cyan">
                {mod.role}
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-bone/75">
              {mod.desc}
            </p>
            <div className="mt-4 flex items-center gap-2 border-t border-bone/10 pt-3 font-mono text-xs text-bone/60">
              <span className="h-2 w-2 rounded-full bg-cyan" />
              <span>ACTIVE PATCH: {mod.cables}</span>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <Button href="#theory">EXPLORE MUSIC THEORY</Button>
            <Button href="#music" variant="ghost">CATALOGUE</Button>
          </div>
        </div>

        {/* Right Column: Signal Flow Telemetry & 3D HUD */}
        <div className="lg:col-span-5 lg:col-start-8">
          <div className="rounded-3xl border border-bone/15 bg-ink/75 p-6 shadow-2xl backdrop-blur-2xl md:p-8">
            <div className="flex items-center justify-between border-b border-bone/15 pb-4">
              <span className="text-xs font-mono text-cyan">EURORACK RACK ROUTING</span>
              <span className="text-xs font-mono text-bone/60">SIGNAL CHAIN: 4 STAGES</span>
            </div>

            {/* Signal Flow Diagram */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan text-xs font-mono font-bold text-ink">
                  01
                </span>
                <div className="flex-1 rounded-xl border border-bone/10 bg-void/50 p-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="font-semibold text-bone">VCO 1 / SUB</span>
                    <span className="text-cyan">PITCH CV (1V/OCT)</span>
                  </div>
                  <p className="text-[11px] text-bone/60 mt-0.5">Raw dual sawtooth waveform output</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet text-xs font-mono font-bold text-ink">
                  02
                </span>
                <div className="flex-1 rounded-xl border border-bone/10 bg-void/50 p-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="font-semibold text-bone">VCF LADDER</span>
                    <span className="text-violet">24dB CUTOFF + RES</span>
                  </div>
                  <p className="text-[11px] text-bone/60 mt-0.5">Frequency subtraction & formant resonance</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-400 text-xs font-mono font-bold text-ink">
                  03
                </span>
                <div className="flex-1 rounded-xl border border-bone/10 bg-void/50 p-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="font-semibold text-bone">VCA AMPLIFIER</span>
                    <span className="text-amber-400">DYNAMIC GATE</span>
                  </div>
                  <p className="text-[11px] text-bone/60 mt-0.5">Envelope-controlled output velocity</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-400 text-xs font-mono font-bold text-ink">
                  04
                </span>
                <div className="flex-1 rounded-xl border border-bone/10 bg-void/50 p-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="font-semibold text-bone">MASTER STEREO</span>
                    <span className="text-emerald-400">+4 dBu LINE OUT</span>
                  </div>
                  <p className="text-[11px] text-bone/60 mt-0.5">Studio monitors & final master bus</p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-bone/10 pt-4 text-xs font-mono text-bone/60">
              <p>
                Look behind this panel at the 3D modular rack: the glowing patch cables transport
                kinetic electricity packets between jacks in real time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

