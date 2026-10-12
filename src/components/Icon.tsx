const paths = {
  play: 'M8 5.8v12.4L18.2 12 8 5.8Z',
  pause: 'M8 5.5h3v13H8zM15 5.5h3v13h-3z',
  stop: 'M7 7h10v10H7z',
  prev: 'M6.5 5.5v13M18.5 6v12L8 12l10.5-6Z',
  next: 'M17.5 5.5v13M5.5 6v12L16 12 5.5 6Z',
  volume: 'M4 10v4h3l4 3V7l-4 3H4Zm10-1a5 5 0 0 1 0 6m2.5-8.5a9 9 0 0 1 0 11',
  muted: 'M4 10v4h3l4 3V7l-4 3H4Zm11-1 5 6m0-6-5 6',
  shuffle: 'M16 3h5v5M4 20l6-6m4-4 7-7M14 16l2 2 5 0v-5M4 4l5.5 5.5',
  repeat: 'M17 2l4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3',
  queue: 'M4 6h16M4 12h16M4 18h10',
  close: 'm18 6-12 12M6 6l12 12',
  clear: 'm18 6-12 12M6 6l12 12',
  expand: 'M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7',
  minimize: 'M4 14h6v6M20 10h-6V4M10 14l-7 7M14 10l7-7',
  arrowUp: 'M12 19V5m-7 7 7-7 7 7',
  arrowDown: 'M12 5v14m7-7-7 7-7-7',
  trash: 'M3 6h18M19 6l-1 14H6L5 6m3 0V4h8v2m-7 4v7m4-7v7',
  heart: 'M20.8 8.7c0 5.2-8.8 10.1-8.8 10.1S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.3Z',
  sparkles: 'm12 3-1.8 5.2a2 2 0 0 1-1.2 1.2L4 11l5 1.8a2 2 0 0 1 1.2 1.2L12 19l1.8-5a2 2 0 0 1 1.2-1.2L20 11l-5-1.6a2 2 0 0 1-1.2-1.2L12 3Zm7 13-.7 2.1a1 1 0 0 1-.6.6l-2.2.8 2.2.7a1 1 0 0 1 .6.6L19 23l.7-2.2a1 1 0 0 1 .6-.6l2.2-.7-2.2-.8a1 1 0 0 1-.6-.6L19 16Z',
  listPlus: 'M4 6h11M4 11h11M4 16h6m8-2v8m-4-4h8',
  external: 'M14 4h6v6m0-6-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6',
  search: 'M10.8 4.2a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2ZM16 16l4.5 4.5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  mic: 'M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 0 0-7 0v5A3.5 3.5 0 0 0 12 15Zm-7-4a7 7 0 0 0 14 0m-7 7v3m-4 0h8',
  sun: 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z',
  install: 'M12 3v11m-4-4 4 4 4-4M5 16v4h14v-4',
  settings: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0-6v2m0 15v2M4.8 4.8l1.4 1.4m11.6 11.6 1.4 1.4M2 12h2m16 0h2M4.8 19.2l1.4-1.4M17.8 6.2l1.4-1.4',
  info: 'M12 10.5v6m0-9h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  spectrum: 'M4 19V11m5 8V6m6 13V9m5 10V4',
  sliders: 'M4 6h9m4 0h3M4 12h3m4 0h9M4 18h9m4 0h3M13 4v4m-6 2v4m10 2v4',
  move: 'M8 3 5 6l3 3M16 3l3 3-3 3M5 6h14M8 21l-3-3 3-3m8 6 3-3-3-3M5 18h14M12 5v14',
  pip: 'M3 5h18v14H3zM13 11h6v5h-6z',
} as const;

export type IconName = keyof typeof paths;
const filledIcons = new Set<IconName>(['play', 'pause', 'stop', 'prev', 'next']);

/** One compact, consistent stroke icon family for player and site controls. */
export default function Icon({ n, s = 18, filled }: { n: IconName; s?: number; filled?: boolean }) {
  const isFilled = filled ?? filledIcons.has(n);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill={isFilled ? 'currentColor' : 'none'}
      stroke={isFilled ? 'none' : 'currentColor'}
      strokeWidth={isFilled ? undefined : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[n]} />
    </svg>
  );
}

export const Eq = ({ on }: { on: boolean }) => (
  <span aria-hidden="true" className="eq inline-flex h-3 items-end gap-[2px]" data-on={on}>
    {[0, 1, 2].map((i) => <i key={i} className="w-[2px] bg-cyan" style={{ animationDelay: `${i * 0.2}s` }} />)}
  </span>
);
