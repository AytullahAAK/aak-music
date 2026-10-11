import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { useUI } from '../hooks/useUI';
import { useVisualizer } from '../hooks/useVisualizer';
import { useUniversalPlayerStatus } from '../hooks/useUniversalPlayer';
import { RouteLink } from '../router';
import { Eq } from './Icon';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'Music', href: '/music' },
  { name: 'Player', href: '/player' },
  { name: 'Loop Studio', href: '/studio' },
  { name: 'Explore', href: '/#theory' },
  { name: 'About', href: '/about' },
];

export default function Navbar() {
  const p = usePlayer();
  const universal = useUniversalPlayerStatus();
  const ui = useUI();
  const { style, nextStyle, quality, toggleQuality } = useVisualizer();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const currentTitle = universal.activeVideo?.title || universal.activeAudio?.title || p.track.title;
  const currentPlaying = universal.activeVideo ? universal.videoPlaying : universal.activeAudio ? universal.playing : p.playing;
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1280px)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    if (open) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      requestAnimationFrame(() => closeButton.current?.focus());
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
        menuButton.current?.focus();
      }
      if (e.key === 'Tab' && open) {
        const drawer = document.getElementById('mobile-navigation-drawer');
        const focusable = drawer?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <header
        style={{ width: 'var(--visual-viewport-width, 100vw)' }}
        className={`fixed left-0 top-0 z-50 w-[var(--visual-viewport-width,100vw)] transition-[background-color,border-color,box-shadow,padding] duration-500 ${
          scrolled ? 'bg-ink/85 backdrop-blur-2xl py-2.5 border-b border-bone/10 shadow-lg sm:py-3' : 'py-4 sm:py-6'
        }`}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-[1600px] items-center justify-between px-4 sm:px-6 md:px-12"
        >
          {/* Logo */}
          <RouteLink to="/#top" aria-label="AAK Music home" className="flex items-center">
            <Logo className="h-8 sm:h-10 md:h-12" />
          </RouteLink>

          {/* Desktop Navigation Links */}
          <ul className="hidden items-center gap-5 text-xs font-mono tracking-wider uppercase text-bone/75 xl:flex xl:gap-7">
            {navLinks.map((l) => (
              <li key={l.name}>
                <RouteLink
                  to={l.href}
                  className="transition hover:text-cyan hover:underline underline-offset-4"
                >
                  {l.name}
                </RouteLink>
              </li>
            ))}
          </ul>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            {/* Visualizer Style Quick Pill */}
            <button
              onClick={nextStyle}
              title={`Visualizer Style: ${style}. Click to cycle.`}
              aria-label={`Visualizer: ${style}`}
              className="hidden items-center gap-1.5 rounded-full border border-bone/15 bg-void/40 px-2.5 py-1 text-[11px] font-mono text-bone/70 transition hover:border-cyan hover:text-cyan xl:flex"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${p.playing ? 'bg-cyan animate-pulse' : 'bg-bone/40'}`} />
              <span className="capitalize">{style}</span>
            </button>

            {/* Performance Mode Quick Pill */}
            <button
              onClick={toggleQuality}
              title={`Performance Mode: ${quality}. Click to toggle.`}
              aria-label={`Performance Mode: ${quality}`}
              className="hidden items-center rounded-full border border-bone/15 bg-void/40 px-2 py-1 text-[10px] font-mono text-bone/60 transition hover:border-cyan hover:text-cyan xl:flex"
            >
              <span className="uppercase">{quality === 'low' ? 'Low / Batt' : quality}</span>
            </button>

            {/* Quick Player Status */}
            <RouteLink
              to="/player"
              className="hidden max-w-[10rem] items-center gap-2 truncate text-xs font-mono text-bone/75 transition hover:text-cyan xl:flex"
            >
              <Eq on={currentPlaying} />
              <span className="truncate">{currentTitle}</span>
            </RouteLink>

            {/* Search Button */}
            <button
              aria-label="Search"
              onClick={() => ui.openSearch()}
              className="grid h-8 w-8 place-items-center rounded-full border border-bone/15 text-bone/75 transition hover:border-cyan hover:text-cyan sm:h-9 sm:w-9"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </button>

            {/* Theme Toggle */}
            <span className="hidden xl:block">
              <ThemeToggle />
            </span>

            {/* Mobile Hamburger Button */}
            <button
              ref={menuButton}
              aria-label="Menu"
              aria-expanded={open}
              aria-controls="mobile-navigation-drawer"
              onClick={() => setOpen(!open)}
              className="relative grid h-11 w-11 place-items-center rounded-full border border-bone/15 text-bone xl:hidden"
            >
              <span
                className={`absolute h-px w-4 bg-bone transition-transform duration-300 sm:w-5 ${
                  open ? 'rotate-45' : '-translate-y-1'
                }`}
              />
              <span
                className={`absolute h-px w-4 bg-bone transition-transform duration-300 sm:w-5 ${
                  open ? '-rotate-45' : 'translate-y-1'
                }`}
              />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer Menu */}
      <div
        id="mobile-navigation-drawer"
        style={{ left: 'var(--visual-viewport-left, 0px)', top: 'var(--visual-viewport-top, 0px)', width: 'var(--visual-viewport-width, 100vw)', height: 'var(--visual-viewport-height, 100dvh)' }}
        role="dialog"
        aria-label="Mobile navigation"
        aria-modal={open ? true : undefined}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        className={`fixed left-[var(--visual-viewport-left,0px)] top-[var(--visual-viewport-top,0px)] z-[60] h-[var(--visual-viewport-height,100dvh)] w-[var(--visual-viewport-width,100vw)] flex flex-col overflow-y-auto overscroll-contain bg-ink px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+5rem)] backdrop-blur-2xl transition-opacity duration-300 sm:px-8 xl:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <button
          ref={closeButton}
          tabIndex={open ? 0 : -1}
          type="button"
          aria-label="Close menu"
          onClick={() => {
            setOpen(false);
            menuButton.current?.focus();
          }}
          className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-[61] grid h-12 w-12 place-items-center rounded-full border border-bone/25 bg-ink text-bone shadow-lg transition hover:border-cyan hover:text-cyan sm:right-6"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m3 3 12 12M15 3 3 15" />
          </svg>
        </button>
        <div onClick={(event) => event.stopPropagation()} className="mx-auto my-auto w-full max-w-2xl py-5">
        <div className="space-y-4 sm:space-y-5">
          {navLinks.map((l, i) => (
            <RouteLink
              key={l.name}
              to={l.href}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: `${open ? i * 40 : 0}ms` }}
              className={`block font-display text-3xl font-extrabold transition duration-300 hover:text-cyan sm:text-4xl ${
                open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              {l.name}
            </RouteLink>
          ))}
        </div>

        {/* Visualizer style switcher inside mobile menu */}
        <div className="mt-8 border-t border-bone/15 pt-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-bone/60">VISUALIZER STYLE</span>
            <button
              tabIndex={open ? 0 : -1}
              onClick={nextStyle}
              className="font-bold text-cyan capitalize"
            >
              {style} ↺
            </button>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-bone/60">PERFORMANCE MODE</span>
            <button
              tabIndex={open ? 0 : -1}
              onClick={toggleQuality}
              className="font-bold text-violet uppercase"
            >
              {quality} ↺
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-bone/15 pt-5 flex items-center justify-between">
          <button
            tabIndex={open ? 0 : -1}
            onClick={() => {
              setOpen(false);
              ui.openSearch();
            }}
            className="text-xs font-mono text-cyan sm:text-sm"
          >
            SEARCH TRACKS & ARTISTS
          </button>
          <ThemeToggle row focusable={open} />
        </div>
        </div>
      </div>
    </>
  );
}
