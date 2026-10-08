import {useEffect,useRef,ReactNode} from 'react';
// Native <dialog>: browser-managed focus trap, Escape, inert background and focus return. Mount to open, unmount to close.
export default function Dialog({label,onClose,children}:{label:string;onClose:()=>void;children:ReactNode}){const r=useRef<HTMLDialogElement>(null);
useEffect(()=>{const d=r.current!;if(!d.open)d.showModal();d.querySelector<HTMLElement>('[data-autofocus]')?.focus();document.body.style.overflow='hidden';return()=>{document.body.style.overflow='';if(d.open)d.close()}},[]);
return <dialog ref={r} aria-label={label} onClose={onClose} onClick={e=>{if(e.target===r.current)onClose()}} className="dlg">{children}</dialog>}
export const Close=({onClose}:{onClose:()=>void})=><button aria-label="Close" onClick={onClose} className="absolute right-5 top-5 z-10 grid h-11 w-11 place-items-center rounded-full border border-bone/25 transition hover:border-bone"><svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="m1 1 12 12M13 1 1 13"/></svg></button>;
