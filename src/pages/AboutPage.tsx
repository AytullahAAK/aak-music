import { lazy, Suspense } from 'react';
import PageLoader from './PageLoader';
const About = lazy(() => import('../sections/About'));
const Artists = lazy(() => import('../sections/Artists'));
const Services = lazy(() => import('../sections/ServicesSection'));
export default function AboutPage() { return <><Suspense fallback={<PageLoader />}><About /><Artists /><Services /></Suspense></>; }
