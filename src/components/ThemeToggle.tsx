import Icon from './Icon';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle({ row, focusable = true }: { row?: boolean; focusable?: boolean }) {
  const { theme, toggle } = useTheme();
  const light = theme === 'light';

  if (row) return (
    <div role="group" aria-label="Color theme" className="relative grid w-[9.5rem] shrink-0 grid-cols-2 overflow-hidden rounded-lg border border-bone/10 bg-ink/40 text-xs">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1/2 bg-bone transition-transform duration-200" style={{ transform: `translateX(${light ? '100%' : '0'})` }} />
      {(['dark', 'light'] as const).map((mode) => (
        <button key={mode} type="button" tabIndex={focusable ? 0 : -1} aria-pressed={theme === mode} onClick={() => theme !== mode && toggle()} className={`relative z-[1] flex min-h-10 items-center justify-center gap-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan ${theme === mode ? 'text-ink' : 'text-bone/75'}`}>
          <Icon n={mode === 'dark' ? 'moon' : 'sun'} s={15} />{mode === 'dark' ? 'Dark' : 'Light'}
        </button>
      ))}
    </div>
  );

  return (
    <button type="button" role="switch" aria-checked={light} aria-label={light ? 'Switch to dark theme' : 'Switch to light theme'} title={light ? 'Switch to dark theme' : 'Switch to light theme'} onClick={toggle} className="relative grid h-10 w-10 place-items-center rounded-full text-bone/75 transition-colors hover:bg-bone/10 hover:text-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan">
      <Icon n={light ? 'moon' : 'sun'} s={18} />
    </button>
  );
}
