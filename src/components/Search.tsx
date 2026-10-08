import {useRef,useState} from 'react';import Dialog,{Close} from './Dialog';import TrackRow from './TrackRow';import {tracks,artists,genres,events} from '../data';import {useUI} from '../hooks/useUI';
const H=({c}:{c:string})=><h3 className="mb-2 mt-10 text-sm text-bone/60">{c}</h3>;
const R=({f,children}:{f:()=>void;children:React.ReactNode})=><li><button onClick={f} className="flex w-full items-baseline justify-between gap-4 border-b border-bone/15 py-3 text-left transition hover:text-cyan">{children}</button></li>;
export default function Search({q:init}:{q:string}){const [q,setQ]=useState(init),{close,openArtist,openEvent}=useUI(),box=useRef<HTMLDivElement>(null);
const s=q.trim().toLowerCase(),m=(...f:string[])=>f.some(x=>x.toLowerCase().includes(s));
const tr=tracks.map((t,i)=>i).filter(i=>m(tracks[i].title,tracks[i].artist,tracks[i].genre)),ar=artists.filter(a=>m(a.name,a.genre)),gn=genres.filter(g=>m(g.name)),ev=events.filter(e=>m(e.name,e.city,e.country,e.venue));
const none=s&&!tr.length&&!ar.length&&!gn.length&&!ev.length;
return <Dialog label="Search" onClose={close}><div className="drop h-full overflow-y-auto bg-ink/95"><Close onClose={close}/>
<div ref={box} className="mx-auto max-w-3xl px-6 pb-24 pt-24"><label htmlFor="q" className="sr-only">Search tracks, artists, genres and events</label>
<input id="q" data-autofocus value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='ArrowDown'&&(e.preventDefault(),box.current?.querySelector<HTMLElement>('ul button')?.focus())} placeholder="Search tracks, artists, cities" autoComplete="off" className="w-full border-b border-bone/30 bg-transparent pb-4 font-display text-3xl font-semibold outline-none placeholder:text-bone/60 focus:border-cyan md:text-5xl"/>
<p className="mt-3 text-xs text-bone/60">Esc to close</p>
{!s&&<><H c="Browse by genre"/><ul className="flex flex-wrap gap-2">{genres.map(g=><li key={g.id}><button onClick={()=>setQ(g.name)} className="rounded-full border border-bone/20 px-4 py-2 text-sm transition hover:border-cyan hover:text-cyan">{g.name}</button></li>)}</ul></>}
{none&&<p role="status" className="mt-16 text-lg text-bone/75">No results for “{q}”. Try an artist, a genre or a city.</p>}
{!!tr.length&&s&&<><H c="Tracks"/><ul>{tr.map(i=><TrackRow key={i} i={i} onPick={close}/>)}</ul></>}
{!!ar.length&&s&&<><H c="Artists"/><ul>{ar.map(a=><R key={a.id} f={()=>openArtist(a.id)}><span className="font-display text-xl">{a.name}</span><span className="text-sm text-bone/60">{a.genre}</span></R>)}</ul></>}
{!!gn.length&&s&&<><H c="Genres"/><ul>{gn.map(g=><R key={g.id} f={()=>setQ(g.name)}><span className="font-display text-xl">{g.name}</span></R>)}</ul></>}
{!!ev.length&&s&&<><H c="Events"/><ul>{ev.map(e=><R key={e.id} f={()=>openEvent(e.id)}><span className="font-display text-xl">{e.name}</span><span className="text-sm text-bone/60">{e.city}, {e.date}</span></R>)}</ul></>}
</div></div></Dialog>}
