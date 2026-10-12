import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { useUI } from '../hooks/useUI';
import { useVisualizer } from '../hooks/useVisualizer';
import { useUniversalPlayerStatus } from '../hooks/useUniversalPlayer';
import { RouteLink, useLocation } from '../router';
import Icon, { Eq } from './Icon';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'Music', href: '/music' },
  { name: 'Player', href: '/player' },
  { name: 'Loop Studio', href: '/studio' },
  { name: 'Explore', href: '/#theory' },
  { name: 'About', href: '/about' },
  { name: 'Install App', href: '/install' },
];

export default function Navbar() {
  const location = useLocation();
  const p = usePlayer();
  const universal = useUniversalPlayerStatus();
  const ui = useUI();
  const { style, nextStyle, quality, preference, setPreference } = useVisualizer();
  const qualityLabel = quality === 'balanced' ? 'Balance' : quality === 'high' ? 'High' : 'Low';
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const currentTitle = universal.activeVideo?.title || universal.activeAudio?.title || p.track.title;
  const currentPlaying = universal.activeVideo ? universal.videoPlaying : universal.activeAudio ? universal.playing : p.playing;
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const currentPath = location.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  const currentHash = location.includes('#') ? location.slice(location.indexOf('#')) : '';
  const isActiveLink = (href: string) => {
    const [rawPath, hash] = href.split('#');
    const targetPath = rawPath || '/';
    if (hash !== undefined) return currentPath === targetPath && currentHash === `#${hash}`;
    if (targetPath === '/') return currentPath === '/' && currentHash !== '#theory';
    return currentPath === targetPath;
  };

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
                  aria-current={isActiveLink(l.href) ? 'page' : undefined}
                  className={`relative py-2 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-cyan after:transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan ${isActiveLink(l.href) ? 'text-cyan after:scale-x-100' : 'text-bone/75 after:scale-x-0 hover:text-cyan hover:after:scale-x-100'}`}
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
            <label className="hidden xl:block">
              <span className="sr-only">Site performance mode</span>
              <select
                value={preference}
                onChange={(event) => setPreference(event.target.value as typeof preference)}
                title="Choose site motion and visual quality"
                aria-label={`Performance mode preference: ${preference === 'auto' ? `Auto, currently ${qualityLabel}` : preference === 'balanced' ? 'Balance' : preference}`}
                className="min-h-9 rounded-full border border-bone/15 bg-void/70 px-3 text-[10px] font-mono uppercase tracking-wider text-bone/75 outline-none transition-colors hover:border-cyan focus-visible:border-cyan focus-visible:ring-2 focus-visible:ring-cyan/30"
              >
                <option value="auto">Auto · {qualityLabel}</option><option value="low">Low</option><option value="balanced">Balance</option><option value="high">High</option>
              </select>
            </label>

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
              title="Search music"
              className="grid h-10 w-10 place-items-center rounded-full border border-bone/15 text-bone/75 transition hover:border-cyan hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan sm:h-10 sm:w-10"
            >
              <Icon n="search" s={17} />
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
              <Icon n={open ? 'close' : 'menu'} s={20} />
            </button>
          </div>
        </nav>
      </header>

      {/* Compact mobile navigation and settings sheet */}
      <div
        style={{ left: 'var(--visual-viewport-left, 0px)', top: 'var(--visual-viewport-top, 0px)', width: 'var(--visual-viewport-width, 100vw)', height: 'var(--visual-viewport-height, 100dvh)' }}
        aria-hidden={!open}
        onClick={() => {
          setOpen(false);
          menuButton.current?.focus();
        }}
        className={`fixed left-[var(--visual-viewport-left,0px)] top-[var(--visual-viewport-top,0px)] z-[60] h-[var(--visual-viewport-height,100dvh)] w-[var(--visual-viewport-width,100vw)] bg-black/25 transition-opacity duration-200 xl:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <div
          id="mobile-navigation-drawer"
          role="dialog"
          aria-label="Navigation and settings"
          aria-modal={open ? true : undefined}
          onClick={(event) => event.stopPropagation()}
          className={`absolute right-[max(.5rem,env(safe-area-inset-right))] flex w-full max-w-[calc(100vw-1rem)] flex-col overflow-y-auto overscroll-contain rounded-2xl border border-bone/15 bg-raised/95 p-3 text-bone shadow-[0_18px_60px_rgba(0,0,0,.28)] backdrop-blur-md transition-[opacity,transform] duration-200 sm:right-4 sm:p-4 ${open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-2 scale-[.98] opacity-0'}`}
          style={{ top: 'calc(var(--visual-viewport-top, 0px) + env(safe-area-inset-top) + 4.5rem)', width: 'min(27rem, calc(var(--visual-viewport-width, 100vw) - env(safe-area-inset-left) - env(safe-area-inset-right) - 1rem))', maxHeight: 'calc(var(--visual-viewport-height, 100dvh) - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 5.25rem)' }}
        >
          <div className="mb-2 flex items-center justify-between border-b border-bone/10 px-1 pb-2">
            <div>
              <p className="font-display text-sm font-bold tracking-wide">AAK Music</p>
              <p className="mt-0.5 text-[10px] font-mono uppercase tracking-[.14em] text-bone/55">Menu & quick settings</p>
            </div>
            <button
              ref={closeButton}
              tabIndex={open ? 0 : -1}
              type="button"
              aria-label="Close menu"
              title="Close menu"
              onClick={() => {
                setOpen(false);
                menuButton.current?.focus();
              }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-bone/10 text-bone/70 transition-colors hover:border-cyan/50 hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan"
            >
              <Icon n="close" s={17} />
            </button>
          </div>

          <nav aria-label="Mobile" className="grid grid-cols-2 gap-1.5">
            {navLinks.map((link) => (
              <RouteLink
                key={link.name}
                to={link.href}
                tabIndex={open ? 0 : -1}
                onClick={() => setOpen(false)}
                aria-current={isActiveLink(link.href) ? 'page' : undefined}
                className={`flex min-h-10 min-w-0 items-center rounded-xl border px-2.5 py-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan ${isActiveLink(link.href) ? 'border-cyan/30 bg-cyan/10 text-cyan' : 'border-transparent text-bone/80 hover:border-bone/10 hover:bg-bone/5 hover:text-bone'}`}
              >
                <span className="truncate">{link.name}</span>
                {isActiveLink(link.href) && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" aria-hidden="true" />}
              </RouteLink>
            ))}
          </nav>

          <div className="mt-2.5 space-y-1 border-t border-bone/10 pt-2.5">
            <div className="flex min-h-11 items-center gap-2 rounded-xl px-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bone/5 text-bone/70"><Icon n="spectrum" s={16} /></span>
              <span className="min-w-0 flex-1 text-xs font-medium">Visualizer</span>
              <button
                tabIndex={open ? 0 : -1}
                type="button"
                aria-label={`Change visualizer style, current style ${style}`}
                title={`Current visualizer: ${style}. Select to cycle.`}
                onClick={() => {
                  nextStyle();
                  setOpen(false);
                  menuButton.current?.focus();
                }}
                className="min-h-9 max-w-[9.5rem] truncate rounded-lg border border-bone/10 bg-ink/40 px-2.5 text-xs font-semibold capitalize text-cyan transition-colors hover:border-cyan/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan"
              >
                {style}
              </button>
            </div>

            <label className="flex min-h-11 items-center gap-2 rounded-xl px-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bone/5 text-bone/70"><Icon n="sliders" s={16} /></span>
              <span className="min-w-0 flex-1 text-xs font-medium">Performance</span>
              <select
                tabIndex={open ? 0 : -1}
                aria-label={`Performance mode preference: ${preference === 'auto' ? `Auto, currently ${qualityLabel}` : preference === 'balanced' ? 'Balance' : preference}`}
                value={preference}
                onChange={(event) => {
                  setPreference(event.target.value as typeof preference);
                  setOpen(false);
                  menuButton.current?.focus();
                }}
                className="min-h-9 w-[9.5rem] shrink-0 rounded-lg border border-bone/10 bg-ink/40 px-2 text-xs font-semibold text-bone outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
              >
                <option value="auto">Auto · {qualityLabel}</option><option value="low">Low</option><option value="balanced">Balance</option><option value="high">High</option>
              </select>
            </label>

            <div className="flex min-h-11 items-center gap-2 rounded-xl px-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bone/5 text-bone/70"><Icon n="sun" s={16} /></span>
              <span className="min-w-0 flex-1 text-xs font-medium">Appearance</span>
              <span onClick={() => {
                setOpen(false);
                menuButton.current?.focus();
              }}>
                <ThemeToggle row focusable={open} />
              </span>
            </div>
          </div>

          <button
            tabIndex={open ? 0 : -1}
            type="button"
            onClick={() => {
              setOpen(false);
              ui.openSearch();
            }}
            className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-bone/10 bg-ink/30 px-3 text-left text-xs font-semibold text-bone/85 transition-colors hover:border-cyan/35 hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan"
          >
            <Icon n="search" s={16} />
            <span>Search tracks and artists</span>
          </button>
        </div>
      </div>
    </>
  );
}
