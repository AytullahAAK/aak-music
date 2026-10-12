import { lazy, Suspense, useEffect, useRef } from 'react';
import { ThemeProvider } from './hooks/useTheme';
import { PlayerProvider, usePlayer, useSetPlayerExpanded } from './hooks/usePlayer';
import { UniversalPlayerProvider } from './hooks/useUniversalPlayer';
import { useUniversalPlayer } from './hooks/useUniversalPlayer';
import { VisualizerProvider } from './hooks/useVisualizer';
import { UIProvider } from './hooks/useUI';
import { usePointerTracking } from './hooks/motion';
import { useLocation } from './router';
import Navbar from './components/Navbar';
import UniversalPlayer from './components/UniversalPlayer';
import Overlays from './components/Overlays';
import PageLoader from './pages/PageLoader';

const AudioVisualizerBackground = lazy(() => import('./components/AudioVisualizerBackground'));
const Footer = lazy(() => import('./sections/Footer'));
const HomePage = lazy(() => import('./pages/HomePage'));
const MusicPage = lazy(() => import('./pages/MusicPage'));
const PlayerPage = lazy(() => import('./pages/PlayerPage'));
const StudioPage = lazy(() => import('./pages/StudioPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const InstallPage = lazy(() => import('./pages/InstallPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function ApplicationShell() {
  usePointerTracking();
  const location = useLocation();
  const pathname = location.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  const setIsExpanded = useSetPlayerExpanded();
  const localPlayer = usePlayer();
  const universal = useUniversalPlayer();
  const hasSelectedTrack = Boolean(universal.activeAudio || universal.activeVideo || localPlayer.hasInitiatedPlayback || localPlayer.playing);
  const previousPath = useRef<string | null>(null);
  const pages: Record<string, typeof HomePage> = {
    '/': HomePage,
    '/music': MusicPage,
    '/player': PlayerPage,
    '/studio': StudioPage,
    '/about': AboutPage,
    '/install': InstallPage,
  };
  const Page = pages[pathname] || NotFoundPage;

  useEffect(() => {
    const previous = previousPath.current;
    if (previous !== pathname) {
      // Player playback is an explicit presentation. Returning to /player
      // starts at discovery; users can restore the watch view from the dock.
      if (previous === '/player' && pathname !== '/player') setIsExpanded(false);
      previousPath.current = pathname;
    }
    const hash = window.location.hash.slice(1);
    requestAnimationFrame(() => {
      if (hash) document.getElementById(decodeURIComponent(hash))?.scrollIntoView({ block: 'start' });
      else if (previous !== pathname) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    });
  }, [location, pathname, setIsExpanded]);

  return <>
    <Suspense fallback={null}><AudioVisualizerBackground /></Suspense>
    <a href="#top" className="sr-only z-[110] bg-bone px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
    <Navbar />
    <main id="top" tabIndex={-1} className={`relative z-10 w-full min-w-0 ${hasSelectedTrack && !localPlayer.isExpanded ? 'aak-player-dock-main' : ''} ${universal.activeVideo && universal.videoMode && !localPlayer.isExpanded ? 'youtube-player-dock-main' : ''}`}>
      <Suspense fallback={<PageLoader />}><Page key={pathname} /></Suspense>
    </main>
    <Suspense fallback={null}><Footer /></Suspense>
    <UniversalPlayer />
    <Overlays />
  </>;
}

export default function App() {
  return <ThemeProvider><PlayerProvider><UniversalPlayerProvider><VisualizerProvider><UIProvider><ApplicationShell /></UIProvider></VisualizerProvider></UniversalPlayerProvider></PlayerProvider></ThemeProvider>;
}
