import { useState, useRef } from 'react';
import { useReveal } from '../hooks/useReveal';
import Button from '../components/Button';
import {
  CHORDS_CATALOGUE,
  SCALES_CATALOGUE,
  PROGRESSIONS_CATALOGUE,
  ChordItem,
  ScaleItem,
  ProgressionItem,
} from '../data/theory';
import { playSynthChord, playSynthNote, noteToFreq } from '../utils/audioEngine';

// Piano key definition for 2-octave visual keyboard
const PIANO_KEYS = [
  { note: 'C3', isBlack: false, label: 'C' },
  { note: 'Db3', isBlack: true, label: 'C#' },
  { note: 'D3', isBlack: false, label: 'D' },
  { note: 'Eb3', isBlack: true, label: 'Eb' },
  { note: 'E3', isBlack: false, label: 'E' },
  { note: 'F3', isBlack: false, label: 'F' },
  { note: 'Gb3', isBlack: true, label: 'F#' },
  { note: 'G3', isBlack: false, label: 'G' },
  { note: 'Ab3', isBlack: true, label: 'Ab' },
  { note: 'A3', isBlack: false, label: 'A' },
  { note: 'Bb3', isBlack: true, label: 'Bb' },
  { note: 'B3', isBlack: false, label: 'B' },
  { note: 'C4', isBlack: false, label: 'C' },
  { note: 'Db4', isBlack: true, label: 'C#' },
  { note: 'D4', isBlack: false, label: 'D' },
  { note: 'Eb4', isBlack: true, label: 'Eb' },
  { note: 'E4', isBlack: false, label: 'E' },
  { note: 'F4', isBlack: false, label: 'F' },
  { note: 'Gb4', isBlack: true, label: 'F#' },
  { note: 'G4', isBlack: false, label: 'G' },
  { note: 'Ab4', isBlack: true, label: 'Ab' },
  { note: 'A4', isBlack: false, label: 'A' },
  { note: 'Bb4', isBlack: true, label: 'Bb' },
  { note: 'B4', isBlack: false, label: 'B' },
];

