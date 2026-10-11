import { RouteLink } from '../router';
export default function NotFoundPage() {
  return <section className="grid min-h-[70svh] place-items-center px-5 py-20 text-center"><div><p className="font-mono text-xs text-cyan">404 · PAGE NOT FOUND</p><h1 className="mt-3 font-display text-4xl font-bold">This page isn’t in the mix.</h1><RouteLink to="/" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-bone px-5 text-sm font-bold text-ink">Return home</RouteLink></div></section>;
}
