const path=(a:number,k:number)=>Array.from({length:121},(_,i)=>`${i?'L':'M'}${i*20} ${30+Math.sin(i*2*Math.PI*k/60)*a}`).join('');
// Seamless looping sine ribbons used as section dividers (period = half the SVG, so translateX(-50%) loops cleanly).
export default function AmbientWave({className=''}:{className?:string}){return <div aria-hidden className={`pointer-events-none absolute inset-x-0 h-24 overflow-hidden ${className}`}><svg viewBox="0 0 2400 60" preserveAspectRatio="none" className="wave h-full w-[200%]">
<path d={path(10,2)} fill="none" className="stroke-violet/30" strokeWidth="1" vectorEffect="non-scaling-stroke"/><path d={path(7,3)} fill="none" className="stroke-cyan/20" strokeWidth="1" vectorEffect="non-scaling-stroke"/></svg></div>}
