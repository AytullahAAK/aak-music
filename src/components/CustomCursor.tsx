import {useEffect,useRef} from 'react';import {motion,fine,reduced} from '../hooks/motion';
export default function CustomCursor(){const d=useRef<HTMLDivElement>(null),g=useRef<HTMLDivElement>(null),s=useRef<HTMLDivElement>(null);
useEffect(()=>{if(!fine||reduced)return;let raf=0,x=0,y=0;
const over=(e:PointerEvent)=>s.current?.classList.toggle('scale-[1.9]',!!(e.target as Element).closest?.('a,button,input,[role=switch]'));
const tick=()=>{raf=requestAnimationFrame(tick);if(!motion.seen)return;x+=(motion.mx-x)*.2;y+=(motion.my-y)*.2;d.current!.style.transform=`translate3d(${motion.mx-2}px,${motion.my-2}px,0)`;g.current!.style.transform=`translate3d(${x-18}px,${y-18}px,0)`};
const vc=()=>{cancelAnimationFrame(raf);if(!document.hidden)raf=requestAnimationFrame(tick)};vc();addEventListener('pointerover',over,{passive:true});document.addEventListener('visibilitychange',vc);
return()=>{cancelAnimationFrame(raf);removeEventListener('pointerover',over);document.removeEventListener('visibilitychange',vc)}},[]);
if(!fine||reduced)return null;
return <><div ref={d} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[95] h-1.5 w-1.5 rounded-full bg-violet shadow-[0_0_12px_rgb(var(--accent)/.8)]"/><div ref={g} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[95] h-9 w-9"><div ref={s} className="h-full w-full rounded-full border border-violet/60 bg-violet/[.04] shadow-[0_0_22px_rgb(var(--accent)/.22)] transition-transform duration-500 ease-out"/></div></>}
