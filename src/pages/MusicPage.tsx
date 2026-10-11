import { lazy, Suspense } from 'react';
import PageLoader from './PageLoader';
const Releases = lazy(() => import('../sections/Releases'));
export default function MusicPage() { return <Suspense fallback={<PageLoader />}><Releases /></Suspense>; }
