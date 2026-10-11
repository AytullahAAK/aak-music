import { useEffect, useRef, useState } from 'react';
import Button from '../components/Button';
import {
  createStarterComposition, encodeLoopMidi, generateBassline, generateChords, generateLoop,
  generateMelody, generateRhythm, GENRES, KEYS, LANES, midiNoteName, parseLoopDescription,
  resizeLoop, retuneLoop, SCALES,
} from '../utils/loopPatterns';
import type { LaneId, LoopComposition, ScaleName } from '../utils/loopPatterns';
import { fadeLoopAudio, prepareLoopAudio, scheduleLoopStep } from '../utils/loopAudio';

const STORAGE_KEY = 'aak-loop-studio-project-v1';
const panel = 'rounded-2xl border border-bone/10 bg-raised/45 p-4 sm:p-5';
const smallButton = 'min-h-11 rounded-lg border border-bone/15 px-3 text-xs font-mono transition hover:border-cyan hover:text-cyan';

export default function LoopStudio() {
  const [composition, setComposition] = useState<LoopComposition>(createStarterComposition);
  const [running, setRunning] = useState(false);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [prompt, setPrompt] = useState('Dark melodic techno at 126 BPM in F minor with a powerful kick, rolling bass and atmospheric chords.');
  const [message, setMessage] = useState('');
  const [audioError, setAudioError] = useState('');
  const compositionRef = useRef(composition);
  const playheadTimers = useRef(new Set<number>());
  compositionRef.current = composition;

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    let scheduler = 0;
    let cursor = 0;
    prepareLoopAudio().then((audioContext) => {
      if (cancelled) return;
      let nextAudioTime = audioContext.currentTime + 0.04;
      const scheduleAhead = () => {
        const lookAhead = audioContext.currentTime + 0.14;
        while (nextAudioTime < lookAhead) {
          const current = compositionRef.current;
          const total = current.bars * 16;
          cursor %= total;
          const step = cursor;
          const at = nextAudioTime;
          scheduleLoopStep(current, step, at);
          const timer = window.setTimeout(() => {
            playheadTimers.current.delete(timer);
            if (!cancelled) setPlayhead(step);
          }, Math.max(0, (at - audioContext.currentTime) * 1000));
          playheadTimers.current.add(timer);
          nextAudioTime += 60 / Math.max(40, current.bpm) / 4;
          cursor = (cursor + 1) % total;
        }
      };
      scheduleAhead();
      scheduler = window.setInterval(scheduleAhead, 25);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setAudioError(error instanceof Error ? error.message : 'Could not start audio.');
      setRunning(false);
    });
    return () => {
      cancelled = true;
      if (scheduler) window.clearInterval(scheduler);
      for (const timer of playheadTimers.current) window.clearTimeout(timer);
      playheadTimers.current.clear();
      fadeLoopAudio(true);
    };
  }, [running]);

  const update = (next: (current: LoopComposition) => LoopComposition) => setComposition((current) => next(current));
  const start = async () => {
    try {
      await prepareLoopAudio();
      fadeLoopAudio(false);
      setAudioError('');
      setRunning(true);
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'This browser could not start audio.');
    }
  };
  const stop = () => {
    setRunning(false);
    setPlayhead(null);
    fadeLoopAudio(true);
  };
  const generate = () => {
    update((current) => generateLoop(current, current.seed + 1));
    setMessage('Generated a new loop from the current style, key, scale, and density.');
  };
  const randomize = () => {
    update((current) => generateLoop({
      ...current,
      genre: GENRES[(current.seed * 7 + 3) % GENRES.length].id,
      bpm: 70 + ((current.seed * 37) % 111),
      key: KEYS[(current.seed * 5 + 2) % KEYS.length],
      scale: SCALES[(current.seed * 3 + 1) % SCALES.length],
      density: 0.28 + ((current.seed * 13) % 61) / 100,
      mood: ['neutral', 'dark', 'bright', 'energetic', 'atmospheric'][current.seed % 5] as LoopComposition['mood'],
      seed: current.seed + 1,
    }, current.seed + 1));
    setMessage('Randomized the full loop. The seed and all settings are saved with the pattern.');
  };
  const applyGenre = (genreId: string) => update((current) => {
    const preset = GENRES.find((item) => item.id === genreId)!;
    return generateLoop({ ...current, genre: preset.id, bpm: preset.bpm }, current.seed + 1);
  });
  const applyKey = (key: string) => update((current) => retuneLoop(current, key, current.scale));
  const applyScale = (scale: ScaleName) => update((current) => retuneLoop(current, current.key, scale));
  const applyDensity = (density: number) => update((current) => {
    const next = { ...current, density };
    const rhythm = generateRhythm(next, current.seed + 1);
    const bass = generateBassline(rhythm, current.seed + 2);
    return generateMelody(bass, current.seed + 3);
  });
  const applyBars = (bars: number) => update((current) => generateLoop(resizeLoop(current, bars), current.seed + 1));
  const toggleStep = (lane: LaneId, step: number) => update((current) => {
    const pattern = current.tracks[lane];
    const enabled = !pattern.steps[step];
    const notes = pattern.notes.slice();
    if (enabled && ['bass', 'chords', 'melody'].includes(lane) && !notes[step]) {
      const source = pattern.notes.find((note) => note?.length)?.[0] ?? (lane === 'bass' ? 36 : 60);
      notes[step] = lane === 'chords' ? [source, source + 3, source + 7] : [source];
    }
    if (!enabled) notes[step] = null;
    return { ...current, tracks: { ...current.tracks, [lane]: { ...pattern, steps: pattern.steps.map((value, index) => index === step ? enabled : value), notes } } };
  });
  const toggleMute = (lane: LaneId) => update((current) => ({
    ...current,
    tracks: { ...current.tracks, [lane]: { ...current.tracks[lane], muted: !current.tracks[lane].muted } },
  }));
  const toggleSolo = (lane: LaneId) => update((current) => ({ ...current, solo: current.solo === lane ? null : lane }));
  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(composition));
      setMessage('Loop saved in this browser on this device.');
    } catch {
      setMessage('This browser could not save the loop. Check its local storage settings.');
    }
  };
  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return setMessage('No saved Loop Studio project was found in this browser.');
      const saved = JSON.parse(raw) as LoopComposition;
      if (!saved.tracks || !LANES.every(({ id }) => Array.isArray(saved.tracks[id]?.steps) && Array.isArray(saved.tracks[id]?.notes))) throw new Error('Invalid project data');
      setComposition(resizeLoop(saved, saved.bars));
      setMessage('Saved loop reloaded.');
    } catch {
      setMessage('The saved project could not be loaded.');
    }
  };
  const exportMidi = () => {
    const bytes = encodeLoopMidi(composition);
    const midiBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(midiBuffer).set(bytes);
    const url = URL.createObjectURL(new Blob([midiBuffer], { type: 'audio/midi' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `aak-loop-${composition.key}-${composition.bpm}bpm.mid`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Exported a Standard MIDI File with tempo, drum, bass, chord, and melody events.');
  };
  const generateFromPrompt = () => {
    update((current) => parseLoopDescription(prompt, current));
    setMessage('Applied the BPM, genre, key, scale, mood, build, and density details recognized in your description.');
  };
  const clear = () => update((current) => ({
    ...current,
    solo: null,
    progression: [],
    tracks: Object.fromEntries(LANES.map(({ id }) => [id, { ...current.tracks[id], steps: Array(current.bars * 16).fill(false), notes: Array(current.bars * 16).fill(null) }])) as LoopComposition['tracks'],
  }));

  const totalSteps = composition.bars * 16;
  const progression = Array.from({ length: composition.bars }, (_, bar) => composition.tracks.chords.notes[bar * 16]?.[0])
    .filter((note): note is number => typeof note === 'number');

  return (
    <section id="studio" aria-labelledby="studio-heading" className="relative px-4 py-20 sm:px-6 sm:py-24 md:px-12">
      <div className="mx-auto min-w-0 max-w-[1600px]">
        <div className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-xs font-mono uppercase tracking-[.24em] text-cyan">Create in the browser · no sample pack required</p>
            <h2 id="studio-heading" className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl">AAK Beat Lab</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bone/65 sm:text-base">A playable step sequencer with original synthesized drums, bass, chords, and melody. Patterns stay editable while the audio clock runs.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={generate} variant="solid">GENERATE LOOP</Button>
            <button className={smallButton} onClick={randomize}>RANDOMIZE</button>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,.8fr)]">
          <div className="min-w-0 space-y-4">
            <div className={`${panel} flex min-w-0 flex-wrap items-center gap-3`}>
              {running ? <button className="min-h-11 rounded-lg bg-cyan px-4 text-sm font-bold text-ink" onClick={stop}>STOP</button> : <button className="min-h-11 rounded-lg bg-cyan px-4 text-sm font-bold text-ink" onClick={() => void start()}>START LOOP</button>}
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-bone/15 px-3 text-xs font-mono">
                <span>BPM</span><input aria-label="Tempo in BPM" type="number" min="40" max="220" value={composition.bpm} onChange={(event) => update((current) => ({ ...current, bpm: Math.max(40, Math.min(220, Number(event.target.value) || 40)) }))} className="w-14 bg-transparent text-center text-sm text-bone outline-none" />
              </label>
              <select aria-label="Genre preset" value={composition.genre} onChange={(event) => applyGenre(event.target.value)} className="min-h-11 min-w-40 rounded-lg border border-bone/15 bg-ink px-3 text-xs text-bone">
                {GENRES.map((genre) => <option key={genre.id} value={genre.id}>{genre.label}</option>)}
              </select>
              <select aria-label="Musical key" value={composition.key} onChange={(event) => applyKey(event.target.value)} className="min-h-11 rounded-lg border border-bone/15 bg-ink px-3 text-xs text-bone">
                {KEYS.map((key) => <option key={key} value={key}>{key}</option>)}
              </select>
              <select aria-label="Musical scale" value={composition.scale} onChange={(event) => applyScale(event.target.value as ScaleName)} className="min-h-11 rounded-lg border border-bone/15 bg-ink px-3 text-xs capitalize text-bone">
                {SCALES.map((scale) => <option key={scale} value={scale}>{scale}</option>)}
              </select>
              <select aria-label="Loop length in bars" value={composition.bars} onChange={(event) => applyBars(Number(event.target.value))} className="min-h-11 rounded-lg border border-bone/15 bg-ink px-3 text-xs text-bone">
                {[1, 2, 4].map((bars) => <option key={bars} value={bars}>{bars} {bars === 1 ? 'bar' : 'bars'}</option>)}
              </select>
              <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-bone/55"><span>SEED</span><span className="text-bone/80">{composition.seed}</span>{playhead !== null && <span className="text-cyan">STEP {playhead + 1}/{totalSteps}</span>}</div>
            </div>

            <div className={`${panel} min-w-0`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-xs font-mono uppercase tracking-widest text-bone/60">Pattern density</p><p className="mt-1 text-[11px] text-bone/45">Density and build affect newly generated notes.</p></div>
                <div className="flex w-full max-w-xs items-center gap-3 sm:w-56"><input aria-label="Pattern density" type="range" min="0.1" max="0.95" step="0.01" value={composition.density} onChange={(event) => applyDensity(Number(event.target.value))} className="w-full accent-cyan" /><span className="w-10 text-right text-xs font-mono text-cyan">{Math.round(composition.density * 100)}%</span></div>
              </div>
              <div className="overflow-x-auto overscroll-x-contain pb-2">
                <div className="min-w-max">
                  <div className="grid items-end gap-1 pb-2" style={{ gridTemplateColumns: `10.5rem repeat(${totalSteps}, 3rem)` }}>
                    <span className="sticky left-0 z-10 bg-raised/90 py-2 text-[10px] font-mono uppercase text-bone/45">Instrument / step</span>
                    {Array.from({ length: totalSteps }, (_, index) => <span key={index} className={`text-center text-[9px] font-mono ${index % 4 === 0 ? 'text-bone/70' : 'text-bone/25'}`}>{index % 4 === 0 ? (index % 16) / 4 + 1 : ''}</span>)}
                  </div>
                  <div className="space-y-1.5">
                    {LANES.map((lane) => {
                      const pattern = composition.tracks[lane.id];
                      return <div key={lane.id} className="grid items-center gap-1" style={{ gridTemplateColumns: `10.5rem repeat(${totalSteps}, 3rem)` }}>
                        <div className={`sticky left-0 z-10 flex h-10 items-center gap-1.5 border-r border-bone/10 bg-ink pr-2 ${pattern.muted ? 'opacity-45' : ''}`}>
                          <span className="min-w-0 flex-1 truncate text-xs font-medium">{lane.label}</span>
                          <button aria-label={`${pattern.muted ? 'Unmute' : 'Mute'} ${lane.label}`} aria-pressed={pattern.muted} onClick={() => toggleMute(lane.id)} className={`grid h-11 w-9 place-items-center rounded text-[9px] font-mono ${pattern.muted ? 'bg-rose-300/15 text-rose-200' : 'text-bone/45 hover:text-bone'}`}>M</button>
                          <button aria-label={`${composition.solo === lane.id ? 'Unsolo' : 'Solo'} ${lane.label}`} aria-pressed={composition.solo === lane.id} onClick={() => toggleSolo(lane.id)} className={`grid h-11 w-9 place-items-center rounded text-[9px] font-mono ${composition.solo === lane.id ? 'bg-cyan/20 text-cyan' : 'text-bone/45 hover:text-bone'}`}>S</button>
                        </div>
                        {pattern.steps.map((active, step) => <button
                          key={step}
                          type="button"
                          onClick={() => toggleStep(lane.id, step)}
                          aria-label={`${lane.label}, step ${step + 1}${active ? ', active' : ', inactive'}`}
                          aria-pressed={active}
                          title={pattern.notes[step]?.map(midiNoteName).join(' ')}
                          className={`h-11 w-11 rounded-md border transition-colors ${playhead === step ? 'ring-2 ring-white ring-offset-1 ring-offset-ink' : ''} ${active ? 'border-cyan/70 bg-cyan/75 shadow-[inset_0_-3px_0_rgb(0_0_0/.18)]' : step % 4 === 0 ? 'border-bone/20 bg-bone/[.06] hover:border-cyan/60' : 'border-bone/10 bg-bone/[.025] hover:border-cyan/45'} ${pattern.muted || (composition.solo && composition.solo !== lane.id) ? 'opacity-35' : ''}`}
                        />)}
                      </div>;
                    })}
                  </div>
                </div>
              </div>
              {progression.length > 0 && <p className="mt-3 text-[11px] text-bone/50">Chord roots: <span className="text-bone/75">{progression.map(midiNoteName).join(' · ')}</span> <span className="text-bone/40">(bar starts)</span></p>}
            </div>
          </div>

          <aside className="min-w-0 space-y-4">
            <div className={`${panel} min-w-0`}>
              <p className="text-xs font-mono uppercase tracking-widest text-cyan">Describe a loop</p>
              <p className="mt-2 text-xs leading-5 text-bone/55">Local rules read supported genre names, BPM, key/scale, mood, build-up, density words, and bar count. No language model or API key is used.</p>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} aria-label="Describe the loop you want" className="mt-4 w-full resize-y rounded-xl border border-bone/15 bg-ink/70 p-3 text-sm leading-6 text-bone placeholder:text-bone/40 focus:border-cyan focus:outline-none" placeholder="Describe the loop you want…" />
              <button className="mt-3 min-h-11 w-full rounded-lg border border-cyan/40 px-4 text-xs font-mono text-cyan transition hover:bg-cyan/10" onClick={generateFromPrompt}>GENERATE FROM DESCRIPTION</button>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className={smallButton} onClick={() => update((current) => generateChords(current, current.seed + 1))}>NEW CHORDS</button>
                <button className={smallButton} onClick={() => update((current) => generateRhythm(current, current.seed + 1))}>NEW RHYTHM</button>
                <button className={smallButton} onClick={() => update((current) => generateBassline(current, current.seed + 1))}>NEW BASSLINE</button>
                <button className={smallButton} onClick={() => update((current) => generateMelody(current, current.seed + 1))}>NEW MELODY</button>
                <button className={smallButton} onClick={clear}>CLEAR PATTERN</button>
              </div>
            </div>
            <div className={`${panel} min-w-0`}>
              <p className="text-xs font-mono uppercase tracking-widest text-bone/65">Project and export</p>
              <p className="mt-2 text-xs leading-5 text-bone/55">Save and reload in this browser. MIDI export carries the tempo and all enabled pattern notes into a standard .mid file.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className={smallButton} onClick={save}>SAVE LOOP</button>
                <button className={smallButton} onClick={load}>LOAD LOOP</button>
                <button className="col-span-2 min-h-11 rounded-lg bg-violet/80 px-3 text-xs font-bold text-white transition hover:bg-violet" onClick={exportMidi}>EXPORT MIDI</button>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-bone/45">Drums, bass, chords, and lead are synthesized in the browser with Web Audio. No bundled or third-party samples are used by this studio.</p>
            </div>
            {audioError && <p role="alert" className="rounded-xl border border-rose-300/25 bg-rose-300/5 p-4 text-sm text-rose-100">{audioError}</p>}
            {message && <p role="status" className="rounded-xl border border-cyan/20 bg-cyan/5 p-4 text-xs leading-5 text-bone/75">{message}</p>}
          </aside>
        </div>
      </div>
    </section>
  );
}
