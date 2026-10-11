import Logo from '../components/Logo';

export default function PageLoader() {
  return <div role="status" aria-label="Loading page" className="grid min-h-[42svh] place-items-center px-6 py-16">
    <div className="flex flex-col items-center gap-4">
      <Logo className="h-12 sm:h-14" />
      <span className="h-1 w-24 overflow-hidden rounded-full bg-bone/10"><span className="aak-loader-bar block h-full w-1/2 rounded-full bg-cyan" /></span>
      <span className="sr-only">Loading</span>
    </div>
  </div>;
}
