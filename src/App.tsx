import { ThemeProvider } from './hooks/useTheme';
import { PlayerProvider } from './hooks/usePlayer';
import { UniversalPlayerProvider } from './hooks/useUniversalPlayer';
import { VisualizerProvider } from './hooks/useVisualizer';
import { UIProvider } from './hooks/useUI';
import { usePointerTracking } from './hooks/motion';

import AudioVisualizerBackground from './components/AudioVisualizerBackground';
import Navbar from './components/Navbar';
import UniversalPlayer from './components/UniversalPlayer';
import FullPlayerModal from './components/FullPlayerModal';
import Overlays from './components/Overlays';

import Hero from './sections/Hero';
import Featured from './sections/Featured';
import Releases from './sections/Releases';
import TheorySection from './sections/TheorySection';
import CompositionSection from './sections/CompositionSection';
import SampleLibrarySection from './sections/SampleLibrarySection';
import LoopStudio from './sections/LoopStudio';
import ServicesSection from './sections/ServicesSection';
import About from './sections/About';
import Footer from './sections/Footer';

export default function App() {
  usePointerTracking();

  return (
    <ThemeProvider>
      <PlayerProvider>
       <UniversalPlayerProvider>
        <VisualizerProvider>
          <UIProvider>
            {/* Music-Synchronized Audio Visualizer (Halts completely when paused) */}
            <AudioVisualizerBackground />

            {/* Accessibility Skip Link */}
            <a
              href="#top"
              className="sr-only z-[100] bg-bone px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            >
              Skip to content
            </a>

            <Navbar />

            <main id="top" tabIndex={-1} className="relative z-10 w-full min-w-0">
              {/* 1. Identity & Opening */}
              <Hero />

              {/* 2. Flagship Release & Master Player */}
              <Featured />

              {/* 3. Complete Music Discography & Filtered Catalogue */}
              <Releases />

              {/* 4. Professional Music Theory & Interactive Chord Explorer */}
              <TheorySection />

              {/* 5. Electronic Music Composition & Arrangement Blueprint */}
              <CompositionSection />

              {/* 6. EDM Sample Library & Sound Architecture */}
              <SampleLibrarySection />

              {/* 7. Browser-based sequencer and loop creation workspace */}
              <LoopStudio />

              {/* 8. Artist Skills, Capabilities & Direct Booking Inquiry */}
              <ServicesSection />

              {/* 9. Artist Story & Brand Focus */}
              <About />
            </main>

            {/* 9. Brand Finale & Navigation Footer */}
            <Footer />

            {/* One shared dock for AAK releases and supported external audio */}
            <UniversalPlayer />

            {/* Dedicated Modern Full Player Modal App View */}
            <FullPlayerModal />

            {/* Overlays: Global Search & Dialogs */}
            <Overlays />
          </UIProvider>
        </VisualizerProvider>
       </UniversalPlayerProvider>
      </PlayerProvider>
    </ThemeProvider>
  );
}
