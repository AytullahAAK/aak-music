import { useState } from 'react';
import { site } from '../data';
import Logo from '../components/Logo';
import Button from '../components/Button';

const nav = [
  ['Scene 01 // Identity', '#top'],
  ['Scene 02 // Synthesis', '#synthesis'],
  ['Scene 03 // Rhythm', '#rhythm'],
  ['Scene 04 // Modular', '#modular'],
  ['Scene 05 // Harmony', '#theory'],
  ['Scene 06 // Discography', '#music'],
  ['About AAK', '#about'],
  ['Live Events', '#events'],
];

export default function Footer() {
  const [msg, setMsg] = useState('');

  const sub = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    if (!site.newsletterUrl) {
      return setMsg('Signup is not connected yet. Set site.newsletterUrl in src/data/site.ts.');
    }
    try {
      const r = await fetch(site.newsletterUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: new FormData(f).get('email') }),
      });
      if (!r.ok) throw 0;
      setMsg('You are on the list.');
      f.reset();
    } catch {
      setMsg('Something went wrong. Please try again.');
    }
  };

  return (
    <footer className="relative min-h-[90svh] px-6 pb-36 pt-32 md:px-12 md:pb-40">
      {/* Background Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-transparent"
      />

      <div className="relative z-10 mx-auto max-w-[1600px]">
        {/* Scene 7 Callout */}
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3.5 py-1 text-xs font-mono font-medium tracking-widest text-cyan">
          <span>SCENE 07</span>
          <span>//</span>
          <span>FINAL TRANSMISSION</span>
        </div>

        {/* Brand Finale Monumental Statement */}
        <div className="mt-8 border-b border-bone/15 pb-16">
          <h2 className="font-display text-[clamp(2.8rem,9vw,9.5rem)] font-extrabold leading-[.88] tracking-[-.04em]">
            SONIC WORLDS. <br />
            PURE ENERGY.
          </h2>

          <div className="mt-8 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <p className="max-w-xl text-lg leading-relaxed text-bone/75">
              AAK Music is dedicated to creating transformative electronic music experiences.
              From monumental club sound systems to intimate headphone listening, every frequency
              is engineered with cinematic vision.
            </p>

            <Button href="#top" variant="solid">
              RETURN TO OPENING SCENE
            </Button>
          </div>
        </div>

        {/* Navigation Grid & Newsletter */}
        <div className="mt-16 grid gap-12 lg:grid-cols-12">
          {/* Newsletter Form */}
          <div className="lg:col-span-5">
            <h3 className="font-display text-2xl font-bold tracking-tight text-bone">
              STAY IN THE FREQUENCY
            </h3>
            <p className="mt-2 text-sm text-bone/65">
              Receive unreleased tracks, production stems, and upcoming festival announcements.
            </p>
            <form onSubmit={sub} className="mt-6 flex max-w-md border-b border-bone/30 focus-within:border-cyan">
              <label className="sr-only" htmlFor="em">Email</label>
              <input
                id="em"
                name="email"
                type="email"
                required
                placeholder="Enter your email"
                className="w-full bg-transparent py-3 font-mono text-sm outline-none placeholder:text-bone/50"
              />
              <button className="text-xs font-mono font-bold tracking-widest text-cyan hover:text-bone transition-colors">
                SUBSCRIBE
              </button>
            </form>
            <p role="status" className="mt-3 min-h-5 text-xs font-mono text-cyan">
              {msg}
            </p>
          </div>

          {/* Cinematic Timeline Navigation Links */}
          <div className="lg:col-span-4 lg:col-start-7">
            <span className="text-xs font-mono uppercase tracking-wider text-bone/50 block mb-4">
              Cinematic Navigation
            </span>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs font-mono">
              {nav.map(([n, h]) => (
                <li key={n}>
                  <a
                    href={h}
                    className="text-bone/75 transition-colors hover:text-cyan"
                  >
                    {n}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Socials & Contact */}
          <div className="lg:col-span-2">
            <span className="text-xs font-mono uppercase tracking-wider text-bone/50 block mb-4">
              Connect
            </span>
            <ul className="space-y-2 text-xs font-mono">
              {site.socials.map((s) => (
                <li key={s.name}>
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-bone/75 transition-colors hover:text-cyan"
                    >
                      {s.name}
                    </a>
                  ) : (
                    <span className="text-bone/40">{s.name}</span>
                  )}
                </li>
              ))}
              {site.contact && (
                <li className="pt-2">
                  <a
                    href={site.contact}
                    className="text-cyan font-semibold hover:underline"
                  >
                    Direct Contact
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Credits & Logo */}
        <div className="mt-24 flex flex-wrap items-center justify-between gap-6 border-t border-bone/15 pt-8">
          <a href="#top" aria-label={`${site.brand.name} home`}>
            <Logo className="h-10 md:h-14" />
          </a>

          <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-bone/50">
            <span>© {new Date().getFullYear()} {site.brand.name}. ALL RIGHTS RESERVED.</span>
            <span>PRODUCED WITH WEBGL 3D & WEB AUDIO ENGINE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
