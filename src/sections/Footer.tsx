import { useState } from 'react';
import { site } from '../data';
import Logo from '../components/Logo';
import Button from '../components/Button';
import { RouteLink } from '../router';

const nav = [
  ['Home', '/'],
  ['Featured Release', '/player'],
  ['Discography', '/music'],
  ['Music Theory', '/#theory'],
  ['Composition Guide', '/#composition'],
  ['Sample Vault', '/#samples'],
  ['Artist Services', '/about#services'],
  ['About AAK', '/about#about'],
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
    <footer className="relative min-h-[60svh] px-4 pb-28 pt-20 sm:px-6 md:min-h-[70svh] md:px-12 md:pb-40 md:pt-32">
      {/* Background Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-transparent"
      />

      <div className="relative z-10 mx-auto max-w-[1600px]">
        {/* Brand Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-[10px] font-mono font-medium tracking-widest text-cyan sm:px-3.5 sm:text-xs">
          <span>AAK MUSIC</span>
        </div>

        {/* Brand Finale Statement */}
        <div className="mt-6 border-b border-bone/15 pb-12 md:mt-8 md:pb-16">
          <h2 className="font-display text-[clamp(2.2rem,8vw,9.5rem)] font-extrabold leading-[.88] tracking-[-.04em]">
            SONIC WORLDS. <br />
            PURE ENERGY.
          </h2>

          <div className="mt-6 flex flex-col justify-between gap-6 md:mt-8 md:flex-row md:items-end md:gap-8">
            <p className="max-w-xl text-sm leading-relaxed text-bone/75 sm:text-base md:text-lg">
              AAK Music is dedicated to creating transformative electronic music experiences.
              From monumental club sound systems to intimate headphone listening, every frequency
              is engineered with cinematic vision.
            </p>

            <Button href="#top" variant="solid">
              BACK TO TOP
            </Button>
          </div>
        </div>

        {/* Navigation Grid & Newsletter */}
        <div className="mt-12 grid gap-10 md:mt-16 lg:grid-cols-12 lg:gap-12">
          {/* Newsletter Form */}
          <div className="lg:col-span-5">
            <h3 className="font-display text-xl font-bold tracking-tight text-bone sm:text-2xl">
              STAY IN THE FREQUENCY
            </h3>
            <p className="mt-2 text-xs text-bone/65 sm:text-sm">
              Receive unreleased tracks, production stems, and upcoming festival announcements.
            </p>
            <form onSubmit={sub} className="mt-5 flex max-w-md border-b border-bone/30 focus-within:border-cyan sm:mt-6">
              <label className="sr-only" htmlFor="em">Email</label>
              <input
                id="em"
                name="email"
                type="email"
                required
                placeholder="Enter your email"
                className="w-full bg-transparent py-2.5 font-mono text-xs outline-none placeholder:text-bone/50 sm:py-3 sm:text-sm"
              />
              <button className="text-[10px] font-mono font-bold tracking-widest text-cyan hover:text-bone transition-colors sm:text-xs">
                SUBSCRIBE
              </button>
            </form>
            <p role="status" className="mt-2 min-h-5 text-[10px] font-mono text-cyan sm:mt-3 sm:text-xs">
              {msg}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-4 lg:col-start-7">
            <span className="text-[10px] font-mono uppercase tracking-wider text-bone/50 block mb-3 sm:text-xs sm:mb-4">
              Navigation
            </span>
            <ul className="grid grid-cols-2 gap-2 text-[10px] font-mono sm:gap-2.5 sm:text-xs">
              {nav.map(([n, h]) => (
                <li key={n}>
                  <RouteLink
                    to={h}
                    className="text-bone/75 transition-colors hover:text-cyan"
                  >
                    {n}
                  </RouteLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Socials & Contact */}
          <div className="lg:col-span-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-bone/50 block mb-3 sm:text-xs sm:mb-4">
              Connect
            </span>
            <ul className="space-y-1.5 text-[10px] font-mono sm:space-y-2 sm:text-xs">
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
                <li className="pt-1.5 sm:pt-2">
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
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-bone/15 pt-6 md:mt-24 md:gap-6 md:pt-8">
          <RouteLink to="/#top" aria-label={`${site.brand.name} home`}>
            <Logo className="h-8 md:h-14" />
          </RouteLink>

          <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-bone/50 sm:gap-6 sm:text-xs">
            <span>© {new Date().getFullYear()} {site.brand.name}. ALL RIGHTS RESERVED.</span>
            <span>BUILT WITH WEB AUDIO ENGINE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
