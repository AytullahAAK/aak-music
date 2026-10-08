import {useEffect,useRef} from 'react';import {motion,fine,reduced} from './motion';
// Eased 1-3px drift toward the cursor. Pauses while off-screen; no-op on touch and reduced motion.
export function usePointerShift<T extends HTMLElement>(amp=3){const r=useRef<T>(null);
useEffect(()=>{const el=r.current;if(!el||!fine||reduced)return;let raf=0,x=0,y=0,vis=true;const io=new IntersectionObserver(([e])=>{vis=e.isIntersecting});io.observe(el);
const tick=()=>{raf=requestAnimationFrame(tick);if(!vis||!motion.seen)return;x+=((motion.mx/innerWidth-.5)*2-x)*.06;y+=((motion.my/innerHeight-.5)*2-y)*.06;el.style.translate=`${x*amp}px ${y*amp*.7}px`};
raf=requestAnimationFrame(tick);return()=>{io.disconnect();cancelAnimationFrame(raf)}},[amp]);return r}
