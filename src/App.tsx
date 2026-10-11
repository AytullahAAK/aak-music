import { ThemeProvider } from './hooks/useTheme';
import { PlayerProvider } from './hooks/usePlayer';
import { UIProvider } from './hooks/useUI';
import { usePointerTracking } from './hooks/motion';

import AudioVisualizerBackground from './components/AudioVisualizerBackground';
import CursorGlow from './components/CursorGlow';
import CustomCursor from './components/CustomCursor';

import Navbar from './components/Navbar';
import MiniPlayer from './components/MiniPlayer';
import Overlays from './components/Overlays';

import Hero from './sections/Hero';
import SynthSection from './sections/SynthSection';
import RhythmSection from './sections/RhythmSection';
import ModularSection from './sections/ModularSection';
import TheorySection from './sections/TheorySection';
import Featured from './sections/Featured';
import Releases from './sections/Releases';
import Artists from './sections/Artists';
import Worlds from './sections/Worlds';
import Immersive from './sections/Immersive';
import Events from './sections/Events';
import About from './sections/About';
import Stories from './sections/Stories';
import Footer from './sections/Footer';

export default function App() {
  usePointerTracking();

  return (
    <ThemeProvider>
      <PlayerProvider>
        <UIProvider>
          {/* Audio-Reactive 2D Background Visualizer */}
          <AudioVisualizerBackground />

          <CursorGlow />
          <CustomCursor />

          <a
            href="#top"
            className="sr-only z-[100] bg-bone px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Skip to content
          </a>

          <Navbar />

          <main id="top" tabIndex={-1} className="relative z-10 w-full overflow-x-clip">
            {/* Scene 1 — Opening / AAK Music Identity */}
            <Hero />

            {/* Scene 2 — Synthesizer Experience */}
            <SynthSection />

            {/* Scene 3 — Drum Machine & Rhythm */}
            <RhythmSection />

            {/* Scene 4 — Modular Synthesizer / Sound Design */}
            <ModularSection />

            {/* Scene 5 — Music Theory Visualisation */}
            <TheorySection />

            {/* Scene 6 — Featured Master Release & Full Discography */}
            <Featured />
            <Releases />

            {/* Rich Electronic Universe */}
            <Artists />
            <Worlds />
            <Immersive />
            <Events />
            <About />
            <Stories />
          </main>

          {/* Scene 7 — Closing Brand Finale */}
          <Footer />

          <MiniPlayer />
          <Overlays />
        </UIProvider>
      </PlayerProvider>
    </ThemeProvider>
  );
}
