import { usePointerShift } from '../hooks/usePointerShift';
import Button from '../components/Button';
import { useParallax } from '../hooks/useParallax';
import { usePlayer } from '../hooks/usePlayer';
import Logo from '../components/Logo';

export default function Hero() {
  const bg = useParallax<HTMLDivElement>(-0.2);
  const tt = usePointerShift<HTMLHeadingElement>(3);
  const { playing, toggle, play } = usePlayer();

  return (
    <section className="relative flex min-h-[100svh] items-end overflow-hidden px-6 pb-20 pt-32 md:px-12 md:pb-28">
      {/* Cinematic Atmospheric Lighting Layer */}
      <div
        ref={bg}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-0 -top-[10%] h-[120%]"
      >
        <div
          className="drift absolute inset-0 opacity-70"
          style={{
            backgroundSize: '160% 160%',
            backgroundImage:
              'radial-gradient(70% 60% at 72% 28%, rgb(var(--accent) / var(--glow-a)), transparent 65%), radial-gradient(50% 50% at 12% 85%, rgb(var(--accent2) / calc(var(--glow-a) * .4)), transparent 70%)',
          }}
        />
        <div
          className="sway absolute -inset-[30%] opacity-40"
          style={{
            backgroundImage:
              'repeating-conic-gradient(from 172deg at 72% 108%, rgb(var(--accent) / var(--beam-a)) 0 1deg, transparent 1deg 6.5deg)',
            WebkitMaskImage: 'linear-gradient(to top, #000 5%, transparent 70%)',
            maskImage: 'linear-gradient(to top, #000 5%, transparent 70%)',
          }}
        />
      </div>

      {/* Vignette Shadow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent"
      />

      <div className="relative z-10 mx-auto w-full max-w-[1600px]">
        {/* Scene Indicator & Badge */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3.5 py-1 text-xs font-mono font-medium tracking-widest text-cyan">
            <span>SCENE 01</span>
            <span>//</span>
            <span>AAK MUSIC IDENTITY</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-bone/15 bg-void/60 px-3.5 py-1 text-xs font-mono text-bone/70 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>INTERACTIVE 3D REALM ACTIVE</span>
          </div>
        </div>

        {/* Hero Title */}
        <div className="max-w-5xl">
          <h1
            ref={tt}
            className="font-display text-[clamp(2.5rem,8.5vw,9.5rem)] font-extrabold leading-[.92] tracking-[-.04em]"
          >
            {['AYATULLAH AL', 'KHOMEINI'].map((l, i) => (
              <span
                key={l}
                className={`block overflow-hidden pb-[.15em] ${i ? 'md:pl-[6vw]' : ''}`}
              >
                <span
                  className="rise block"
                  style={{ animationDelay: `${0.15 + i * 0.15}s` }}
                >
                  {l}
                </span>
              </span>
            ))}
          </h1>
        </div>

        {/* Narrative Callout & Action Controls */}
        <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md md:ml-[6vw]">
            <p className="text-base leading-relaxed text-bone/80 md:text-lg">
              Cinematic electronic music sculpted from pure analog synthesis, precision step
              rhythm, and modular sound architecture.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs font-mono text-bone/60">
              <span>EXPLORE SCENES 01–07</span>
              <span>•</span>
              <span>3D SYNTHESIZERS</span>
              <span>•</span>
              <span>DISCOGRAPHY</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => (playing ? toggle() : play(0))}
              variant="solid"
            >
              {playing ? 'PAUSE MUSIC' : 'PLAY FEATURED'}
            </Button>
            <Button href="#synthesis" variant="ghost">
              EXPLORE 3D INSTRUMENTS
            </Button>
          </div>
        </div>

        {/* Scroll Cue Indicator */}
        <div className="mt-14 flex items-center justify-between border-t border-bone/15 pt-6 text-xs font-mono text-bone/60">
          <a
            href="#synthesis"
            className="group flex items-center gap-3 transition-colors hover:text-cyan"
          >
            <span className="flex h-7 w-4 items-start justify-center rounded-full border border-bone/30 p-1 group-hover:border-cyan">
              <span className="h-1.5 w-1 rounded-full bg-cyan animate-bounce" />
            </span>
            <span>SCROLL DOWN TO DIVE INTO THE SYNTHESIZER SCENE</span>
          </a>

          <div className="hidden sm:flex items-center gap-4">
            <span>SOUND ENGINE: 44.1 kHz / 24-BIT</span>
            <span>STEREO FREQUENCY SPECTRUM LIVE</span>
          </div>
        </div>
      </div>
    </section>
  );
}
