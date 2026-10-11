import { lazy, memo, Suspense, useEffect, useRef } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import { useUniversalPlayer } from '../hooks/useUniversalPlayer';
import PageLoader from '../pages/PageLoader';

// The dock and expanded player are two views of the same shell-mounted player.
// Keeping the richer search/playback surface lazy avoids loading it on Home.
const UnifiedPlayerExperience = lazy(() => import('./UnifiedPlayerExperience'));

function FullPlayerModal() {
  const local = usePlayer();
  const universal = useUniversalPlayer();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = local.isExpanded;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => closeRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Let an open, nested player control close itself before the player shell.
        if (document.getElementById('aak-equalizer-panel')) return;
        event.preventDefault();
        if (universal.activeVideo && universal.videoMode) universal.exitVideoMode();
        local.setIsExpanded(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousActive?.focus();
    };
  }, [open, local.setIsExpanded, universal.activeVideo, universal.videoMode, universal.exitVideoMode]);

  if (!open) return null;
  const close = () => {
    if (universal.activeVideo && universal.videoMode) universal.exitVideoMode();
    local.setIsExpanded(false);
  };

  return <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="AAK Music unified player" tabIndex={-1} className="fixed inset-0 z-[100] flex flex-col overflow-y-auto overscroll-contain bg-ink text-bone">
    <header className="sticky top-0 z-[110] flex min-h-14 shrink-0 items-center justify-between border-b border-bone/10 bg-ink px-4 py-2 sm:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[.2em] text-cyan">AAK MUSIC · PLAYER</p>
      <button ref={closeRef} type="button" onClick={close} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-bone/20 bg-ink px-4 text-xs font-mono text-bone/80 transition hover:border-cyan hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan">
        <span aria-hidden="true">×</span><span>Close player</span>
      </button>
    </header>
    <div className="min-h-0 flex-1">
      <Suspense fallback={<PageLoader />}><UnifiedPlayerExperience /></Suspense>
    </div>
  </div>;
}

export default memo(FullPlayerModal);
