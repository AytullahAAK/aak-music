import { useState } from 'react';
import { useReveal } from '../hooks/useReveal';
import { GENRE_GUIDES, ANTHEM_ARRANGEMENT } from '../data/composition';

export default function CompositionSection() {
  const [selectedGenreIdx, setSelectedGenreIdx] = useState(0);
  const [selectedBlockIdx, setSelectedBlockIdx] = useState(3); // Default to Drop
  const r = useReveal<HTMLDivElement>();

  const currentGenre = GENRE_GUIDES[selectedGenreIdx];
  const currentBlock = ANTHEM_ARRANGEMENT[selectedBlockIdx];

  return (
    <section id="composition" className="relative min-h-[100svh] px-4 py-20 sm:px-6 md:px-12 md:py-36">
        <div ref={r} className="reveal mx-auto min-w-0 max-w-[1600px]">
        {/* Header */}
        <div className="flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3.5 py-1 text-xs font-mono font-medium tracking-widest text-cyan">
              <span>ELECTRONIC COMPOSITION</span>
            </div>
            <h2 className="mt-4 max-w-full whitespace-normal break-words font-display text-3xl font-extrabold leading-[.92] tracking-[-.03em] sm:text-5xl md:text-7xl">
              SONG CRAFT & <br />
              ARRANGEMENT BLUEPRINT.
            </h2>
          </div>
          <p className="min-w-0 max-w-md text-xs leading-relaxed text-bone/70 sm:text-sm">
            Professional production recipes across key electronic music genres. Explore the anatomy
            of builds, drops, sound design frequency division, and dynamic tension management.
          </p>
        </div>

        {/* 1. INTERACTIVE ANTHEM ARRANGEMENT TIMELINE */}
        <div className="mt-12 rounded-3xl border border-bone/15 bg-ink/80 p-5 shadow-2xl backdrop-blur-2xl sm:p-8">
          <div className="flex flex-col justify-between gap-2 border-b border-bone/10 pb-4 sm:flex-row sm:items-center">
            <div>
              <span className="font-mono text-xs text-cyan">ANTHEM TIMELINE ARCHITECTURE</span>
              <h3 className="font-display text-xl font-bold text-bone sm:text-2xl">
                176-Bar Energy Curve & Structure
              </h3>
            </div>
            <span className="font-mono text-xs text-bone/50">
              CLICK ANY SECTION TO INSPECT STEMS
            </span>
          </div>

          {/* Timeline Block Bar */}
          <div className="mt-6 flex min-w-0 flex-wrap gap-2 md:grid md:grid-cols-7 md:gap-2">
            {ANTHEM_ARRANGEMENT.map((block, idx) => (
              <button
                key={block.name}
                onClick={() => setSelectedBlockIdx(idx)}
                className={`flex min-w-0 flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                  selectedBlockIdx === idx
                    ? `${block.color} ring-2 ring-cyan shadow-lg scale-102`
                    : 'border-bone/15 bg-void/50 text-bone/70 hover:border-bone/40'
                }`}
              >
                <div>
                  <span className="font-mono text-[10px] opacity-75">{block.bars} BARS</span>
                  <p className="mt-1 break-words font-display text-xs font-bold leading-tight sm:text-sm">
                    {block.name}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-current/20 pt-2 font-mono text-[9px]">
                  <span>ENERGY</span>
                  <span className="font-bold">{block.energy}/10</span>
                </div>
              </button>
            ))}
          </div>

          {/* Active Block Inspector */}
          <div className="mt-6 rounded-2xl border border-bone/10 bg-void/60 p-5 backdrop-blur-xl sm:p-6">
            <div className="flex flex-col justify-between gap-2 border-b border-bone/10 pb-3 sm:flex-row sm:items-center">
              <div>
                <span className="font-mono text-xs text-cyan">
                  SECTION {selectedBlockIdx + 1} OF {ANTHEM_ARRANGEMENT.length} • {currentBlock.bars} BARS
                </span>
                <h4 className="font-display text-2xl font-bold text-bone">
                  {currentBlock.name}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-bone/60">Dynamic Intensity:</span>
                <div className="flex gap-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-4 w-2 rounded-sm ${
                        i < currentBlock.energy ? 'bg-cyan' : 'bg-bone/15'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-bone/80 sm:text-sm">
              {currentBlock.description}
            </p>

            {/* Active Stems in this Section */}
            <div className="mt-4">
              <span className="block font-mono text-[10px] uppercase tracking-wider text-bone/50">
                Active Sound Elements & Stems:
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {currentBlock.elements.map((el) => (
                  <span
                    key={el}
                    className="rounded-full border border-bone/15 bg-raised/60 px-3 py-1 font-mono text-xs text-bone/90"
                  >
                    ✓ {el}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. GENRE MASTER BLUEPRINTS */}
        <div className="mt-16">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bone/15 pb-4">
            <span className="font-mono text-xs uppercase tracking-wider text-bone/60">
              Genre Production Blueprints
            </span>
            <span className="font-mono text-xs text-cyan">
              5 ELECTRONIC STYLES
            </span>
          </div>

          {/* Genre Tabs */}
          <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
            {GENRE_GUIDES.map((g, idx) => (
              <button
                key={g.id}
                onClick={() => setSelectedGenreIdx(idx)}
                className={`rounded-full px-5 py-2.5 text-xs font-mono font-bold tracking-wider transition-all ${
                  selectedGenreIdx === idx
                    ? 'bg-cyan text-ink shadow-[0_0_20px_rgba(95,212,255,0.4)]'
                    : 'border border-bone/20 bg-void/50 text-bone/70 hover:border-bone/50 hover:text-bone'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* Active Genre Details Grid */}
          <div className="mt-8 grid min-w-0 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0 rounded-2xl border border-bone/15 bg-void/60 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-cyan">TEMPO & SIGNATURE</span>
                <span className="rounded bg-bone/10 px-2 py-0.5 font-mono text-[11px] text-bone">
                  {currentGenre.bpm}
                </span>
              </div>
              <h4 className="mt-3 font-display text-lg font-bold text-bone">Key Sonic Signature</h4>
              <p className="mt-2 text-xs leading-relaxed text-bone/70 sm:text-sm">
                {currentGenre.keyCharacteristic}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-bone/15 bg-void/60 p-5 backdrop-blur-xl">
              <span className="font-mono text-xs text-violet">LOW-END ARCHITECTURE</span>
              <h4 className="mt-3 font-display text-lg font-bold text-bone">Kick & Bass Relationship</h4>
              <p className="mt-2 text-xs leading-relaxed text-bone/70 sm:text-sm">
                <strong>Kick:</strong> {currentGenre.kickStyle}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-bone/70 sm:text-sm">
                <strong>Bass:</strong> {currentGenre.bassDesign}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-bone/15 bg-void/60 p-5 backdrop-blur-xl">
              <span className="font-mono text-xs text-amber-400">MIXING & HEADROOM</span>
              <h4 className="mt-3 font-display text-lg font-bold text-bone">Lead Hook & Mixing Focus</h4>
              <p className="mt-2 text-xs leading-relaxed text-bone/70 sm:text-sm">
                <strong>Lead:</strong> {currentGenre.leadStyle}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-bone/70 sm:text-sm">
                <strong>Mix:</strong> {currentGenre.mixingFocus}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

