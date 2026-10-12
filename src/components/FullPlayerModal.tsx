import { lazy, memo, Suspense, useEffect, useRef } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import PageLoader from '../pages/PageLoader';

// The route page and shell modal share the same player view and controller.
const UnifiedPlayerExperience = lazy(() => import('./UnifiedPlayerExperience'));

function FullPlayerModal() {
  const local = usePlayer();
  const dialogRef = useRef<HTMLDivElement>(null);
  const open = local.isExpanded;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => dialogRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (document.getElementById('aak-equalizer-panel')) return;
        event.preventDefault();
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
  }, [open, local.setIsExpanded]);

  if (!open) return null;

  return <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="AAK Music unified player" tabIndex={-1} className="fixed inset-0 z-[100] flex flex-col overflow-y-auto overscroll-contain bg-ink text-bone">
    <header className="sticky top-0 z-[110] flex min-h-14 shrink-0 items-center border-b border-bone/10 bg-ink/95 px-4 py-2 backdrop-blur-xl sm:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[.2em] text-cyan">AAK MUSIC · PLAYER</p>
    </header>
    <div className="min-h-0 flex-1">
      <Suspense fallback={<PageLoader />}><UnifiedPlayerExperience /></Suspense>
    </div>
  </div>;
}

export default memo(FullPlayerModal);
