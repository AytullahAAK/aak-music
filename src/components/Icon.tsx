const P = {
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  prev: 'M6 5h2v14H6zM20 5v14L9 12z',
  next: 'M16 5h2v14h-2zM4 5v14l11-7z',
  volume: 'M3 9v6h4l5 4V5L7 9H3zm12.5-.5a5 5 0 0 1 0 7m2.5-9.5a8.5 8.5 0 0 1 0 12',
  muted: 'M3 9v6h4l5 4V5L7 9H3zm13-.5 6 7m0-7-6 7',
  shuffle: 'm16 3 5 5-5 5M4 20l5.5-5.5M4 4l16 16m-5 1h6v-6M4 20l4-4',
  repeat: 'M17 1l4 4-4 4M3 11V8a3 3 0 0 1 3-3h15M7 23l-4-4 4-4m14-2v3a3 3 0 0 1-3 3H3',
  queue: 'M4 6h16M4 12h16M4 18h10',
  close: 'M18 6L6 18M6 6l12 12',
  expand: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
  minimize: 'M4 14h6v6M20 10h-6V4M10 14l-7 7M14 10l7-7',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M19 12l-7 7-7-7',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  sparkles: 'm12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z',
  listPlus: 'M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z',
  external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3',
};

export default function Icon({ n, s = 18 }: { n: keyof typeof P; s?: number }) {
  const isStroke = ['queue', 'close', 'expand', 'minimize', 'arrowUp', 'arrowDown', 'trash', 'external'].includes(n);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill={isStroke ? 'none' : 'currentColor'}
      stroke={isStroke ? 'currentColor' : 'none'}
      strokeWidth={isStroke ? 2 : undefined}
      strokeLinecap={isStroke ? 'round' : undefined}
      strokeLinejoin={isStroke ? 'round' : undefined}
      aria-hidden
    >
      <path d={P[n]} />
    </svg>
  );
}

export const Eq = ({ on }: { on: boolean }) => (
  <span aria-hidden className="eq inline-flex h-3 items-end gap-[2px]" data-on={on}>
    {[0, 1, 2].map((i) => (
      <i key={i} className="w-[2px] bg-cyan" style={{ animationDelay: `${i * 0.2}s` }} />
    ))}
  </span>
);
