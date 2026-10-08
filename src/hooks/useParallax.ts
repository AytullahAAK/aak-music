import {useEffect,useRef} from 'react';
// Moves the element relative to its parent's distance from viewport centre. Negative k drifts against the scroll.
export function useParallax<T extends HTMLElement>(k=.1){const r=useRef<T>(null);
useEffect(()=>{if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;let id=0;
const f=()=>{cancelAnimationFrame(id);id=requestAnimationFrame(()=>{const el=r.current;if(!el)return;const b=el.parentElement!.getBoundingClientRect();el.style.transform=`translate3d(0,${(b.top+b.height/2-innerHeight/2)*k}px,0)`})};
f();addEventListener('scroll',f,{passive:true});return()=>{removeEventListener('scroll',f);cancelAnimationFrame(id)}},[k]);return r}
