import { useState } from 'react';
import { useReveal } from '../hooks/useReveal';
import Button from '../components/Button';

const SYNTH_PRESETS = [
  {
    id: 'warmth',
    name: 'Analog Warmth',
    vco: 'Dual Sawtooth + Sub',
    cutoff: '1,850 Hz',
    res: '28%',
    desc: 'Rich analog detuning with smooth low-pass rolloff, engineered for cinematic basslines.',
  },
  {
    id: 'fm',
    name: 'Wavetable FM',
    vco: 'Sine -> Complex FM',
    cutoff: '4,200 Hz',
    res: '65%',
    desc: 'Cross-modulated digital carrier wave producing crisp metallic overtones and bell transients.',
  },
  {
    id: 'acid',
    name: 'Acid Resonance',
    vco: 'Square Wave + Overdrive',
    cutoff: '850 Hz',
    res: '88%',
    desc: 'Self-oscillating 4-pole filter circuit creating piercing squelch and aggressive punch.',
  },
];

export default function SynthSection() {
  const [activePreset, setActivePreset] = useState(0);
  const r = useReveal<HTMLDivElement>();
  const preset = SYNTH_PRESETS[activePreset];

  return (
    <section id="synthesis" className="relative min-h-[100svh] px-5 py-20 md:px-12 md:py-40">
      <div
        ref={r}
        className="reveal relative mx-auto grid max-w-[1600px] items-center gap-10 lg:grid-cols-12 lg:gap-12"
      >
        {/* Left Column: Narrative storytelling */}
        <div className="lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-[10px] font-mono font-medium tracking-widest text-cyan sm:px-3.5 sm:text-xs">
            <span>SYNTHESIS ARCHITECTURE</span>
          </div>

          <h2 className="mt-5 font-display text-3xl font-extrabold leading-[.95] tracking-[-.03em] sm:text-4xl md:text-7xl">
            SCULPTING <br />
            PURE FREQUENCY.
          </h2>

          <p className="mt-5 max-w-lg text-sm leading-relaxed text-bone/75 sm:text-base md:mt-6 md:text-lg">
            Every AAK Music production originates inside tactile analog circuits.
            From deep sub-oscillators to shimmery overtone top-end, explore how
            waveforms are shaped into cinematic anthems.
          </p>

          {/* Preset Selector */}
          <div className="mt-6 md:mt-8">
            <p className="text-[10px] font-mono uppercase tracking-wider text-bone/60 sm:text-xs">
              Select Sound Engine Profile:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SYNTH_PRESETS.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setActivePreset(idx)}
                  className={`rounded-full px-4 py-2 text-[10px] font-mono font-semibold tracking-wider transition-all duration-300 sm:px-5 sm:py-2.5 sm:text-xs ${
                    activePreset === idx
                      ? 'bg-cyan text-ink shadow-[0_0_24px_-6px_rgba(95,212,255,0.7)]'
                      : 'border border-bone/20 bg-void/50 text-bone/80 hover:border-bone/60'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sound Profile Details */}
          <div className="mt-6 rounded-2xl border border-bone/15 bg-void/70 p-4 backdrop-blur-xl sm:p-6 md:mt-8">
            <div className="grid grid-cols-3 gap-3 border-b border-bone/10 pb-4 text-[10px] font-mono sm:gap-4 sm:text-xs">
              <div>
                <span className="text-bone/50 block">OSCILLATOR</span>
                <span className="mt-1 block font-semibold text-bone text-[10px] sm:text-xs">{preset.vco}</span>
              </div>
              <div>
                <span className="text-bone/50 block">CUTOFF</span>
                <span className="mt-1 font-semibold text-cyan">{preset.cutoff}</span>
              </div>
              <div>
                <span className="text-bone/50 block">RESONANCE</span>
                <span className="mt-1 font-semibold text-violet">{preset.res}</span>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-bone/70 sm:text-sm">
              {preset.desc}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 md:mt-8 md:gap-4">
            <Button href="#rhythm">EXPLORE RHYTHM ENGINE</Button>
            <Button href="#music" variant="ghost">LISTEN TO TRACKS</Button>
          </div>
        </div>

        {/* Right Column: Instrument Telemetry & HUD */}
        <div className="lg:col-span-5 lg:col-start-8">
          <div className="relative rounded-3xl border border-bone/15 bg-ink/75 p-5 shadow-2xl backdrop-blur-2xl sm:p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-bone/15 pb-4">
              <span className="text-[10px] font-mono text-cyan sm:text-xs">PRO-8 VIRTUAL INTERFACE</span>
              <span className="flex items-center gap-2 text-[10px] font-mono text-bone/60 sm:text-xs">
                <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
                INTERFACE ACTIVE
              </span>
            </div>

            <div className="mt-5 space-y-3 text-[10px] font-mono sm:mt-6 sm:space-y-4 sm:text-xs">
              <div className="flex justify-between border-b border-bone/10 pb-2">
                <span className="text-bone/60">ENGINE TYPE</span>
                <span className="text-bone font-medium">ANALOG SUBTRACTIVE</span>
              </div>
              <div className="flex justify-between border-b border-bone/10 pb-2">
                <span className="text-bone/60">PLAYABLE OCTAVES</span>
                <span className="text-bone font-medium">25-KEY VELOCITY MATRIX</span>
              </div>
              <div className="flex justify-between border-b border-bone/10 pb-2">
                <span className="text-bone/60">HARMONIC SCALE</span>
                <span className="text-bone font-medium">C MINOR (AEOLIAN)</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-bone/60">SAMPLE RATE</span>
                <span className="text-cyan font-medium">44.1 kHz / 24-BIT</span>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-bone/10 bg-raised/50 p-3 sm:mt-6 sm:p-4">
              <p className="text-[10px] leading-relaxed text-bone/60 sm:text-xs">
                The synthesizer keys map to the C Minor 9 sequence. Each preset profiles
                a different timbral approach — from warm analog pads to aggressive acid squelch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
