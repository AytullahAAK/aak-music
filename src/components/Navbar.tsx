import {useEffect,useState} from 'react';import {usePlayer} from '../hooks/usePlayer';import {useUI} from '../hooks/useUI';import {Eq} from './Icon';import Logo from './Logo';import ThemeToggle from './ThemeToggle';
const links=['Music','Artists','Worlds','Events','About'];
export default function Navbar(){const p=usePlayer(),ui=useUI(),[s,setS]=useState(false),[o,setO]=useState(false);
useEffect(()=>{const f=()=>setS(scrollY>40);f();addEventListener('scroll',f,{passive:true});return()=>removeEventListener('scroll',f)},[]);
useEffect(()=>{document.body.style.overflow=o?'hidden':'';const k=(e:KeyboardEvent)=>e.key==='Escape'&&setO(false);addEventListener('keydown',k);return()=>removeEventListener('keydown',k)},[o]);
return <><header className={`fixed inset-x-0 top-0 z-50 transition-all duration-700 ${s?'bg-ink/70 backdrop-blur-xl py-3':'py-6'}`}>
<nav aria-label="Primary" className="mx-auto flex max-w-[1600px] items-center justify-between px-6 md:px-12">
<a href="#top" aria-label="AAK Music home" className="flex items-center"><Logo className="h-7 md:h-20"/></a>
<ul className="hidden items-center gap-10 text-sm text-bone/75 lg:flex">{links.map(l=><li key={l}><a href={`#${l.toLowerCase()}`} className="transition hover:text-bone">{l}</a></li>)}</ul>
<div className="flex items-center gap-5"><a href="#player" className="hidden max-w-[11rem] items-center gap-2 truncate text-xs text-bone/75 transition hover:text-bone md:flex"><Eq on={p.playing}/>{p.track.title}</a>
<button aria-label="Search" onClick={()=>ui.openSearch()} className="text-bone/75 transition hover:text-bone"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></button><span className="hidden lg:block"><ThemeToggle/></span>
<a href="#events" className="hidden rounded-full border border-bone/25 px-5 py-2 text-sm transition hover:border-bone hover:bg-bone hover:text-ink md:block">Get tickets</a>
<button aria-label="Menu" aria-expanded={o} onClick={()=>setO(!o)} className="relative z-[70] h-8 w-8 lg:hidden"><span className={`absolute left-1 top-3 h-px w-6 bg-bone transition ${o?'rotate-45':'-translate-y-1.5'}`}/><span className={`absolute left-1 top-3 h-px w-6 bg-bone transition ${o?'-rotate-45':'translate-y-1.5'}`}/></button></div></nav></header>
<div aria-hidden={!o} className={`fixed inset-0 z-[60] flex flex-col justify-center bg-ink px-8 transition-all duration-700 lg:hidden ${o?'opacity-100':'pointer-events-none opacity-0'}`}>
{links.map((l,i)=><a key={l} tabIndex={o?0:-1} onClick={()=>setO(false)} href={`#${l.toLowerCase()}`} style={{transitionDelay:`${o?i*70:0}ms`}} className={`font-display text-5xl font-extrabold py-2 transition duration-700 ${o?'translate-y-0':'translate-y-6'}`}>{l}</a>)}<button tabIndex={o?0:-1} onClick={()=>{setO(false);ui.openSearch()}} className="mt-6 w-fit text-lg text-bone/75">Search</button><ThemeToggle row focusable={o}/></div></>}
