import {useEffect} from 'react';
// Shared, non-React animation state. High-frequency values (pointer, audio levels) live here and are read inside rAF loops, never in React state.
const mq=(q:string)=>typeof matchMedia!=='undefined'&&matchMedia(q).matches;
export const fine=mq('(hover:hover) and (pointer:fine)'),reduced=mq('(prefers-reduced-motion:reduce)');
export const motion={mx:0,my:0,seen:false,level:0,bass:0,bands:new Float32Array(32),playing:false};
export function usePointerTracking(){useEffect(()=>{if(!fine||reduced)return;
const f=(e:PointerEvent)=>{if(e.pointerType==='mouse'){motion.mx=e.clientX;motion.my=e.clientY;motion.seen=true}};
addEventListener('pointermove',f,{passive:true});return()=>removeEventListener('pointermove',f)},[])}
