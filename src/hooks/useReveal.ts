import {useEffect,useRef} from 'react';
export function useReveal<T extends HTMLElement>(){const r=useRef<T>(null);
useEffect(()=>{const el=r.current;if(!el)return;const o=new IntersectionObserver(([e])=>{if(e.isIntersecting){el.classList.add('in');o.disconnect()}},{threshold:.15});o.observe(el);return()=>o.disconnect()},[]);return r}
