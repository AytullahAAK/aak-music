import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import Hero from '../sections/Hero';
import Featured from '../sections/Featured';
import PageLoader from './PageLoader';

const Releases = lazy(() => import('../sections/Releases'));
const TheorySection = lazy(() => import('../sections/TheorySection'));
const CompositionSection = lazy(() => import('../sections/CompositionSection'));
const SampleLibrarySection = lazy(() => import('../sections/SampleLibrarySection'));
const LoopStudio = lazy(() => import('../sections/LoopStudio'));
const ServicesSection = lazy(() => import('../sections/ServicesSection'));
const About = lazy(() => import('../sections/About'));

function DeferredSection({ children, minHeight = '20rem' }: { children: ReactNode; minHeight?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || ready) return;
    if (!('IntersectionObserver' in window)) { setReady(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setReady(true); observer.disconnect(); }
    }, { rootMargin: '500px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ready]);
  return <div ref={ref} style={{ minHeight: ready ? undefined : minHeight }}>
    {ready ? <Suspense fallback={<PageLoader />}>{children}</Suspense> : null}
  </div>;
}

export default function HomePage() {
  return <>
    <Hero />
    <Featured />
    <DeferredSection minHeight="36rem"><Releases /></DeferredSection>
    <DeferredSection minHeight="42rem"><TheorySection /></DeferredSection>
    <DeferredSection minHeight="38rem"><CompositionSection /></DeferredSection>
    <DeferredSection minHeight="38rem"><SampleLibrarySection /></DeferredSection>
    <DeferredSection minHeight="40rem"><LoopStudio /></DeferredSection>
    <DeferredSection minHeight="34rem"><ServicesSection /></DeferredSection>
    <DeferredSection minHeight="28rem"><About /></DeferredSection>
  </>;
}
