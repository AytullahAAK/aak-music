import { useEffect, useState } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { useUI } from '../hooks/useUI';
import { Eq } from './Icon';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

const navLinks = [
  { name: 'Synthesis', href: '#synthesis' },
  { name: 'Rhythm', href: '#rhythm' },
  { name: 'Modular', href: '#modular' },
  { name: 'Harmony', href: '#theory' },
  { name: 'Catalogue', href: '#music' },
  { name: 'About', href: '#about' },
];

export default function Navbar() {
  const p = usePlayer();
  const ui = useUI();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-700 ${
          scrolled ? 'bg-ink/80 backdrop-blur-2xl py-3 border-b border-bone/10' : 'py-6'
        }`}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-[1600px] items-center justify-between px-6 md:px-12"
        >
          {/* Logo */}
          <a href="#top" aria-label="AAK Music home" className="flex items-center">
            <Logo className="h-7 md:h-16" />
          </a>

          {/* Desktop Navigation Links */}
          <ul className="hidden items-center gap-8 text-xs font-mono tracking-wider uppercase text-bone/75 lg:flex">
            {navLinks.map((l) => (
              <li key={l.name}>
                <a
                  href={l.href}
                  className="transition hover:text-cyan hover:underline underline-offset-4"
                >
                  {l.name}
                </a>
              </li>
            ))}
          </ul>

          {/* Quick Player Status & Actions */}
          <div className="flex items-center gap-4">
            <a
              href="#music"
              className="hidden max-w-[12rem] items-center gap-2 truncate text-xs font-mono text-bone/75 transition hover:text-cyan md:flex"
            >
              <Eq on={p.playing} />
              <span className="truncate">{p.track.title}</span>
            </a>

            <button
              aria-label="Search"
              onClick={() => ui.openSearch()}
              className="grid h-9 w-9 place-items-center rounded-full border border-bone/15 text-bone/75 transition hover:border-cyan hover:text-cyan"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </button>

            <span className="hidden lg:block">
              <ThemeToggle />
            </span>

            {/* Mobile Hamburger Button */}
            <button
              aria-label="Menu"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="relative z-[70] grid h-9 w-9 place-items-center rounded-full border border-bone/15 text-bone lg:hidden"
            >
              <span
                className={`absolute h-px w-5 bg-bone transition-transform duration-300 ${
                  open ? 'rotate-45' : '-translate-y-1'
                }`}
              />
              <span
                className={`absolute h-px w-5 bg-bone transition-transform duration-300 ${
                  open ? '-rotate-45' : 'translate-y-1'
                }`}
              />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer Menu */}
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-[60] flex flex-col justify-center bg-ink/95 backdrop-blur-2xl px-8 transition-all duration-500 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="space-y-4">
          {navLinks.map((l, i) => (
            <a
              key={l.name}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              href={l.href}
              style={{ transitionDelay: `${open ? i * 50 : 0}ms` }}
              className={`block font-display text-4xl font-extrabold transition duration-500 hover:text-cyan ${
                open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              {l.name}
            </a>
          ))}
        </div>

        <div className="mt-8 border-t border-bone/15 pt-6 flex items-center justify-between">
          <button
            tabIndex={open ? 0 : -1}
            onClick={() => {
              setOpen(false);
              ui.openSearch();
            }}
            className="text-sm font-mono text-cyan"
          >
            SEARCH TRACKS & ARTISTS
          </button>
          <ThemeToggle row focusable={open} />
        </div>
      </div>
    </>
  );
}
