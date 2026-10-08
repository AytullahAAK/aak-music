import {useEffect,useRef} from 'react';
// Line-by-line mask reveal (slide + blur-to-sharp, 120ms stagger) when the heading enters the viewport.
export default function RevealText({lines,as='h2',className=''}:{lines:string[];as?:'h1'|'h2'|'h3';className?:string}){const r=useRef<HTMLHeadingElement>(null),Tag=as as 'h2';
useEffect(()=>{const el=r.current!,o=new IntersectionObserver(([e])=>{if(e.isIntersecting){el.classList.add('in');o.disconnect()}},{threshold:.3});o.observe(el);return()=>o.disconnect()},[]);
return <Tag ref={r} className={`rt ${className}`}>{lines.map((l,i)=><span key={l} className="block overflow-hidden pb-[.08em]"><span className="rt-in block" style={{transitionDelay:`${i*120}ms`}}>{l}</span></span>)}</Tag>}
