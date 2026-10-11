import { useState } from 'react';
import { useReveal } from '../hooks/useReveal';
import { SAMPLES_LIBRARY, SAMPLE_CATEGORIES, SampleCategory, SampleItem } from '../data/samples';
import { sampleSynth } from '../utils/audioEngine';

export default function SampleLibrarySection() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAuditionId, setActiveAuditionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const r = useReveal<HTMLDivElement>();

  // Filter samples based on category and search query
  const filteredSamples = SAMPLES_LIBRARY.filter((s) => {
    const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.genre.toLowerCase().includes(q) ||
      s.key.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q));

    return matchesCat && matchesQuery;
  });

  // Audition sample sound using native Web Audio synthesis
  const handleAudition = (sample: SampleItem) => {
    setActiveAuditionId(sample.id);

    try {
      if (sample.synthType === 'kick') {
        sampleSynth.kick();
      } else if (sample.synthType === 'snare') {
        sampleSynth.snare();
      } else if (sample.synthType === 'clap') {
        sampleSynth.clap();
      } else if (sample.synthType === 'hihat') {
        sampleSynth.hihat(false);
      } else if (sample.synthType === 'hihat-open') {
        sampleSynth.hihat(true);
      } else if (sample.synthType === 'bass808') {
        sampleSynth.bass808(sample.notes?.[0] || 'C2');
      } else if (sample.synthType === 'reese') {
        sampleSynth.reese(sample.notes?.[0] || 'F2');
      } else if (sample.synthType === 'lead') {
        sampleSynth.synthLead(sample.notes?.[0] || 'C4');
      } else if (sample.synthType === 'chord') {
        sampleSynth.chordStab(sample.notes || ['C3', 'Eb3', 'G3', 'Bb3']);
      } else if (sample.synthType === 'pad') {
        sampleSynth.pad(sample.notes || ['C3', 'G3', 'Eb4']);
      } else if (sample.synthType === 'riser') {
        sampleSynth.riser();
      }
    } catch {
      // ignore
    }

    // Reset visual flash
    setTimeout(() => {
      setActiveAuditionId(null);
    }, 450);
  };

  // Copy sample details / MIDI spec
  const handleCopySpec = (sample: SampleItem) => {
    const text = `${sample.name} [${sample.format}] - Key: ${sample.key}, BPM: ${sample.bpm}. Category: ${sample.category}. AAK Music Production Library.`;
    navigator.clipboard?.writeText(text);
    setCopiedId(sample.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section id="samples" className="relative min-h-[100svh] px-4 py-20 sm:px-6 md:px-12 md:py-36">
      <div ref={r} className="reveal mx-auto min-w-0 max-w-[1600px]">
        {/* Header */}
        <div className="flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3.5 py-1 text-xs font-mono font-medium tracking-widest text-cyan">
              <span>SOUND DESIGN ARCHITECTURE</span>
            </div>
            <h2 className="mt-4 max-w-full whitespace-normal break-words font-display text-3xl font-extrabold leading-[.92] tracking-[-.03em] sm:text-5xl md:text-7xl">
              EDM SAMPLE & <br />
              PRODUCTION VAULT.
            </h2>
          </div>
          <p className="min-w-0 max-w-md text-xs leading-relaxed text-bone/70 sm:text-sm">
            Original browser-synthesized drums, bass, chords, and transitions. These previews use Web Audio synthesis; the project has no imported sample pack files.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-10 flex min-w-0 flex-col justify-between gap-4 border-b border-bone/15 pb-6 lg:flex-row lg:items-center">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`min-h-11 rounded-full px-3.5 py-2 text-xs font-mono font-semibold transition-all ${
                selectedCategory === 'All'
                  ? 'bg-bone text-ink shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                  : 'border border-bone/20 bg-void/50 text-bone/70 hover:border-bone/50 hover:text-bone'
              }`}
            >
              All ({SAMPLES_LIBRARY.length})
            </button>
            {SAMPLE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-11 rounded-full px-3 py-2 text-[11px] font-mono transition-all ${
                  selectedCategory === cat
                    ? 'bg-bone text-ink font-semibold shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                    : 'border border-bone/15 bg-void/40 text-bone/60 hover:border-bone/40 hover:text-bone'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full min-w-0 sm:w-72">
            <input
              type="text"
              placeholder="Search samples, keys, tags…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-bone/20 bg-ink/80 px-4 py-2 pr-12 font-mono text-xs text-bone placeholder:text-bone/40 focus:border-cyan focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear sample search"
                className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center font-mono text-xs text-bone/60 hover:text-bone"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Sample Cards Grid */}
        <div className="mt-8 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredSamples.map((sample) => {
            const isAuditioning = activeAuditionId === sample.id;
            const isCopied = copiedId === sample.id;

            return (
              <div
                key={sample.id}
                className={`flex min-w-0 flex-col justify-between rounded-2xl border p-4 backdrop-blur-xl transition-all duration-300 ${
                  isAuditioning
                    ? 'border-cyan bg-cyan/15 shadow-[0_0_24px_rgba(95,212,255,0.3)] scale-[1.01]'
                    : 'border-bone/15 bg-void/60 hover:border-bone/40'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-bone/10 px-2 py-0.5 font-mono text-[10px] text-cyan">
                      {sample.category}
                    </span>
                    <span title={sample.format} className="font-mono text-[10px] text-bone/50">
                      {sample.format.startsWith('Generated pattern') ? 'PATTERN' : 'SYNTH'}
                    </span>
                  </div>

                  {/* Sample Name */}
                  <h3 className="mt-3 break-words font-display text-base font-bold text-bone">
                    {sample.name}
                  </h3>

                  <p className="mt-1 text-xs leading-relaxed text-bone/70 line-clamp-2">
                    {sample.description}
                  </p>

                  {/* Metadata Row */}
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-bone/10 pt-2 font-mono text-[11px]">
                    <div>
                      <span className="text-bone/40">KEY: </span>
                      <span className="font-semibold text-bone">{sample.key}</span>
                    </div>
                    <div>
                      <span className="text-bone/40">BPM: </span>
                      <span className="font-semibold text-cyan">{sample.bpm}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {sample.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-raised/60 px-1.5 py-0.5 font-mono text-[9px] text-bone/60"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Row */}
                <div className="mt-4 flex items-center justify-between border-t border-bone/10 pt-3">
                  <button
                    onClick={() => handleAudition(sample)}
                    aria-label={`Audition ${sample.name}`}
                    className={`flex min-h-11 items-center gap-2 rounded-lg px-3.5 py-2 font-mono text-xs font-bold transition-all ${
                      isAuditioning
                        ? 'bg-cyan text-ink shadow-[0_0_14px_rgba(95,212,255,0.8)]'
                        : 'border border-cyan/40 bg-cyan/10 text-cyan hover:bg-cyan hover:text-ink'
                    }`}
                  >
                    <span>{isAuditioning ? '■ PLAYING' : '▶ AUDITION'}</span>
                  </button>

                  <button
                    onClick={() => handleCopySpec(sample)}
                    aria-label="Copy sample specs"
                    title="Copy sample specs"
                    className="min-h-11 min-w-11 rounded-lg px-2 font-mono text-[10px] text-bone/60 transition-colors hover:text-cyan"
                  >
                    {isCopied ? 'COPIED ✓' : 'SPECS'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty Search State */}
        {filteredSamples.length === 0 && (
          <div className="mt-12 rounded-2xl border border-bone/15 bg-void/40 p-8 text-center">
            <p className="font-mono text-sm text-bone/60">
              No samples match your current filter criteria: “{searchQuery}”.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="mt-3 font-mono text-xs text-cyan underline"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

