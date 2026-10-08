import {useState} from 'react';
// Generated cover art is the fallback; a real `image` (e.g. /images/x.jpg) replaces it, and falls back again if the file 404s.
export default function Art({a,b,image,className=''}:{a:number;b:number;image?:string;className?:string}){
const [bad,setBad]=useState(false),x=22+(a%7)*9,y=28+(b%5)*9,real=!!image&&!bad;
return <div aria-hidden className={`drift relative overflow-hidden rounded-[18px] border border-black/10 ${className}`} style={{backgroundSize:'140% 140%,140% 140%,auto',
backgroundImage:`radial-gradient(110% 80% at 20% 10%,hsl(${a} 85% 58%/.85),transparent 58%),radial-gradient(90% 90% at 85% 95%,hsl(${b} 90% 48%/.8),transparent 62%),linear-gradient(#0b0814,#0b0814)`}}>
{real?<img src={image} alt="" loading="lazy" onError={()=>setBad(true)} className="absolute inset-0 h-full w-full object-cover"/>:
<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">{[12,24,38,56].map(r=><circle key={r} cx={x} cy={y} r={r} fill="none" stroke="#fff" strokeOpacity={.4-r/200} strokeWidth=".22"/>)}<circle cx={x} cy={y} r="1.6" fill="#fff" fillOpacity=".9"/><line x1="0" x2="100" y1="80" y2="80" stroke="#fff" strokeOpacity=".28" strokeWidth=".2"/></svg>}
<div className="absolute inset-0" style={{background:'radial-gradient(120% 100% at 50% 0%,transparent 45%,rgb(var(--art-overlay) / .34))'}}/></div>}
