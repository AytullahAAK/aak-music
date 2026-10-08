import {useEffect,useRef} from 'react';import {motion,fine,reduced} from '../hooks/motion';
// Large, soft light that eases toward the cursor (lerp .06). Violet base; a cyan layer breathes in and out with scroll position. Desktop mouse only.
export default function CursorGlow(){const r=useRef<HTMLDivElement>(null),b=useRef<HTMLDivElement>(null);
useEffect(()=>{if(!fine||reduced)return;let raf=0,x=innerWidth/2,y=innerHeight/2;
const tick=()=>{raf=requestAnimationFrame(tick);if(!motion.seen)return;x+=(motion.mx-x)*.06;y+=(motion.my-y)*.06;r.current!.style.transform=`translate3d(${x-300}px,${y-300}px,0)`;
const p=scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight);b.current!.style.opacity=String(.5-.5*Math.cos(p*Math.PI*4))};
const vc=()=>{cancelAnimationFrame(raf);if(!document.hidden)raf=requestAnimationFrame(tick)};vc();document.addEventListener('visibilitychange',vc);
return()=>{cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',vc)}},[]);
if(!fine||reduced)return null;
return <div ref={r} aria-hidden className="pointer-events-none fixed left-0 top-0 -z-10 h-[600px] w-[600px] will-change-transform" style={{opacity:'var(--cursor-a)',mixBlendMode:'multiply'}}><div className="absolute inset-0 rounded-full blur-2xl" style={{background:'radial-gradient(closest-side,rgb(var(--accent)),transparent)'}}/><div ref={b} className="absolute inset-0 rounded-full blur-2xl" style={{opacity:0,background:'radial-gradient(closest-side,rgb(var(--accent2)),transparent)'}}/></div>}
