import { lazy, Suspense } from 'react';
import PageLoader from './PageLoader';
const LoopStudio = lazy(() => import('../sections/LoopStudio'));
export default function StudioPage() { return <Suspense fallback={<PageLoader />}><LoopStudio /></Suspense>; }
