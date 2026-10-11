import { usePointerShift } from '../hooks/usePointerShift';
import Button from '../components/Button';
import { useParallax } from '../hooks/useParallax';
import { usePlayer } from '../hooks/usePlayer';
import { RouteLink } from '../router';

export default function Hero() {
  const bg = useParallax<HTMLDivElement>(-0.15);
  // Pointer shift on desktop only with small amplitude (1.5px) so text never drifts outside container
  const tt = usePointerShift<HTMLHeadingElement>(1.5);
  const { playing, toggle, play } = usePlayer();

  return (
    <section className="relative flex min-h-[100svh] items-end overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 md:px-12 md:pb-28">
      {/* Atmospheric Lighting Layer */}
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
        {/* Brand Badge */}
        <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-[10px] font-mono font-medium tracking-widest text-cyan sm:px-3.5 sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
            <span>AAK MUSIC</span>
            <span>//</span>
            <span>ELECTRONIC PRODUCER</span>
          </div>
        </div>

        {/* Hero Title: "Ayatullah Al Khomeini"
            Engineered with fluid typography and structured words so NO letter is ever clipped at any screen size from 320px to ultrawide. */}
        <div className="max-w-6xl overflow-visible">
          <h1
            ref={tt}
            className="font-display font-extrabold leading-[0.92] tracking-[-0.03em] sm:tracking-[-0.04em] text-[clamp(1.75rem,7.2vw,9.5rem)] text-bone overflow-visible"
          >
            {/* Line 1: AYATULLAH AL */}
            <span className="block overflow-visible pb-[0.06em]">
              <span className="rise inline-block whitespace-nowrap">
                Ayatullah
              </span>{' '}
              <span
                className="rise inline-block whitespace-nowrap"
                style={{ animationDelay: '0.12s' }}
              >
                Al
              </span>
            </span>

            {/* Line 2: KHOMEINI (gracefully indented on tablet/desktop, naturally aligned on phone) */}
            <span className="block overflow-visible pb-[0.06em] sm:mt-1 md:pl-[6vw]">
              <span
                className="rise inline-block whitespace-nowrap"
                style={{ animationDelay: '0.24s' }}
              >
                Khomeini
              </span>
            </span>
          </h1>
        </div>

        {/* Narrative Callout & Action Controls */}
        <div className="mt-6 flex flex-col gap-6 md:mt-8 md:flex-row md:items-end md:justify-between md:gap-8">
          <div className="max-w-md md:ml-[6vw]">
            <p className="text-sm leading-relaxed text-bone/80 sm:text-base md:text-lg">
              Cinematic electronic music sculpted from pure analog synthesis, precision step
              rhythm, and modular sound architecture.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-mono text-bone/60 sm:text-xs">
              <span>DISCOGRAPHY</span>
              <span>•</span>
              <span>MUSIC THEORY</span>
              <span>•</span>
              <span>SAMPLE VAULT</span>
              <span>•</span>
              <span>SERVICES</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => (playing ? toggle() : play(0))}
              variant="solid"
            >
              {playing ? 'PAUSE MUSIC' : 'PLAY FEATURED'}
            </Button>
            <RouteLink to="/music" className="inline-flex min-h-11 items-center justify-center rounded-full border border-bone/20 px-5 text-xs font-bold tracking-wide text-bone transition hover:border-cyan hover:text-cyan">EXPLORE MUSIC</RouteLink>
            <RouteLink to="/player" className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-xs font-bold tracking-wide text-cyan transition hover:bg-cyan/10">OPEN PLAYER</RouteLink>
          </div>
        </div>

        {/* Scroll Cue Indicator */}
        <div className="mt-8 flex items-center justify-between border-t border-bone/15 pt-4 text-[10px] font-mono text-bone/60 sm:mt-12 sm:pt-6 sm:text-xs md:mt-14">
          <RouteLink to="/player" className="group flex items-center gap-3 transition-colors hover:text-cyan">
            <span className="flex h-7 w-4 items-start justify-center rounded-full border border-bone/30 p-1 group-hover:border-cyan">
              <span className="h-1.5 w-1 rounded-full bg-cyan animate-bounce" />
            </span>
            <span>EXPLORE MUSIC & PRODUCTION PLATFORM</span>
          </RouteLink>

          <div className="hidden sm:flex items-center gap-4">
            <span>SOUND ENGINE: 44.1 kHz / 24-BIT</span>
            <span>STEREO FREQUENCY SPECTRUM</span>
          </div>
        </div>
      </div>
    </section>
  );
}