export default function TheorySection() {
  const [activeTab, setActiveTab] = useState<'chords' | 'scales' | 'progressions' | 'guide'>('chords');
  const [selectedChordIdx, setSelectedChordIdx] = useState(0);
  const [selectedInversionIdx, setSelectedInversionIdx] = useState(0);
  const [selectedScaleIdx, setSelectedScaleIdx] = useState(0);
  const [selectedProgIdx, setSelectedProgIdx] = useState(0);

  // Progression sequencer playback state
  const [isPlayingProg, setIsPlayingProg] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const progTimer = useRef<number[]>([]);

  const r = useReveal<HTMLDivElement>();

  const currentChord = CHORDS_CATALOGUE[selectedChordIdx];
  const activeInversion = currentChord.inversions[selectedInversionIdx] || currentChord.inversions[0];
  const activeNotes =
    activeTab === 'chords'
      ? activeInversion.notes
      : activeTab === 'scales'
      ? SCALES_CATALOGUE[selectedScaleIdx].notes
      : PROGRESSIONS_CATALOGUE[selectedProgIdx].chordNotes[activeStep ?? 0] || [];

  // Play chord sound
  const handlePlayChord = () => {
    playSynthChord(activeInversion.notes, 1.6);
  };

  // Play progression sequence
  const handlePlayProgression = () => {
    if (isPlayingProg) {
      progTimer.current.forEach((t) => window.clearTimeout(t));
      progTimer.current = [];
      setIsPlayingProg(false);
      setActiveStep(null);
      return;
    }

    const prog = PROGRESSIONS_CATALOGUE[selectedProgIdx];
    setIsPlayingProg(true);
    progTimer.current = [];

    const beatDuration = (60 / prog.bpm) * 2000; // 2 beats per chord

    prog.chordNotes.forEach((notes, step) => {
      const timer = window.setTimeout(() => {
        setActiveStep(step);
        playSynthChord(notes, (beatDuration / 1000) * 0.95);

        if (step === prog.chordNotes.length - 1) {
          const endTimer = window.setTimeout(() => {
            setIsPlayingProg(false);
            setActiveStep(null);
          }, beatDuration);
          progTimer.current.push(endTimer);
        }
      }, step * beatDuration);

      progTimer.current.push(timer);
    });
  };

  return (
    <section id="theory" className="relative min-h-[100svh] px-4 py-20 sm:px-6 md:px-12 md:py-36">
      <div ref={r} className="reveal mx-auto min-w-0 max-w-[1600px]">
        {/* Header */}
        <div className="flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/10 px-3.5 py-1 text-xs font-mono font-medium tracking-widest text-violet">
              <span>HARMONIC ARCHITECTURE</span>
            </div>
            <h2 className="mt-4 max-w-full whitespace-normal break-words font-display text-3xl font-extrabold leading-[.92] tracking-[-.03em] sm:text-5xl md:text-7xl">
              MUSIC THEORY & <br />
              CHORD EXPLORER.
            </h2>
          </div>
          <p className="min-w-0 max-w-md text-xs leading-relaxed text-bone/70 sm:text-sm">
            A comprehensive creative library for electronic music producers. Audition real
            synthesized chords, inspect piano voicings, explore modes, and study EDM harmonic tension.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 flex flex-wrap gap-2 border-b border-bone/15 pb-4 sm:mt-12 sm:gap-3">
          {[
            { id: 'chords', label: 'Chord Explorer & Voicings' },
            { id: 'progressions', label: 'Genre Progressions' },
            { id: 'scales', label: 'Scales & Modes' },
            { id: 'guide', label: 'Voice Leading & Arranging' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as typeof activeTab);
                if (isPlayingProg) {
                  progTimer.current.forEach((t) => window.clearTimeout(t));
                  setIsPlayingProg(false);
                  setActiveStep(null);
                }
              }}
              className={`rounded-full px-4 py-2 text-xs font-mono font-semibold transition-all duration-300 sm:px-5 sm:text-sm ${
                activeTab === tab.id
                  ? 'bg-bone text-ink shadow-[0_0_20px_rgba(255,255,255,0.35)]'
                  : 'border border-bone/20 bg-void/50 text-bone/70 hover:border-bone/50 hover:text-bone'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: CHORD EXPLORER */}
        {activeTab === 'chords' && (
          <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Left: Chord Selector & Details */}
            <div className="min-w-0 lg:col-span-5">
              <span className="block font-mono text-xs uppercase tracking-wider text-bone/50">
                Select Chord to Audition:
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                {CHORDS_CATALOGUE.map((c, idx) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedChordIdx(idx);
                      setSelectedInversionIdx(0);
                    }}
                    className={`rounded-xl px-4 py-2 text-xs font-mono font-bold tracking-wide transition-all ${
                      selectedChordIdx === idx
                        ? 'bg-cyan text-ink shadow-[0_0_20px_rgba(95,212,255,0.4)]'
                        : 'border border-bone/15 bg-void/60 text-bone/80 hover:border-bone/40'
                    }`}
                  >
                    {c.symbol}
                  </button>
                ))}
              </div>

              {/* Inversion Selector */}
              <div className="mt-6">
                <span className="block font-mono text-[11px] uppercase tracking-wider text-bone/50">
                  Voicing / Inversion:
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentChord.inversions.map((inv, idx) => (
                    <button
                      key={inv.label}
                      onClick={() => setSelectedInversionIdx(idx)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-mono transition-colors ${
                        selectedInversionIdx === idx
                          ? 'bg-violet text-bone font-semibold'
                          : 'border border-bone/15 bg-void/40 text-bone/60 hover:text-bone'
                      }`}
                    >
                      {inv.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chord Breakdown Card */}
              <div className="mt-6 min-w-0 rounded-2xl border border-bone/15 bg-void/70 p-4 backdrop-blur-xl sm:p-5">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 border-b border-bone/10 pb-3">
                  <h3 className="font-display text-xl font-bold text-bone">
                    {currentChord.name} ({currentChord.symbol})
                  </h3>
                  <span className="rounded bg-cyan/15 px-2.5 py-0.5 font-mono text-[11px] text-cyan">
                    {currentChord.category}
                  </span>
                </div>
                <p className="mt-3 font-mono text-xs text-cyan">{currentChord.mood}</p>
                <p className="mt-2 text-xs leading-relaxed text-bone/75 sm:text-sm">
                  {currentChord.theory}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-bone/10 pt-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-xs text-bone/60">
                    <span>Voicing:</span>
                    <span className="font-semibold text-bone">
                      {activeInversion.notes.join(' • ')}
                    </span>
                  </div>
                  <Button onClick={handlePlayChord} variant="solid">
                    ▶ PLAY CHORD
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: Interactive Piano Roll Visualizer */}
            <div className="min-w-0 lg:col-span-7">
              <div className="min-w-0 rounded-3xl border border-bone/15 bg-ink/80 p-4 shadow-2xl backdrop-blur-2xl sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bone/15 pb-4">
                  <span className="font-mono text-xs text-cyan">VIRTUAL KEYBOARD VOICING</span>
                  <span className="font-mono text-[11px] text-bone/50">
                    CLICK KEYS TO PLAY NOTES
                  </span>
                </div>

                {/* Interactive Piano Keys Container */}
                <div className="relative mt-6 flex h-44 w-full min-w-0 select-none justify-start overflow-x-auto overscroll-x-contain pb-2 pt-1 sm:h-52">
                  <div className="relative flex h-full min-w-max">
                    {PIANO_KEYS.map((k) => {
                      // Check if key is part of active chord voicing
                      const isActive = activeNotes.some(
                        (n) => n.replace(/\d/, '') === k.label || n === k.note
                      );

                      if (k.isBlack) {
                        return (
                          <button
                            key={k.note}
                            onClick={() => playSynthNote(k.note, 0.7)}
                            title={`${k.note} (${noteToFreq(k.note).toFixed(1)} Hz)`}
                            className={`group absolute z-10 h-[62%] w-6 -translate-x-1/2 rounded-b-md transition-all sm:w-8 ${
                              isActive
                                ? 'bg-cyan text-ink shadow-[0_0_16px_rgba(95,212,255,0.8)]'
                                : 'bg-black/90 text-bone/60 hover:bg-bone/20'
                            }`}
                            style={{
                              left: `${
                                (PIANO_KEYS.filter((p, i) => !p.isBlack && i <= PIANO_KEYS.indexOf(k)).length - 0.5) * 36
                              }px`,
                            }}
                          >
                            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 font-mono text-[8px] font-bold opacity-80">
                              {k.label}
                            </span>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={k.note}
                          onClick={() => playSynthNote(k.note, 0.7)}
                          title={`${k.note} (${noteToFreq(k.note).toFixed(1)} Hz)`}
                          className={`relative flex h-full w-9 flex-col justify-end rounded-b-lg border-r border-bone/20 pb-2 text-center transition-all sm:w-11 ${
                            isActive
                              ? 'bg-violet/80 text-bone shadow-[inset_0_-8px_16px_rgba(134,88,255,0.7)] font-bold'
                              : 'bg-void/70 text-bone/60 hover:bg-bone/10'
                          }`}
                        >
                          <span className="font-mono text-[9px] sm:text-[10px]">
                            {k.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Intervals List */}
                <div className="mt-6 grid grid-cols-2 gap-2 border-t border-bone/10 pt-4 sm:grid-cols-4">
                  {activeInversion.notes.map((n, i) => (
                    <div
                      key={n}
                      className="rounded-xl border border-bone/10 bg-void/60 p-2.5 text-center"
                    >
                      <span className="font-mono text-sm font-bold text-bone">{n}</span>
                      <span className="block font-mono text-[10px] text-cyan">
                        {noteToFreq(n).toFixed(1)} Hz
                      </span>
                      <span className="mt-0.5 block font-mono text-[9px] text-bone/50">
                        {i === 0 ? 'Root' : `Voice ${i + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROGRESSION SEQUENCER */}
        {activeTab === 'progressions' && (
          <div className="mt-8 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PROGRESSIONS_CATALOGUE.map((prog, idx) => (
                <button
                  key={prog.genre}
                  onClick={() => {
                    setSelectedProgIdx(idx);
                    if (isPlayingProg) {
                      progTimer.current.forEach((t) => window.clearTimeout(t));
                      setIsPlayingProg(false);
                      setActiveStep(null);
                    }
                  }}
                  className={`rounded-2xl border p-5 text-left transition-all ${
                    selectedProgIdx === idx
                      ? 'border-cyan bg-cyan/10 shadow-[0_0_24px_rgba(95,212,255,0.25)]'
                      : 'border-bone/15 bg-void/50 hover:border-bone/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-bone/10 px-2 py-0.5 font-mono text-[10px] text-cyan">
                      {prog.genre}
                    </span>
                    <span className="font-mono text-xs text-bone/50">{prog.bpm} BPM</span>
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold text-bone">{prog.roman}</h3>
                  <p className="mt-1 font-mono text-xs text-violet">{prog.key}</p>
                </button>
              ))}
            </div>

            {/* Selected Progression Player Card */}
            {(() => {
              const prog = PROGRESSIONS_CATALOGUE[selectedProgIdx];
              return (
                <div className="rounded-3xl border border-bone/15 bg-ink/80 p-6 backdrop-blur-2xl sm:p-8">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-cyan">{prog.genre} PROGRESSION</span>
                        <span className="text-bone/40">•</span>
                        <span className="font-mono text-xs text-bone/60">{prog.bpm} BPM</span>
                      </div>
                      <h3 className="mt-1 font-display text-2xl font-extrabold text-bone sm:text-3xl">
                        {prog.roman} in {prog.key}
                      </h3>
                    </div>
                    <Button onClick={handlePlayProgression} variant="solid">
                      {isPlayingProg ? '⏹ STOP SEQUENCE' : '▶ AUDITION PROGRESSION'}
                    </Button>
                  </div>

                  <p className="mt-4 max-w-2xl text-xs leading-relaxed text-bone/70 sm:text-sm">
                    {prog.description}
                  </p>

                  {/* 4 Chords Sequence Visualizer */}
                  <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {prog.chords.map((chordName, step) => (
                      <div
                        key={chordName}
                        className={`rounded-2xl border p-4 text-center transition-all duration-300 ${
                          activeStep === step
                            ? 'border-cyan bg-cyan/20 scale-105 shadow-[0_0_24px_rgba(95,212,255,0.4)]'
                            : 'border-bone/15 bg-void/60 text-bone/80'
                        }`}
                      >
                        <span className="block font-mono text-[10px] text-bone/50">
                          BAR {step + 1}
                        </span>
                        <h4 className="mt-1 font-display text-xl font-bold text-bone">
                          {chordName}
                        </h4>
                        <span className="mt-2 block font-mono text-[10px] text-cyan">
                          {prog.chordNotes[step].join(' • ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: SCALES & MODES */}
        {activeTab === 'scales' && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SCALES_CATALOGUE.map((scale, idx) => (
              <div
                key={scale.name}
                className="flex flex-col justify-between rounded-2xl border border-bone/15 bg-void/60 p-5 backdrop-blur-xl transition hover:border-cyan/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-bone">{scale.name}</span>
                    <span className="rounded bg-violet/20 px-2 py-0.5 font-mono text-[10px] text-violet">
                      {scale.mode}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-cyan">{scale.formula}</p>
                  <p className="mt-3 text-xs leading-relaxed text-bone/70">{scale.description}</p>
                  <p className="mt-2 text-[11px] font-mono text-bone/50">Mood: {scale.mood}</p>
                </div>

                <div className="mt-6 border-t border-bone/10 pt-4">
                  <span className="block font-mono text-[10px] text-bone/40">NOTES (C ROOT):</span>
                  <p className="mt-1 font-mono text-xs font-semibold text-bone">
                    {scale.notes.join(' • ')}
                  </p>
                  <button
                    onClick={() => {
                      scale.notes.forEach((n, i) => {
                        window.setTimeout(() => playSynthNote(n, 0.4), i * 180);
                      });
                    }}
                    className="mt-3 w-full rounded-lg border border-bone/20 py-1.5 font-mono text-xs font-semibold text-bone hover:border-cyan hover:text-cyan transition-colors"
                  >
                    ▶ PLAY SCALE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: THEORY GUIDE (VOICE LEADING, BASSLINES & ARRANGEMENT) */}
        {activeTab === 'guide' && (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-bone/15 bg-void/60 p-6 backdrop-blur-xl">
              <span className="rounded bg-cyan/15 px-2.5 py-1 font-mono text-[10px] text-cyan">
                PRINCIPLE 01
              </span>
              <h3 className="mt-3 font-display text-xl font-bold text-bone">
                Voice Leading & Smooth Inversions
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-bone/75 sm:text-sm">
                Professional electronic music avoids jumping octaves erratically between chords.
                By inverting chord notes so the top voice moves by step (1-2 semitones), transitions
                feel silky, cinematic, and cohesive.
              </p>
              <div className="mt-4 rounded-xl bg-ink/60 p-3 font-mono text-xs text-bone/70 border border-bone/10">
                Rule: Keep common notes static in the same octave; move others to the nearest neighbor.
              </div>
            </div>

            <div className="rounded-2xl border border-bone/15 bg-void/60 p-6 backdrop-blur-xl">
              <span className="rounded bg-violet/15 px-2.5 py-1 font-mono text-[10px] text-violet">
                PRINCIPLE 02
              </span>
              <h3 className="mt-3 font-display text-xl font-bold text-bone">
                Bassline Construction & Root Anchoring
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-bone/75 sm:text-sm">
                While upper chords can feature 9ths, 11ths, and suspensions, sub-bass (20-90 Hz)
                must almost always anchor the fundamental root note. Use octave jumps and syncopated
                16th notes to create rolling groove without harmonic muddiness.
              </p>
              <div className="mt-4 rounded-xl bg-ink/60 p-3 font-mono text-xs text-bone/70 border border-bone/10">
                Tip: High-pass all chord layers at 120-150 Hz to leave 100% clean headroom for the sub-kick and bass.
              </div>
            </div>

            <div className="rounded-2xl border border-bone/15 bg-void/60 p-6 backdrop-blur-xl">
              <span className="rounded bg-amber-400/15 px-2.5 py-1 font-mono text-[10px] text-amber-400">
                PRINCIPLE 03
              </span>
              <h3 className="mt-3 font-display text-xl font-bold text-bone">
                Harmonic Tension & Resolution
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-bone/75 sm:text-sm">
                Electronic builds thrive on harmonic instability (sus4 chords, dominant 7ths, leading
                tones). When the build reaches its peak, holding the tension before resolving forcefully
                to the minor tonic root in the drop releases maximum dopamine.
              </p>
              <div className="mt-4 rounded-xl bg-ink/60 p-3 font-mono text-xs text-bone/70 border border-bone/10">
                Formula: Dissonance creates momentum; resolution delivers impact.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
