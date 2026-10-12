import Icon from './Icon';
import {useEffect,useRef,ReactNode} from 'react';
// Native <dialog>: browser-managed focus trap, Escape, inert background and focus return. Mount to open, unmount to close.
export default function Dialog({label,onClose,children}:{label:string;onClose:()=>void;children:ReactNode}){const r=useRef<HTMLDialogElement>(null);
useEffect(()=>{const d=r.current!;if(!d.open)d.showModal();d.querySelector<HTMLElement>('[data-autofocus]')?.focus();document.body.style.overflow='hidden';return()=>{document.body.style.overflow='';if(d.open)d.close()}},[]);
return <dialog ref={r} aria-label={label} onClose={onClose} onClick={e=>{if(e.target===r.current)onClose()}} className="dlg">{children}</dialog>}
export const Close=({onClose}:{onClose:()=>void})=><button type="button" aria-label="Close" title="Close" onClick={onClose} className="absolute right-5 top-5 z-10 grid h-11 w-11 place-items-center rounded-full border border-bone/25 transition hover:border-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan"><Icon n="close" s={16}/></button>;
