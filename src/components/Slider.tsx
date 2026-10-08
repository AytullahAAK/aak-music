export default function Slider({label,value,max,onChange,disabled,className=''}:{label:string;value:number;max:number;onChange:(v:number)=>void;disabled?:boolean;className?:string}){
const pct=max?Math.min(100,value/max*100):0;
return <div className={`group relative h-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cyan ${disabled?'opacity-50':''} ${className}`}><div className="absolute inset-x-0 top-1/2 h-px bg-bone/20"/><div className="absolute left-0 top-1/2 h-px bg-cyan" style={{width:`${pct}%`}}/>
<span aria-hidden className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bone opacity-0 transition-opacity group-hover:opacity-100" style={{left:`${pct}%`}}/>
<input aria-label={label} disabled={disabled} type="range" min={0} max={max||1} step="any" value={value} onChange={e=>onChange(+e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"/></div>}
