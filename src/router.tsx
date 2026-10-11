import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

const routeChangeEvent = 'aak:route-change';
const readLocation = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;
const subscribe = (listener: () => void) => {
  window.addEventListener('popstate', listener);
  window.addEventListener(routeChangeEvent, listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener(routeChangeEvent, listener);
  };
};

export function useLocation() {
  return useSyncExternalStore(subscribe, readLocation, () => '/');
}

export function navigate(to: string, options: { replace?: boolean } = {}) {
  const target = new URL(to, window.location.href);
  if (target.origin !== window.location.origin) {
    window.location.assign(target.href);
    return;
  }
  const next = `${target.pathname}${target.search}${target.hash}`;
  if (options.replace) window.history.replaceState(null, '', next);
  else window.history.pushState(null, '', next);
  window.dispatchEvent(new Event(routeChangeEvent));
}

type RouteLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };
export function RouteLink({ to, onClick, ...props }: RouteLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (props.target && props.target !== '_self') return;
    if (props.download !== undefined) return;
    const target = new URL(to, window.location.href);
    if (target.origin !== window.location.origin) return;
    event.preventDefault();
    navigate(to);
  };
  return <a {...props} href={to} onClick={handleClick} />;
}
