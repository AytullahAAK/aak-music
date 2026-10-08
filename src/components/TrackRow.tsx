import Art from './Art';import Icon,{Eq} from './Icon';import {tracks} from '../data';import {usePlayer} from '../hooks/usePlayer';
export default function TrackRow({i,onPick}:{i:number;onPick?:()=>void}){const p=usePlayer(),t=tracks[i],cur=p.i===i&&p.playing;
return <li><button onClick={()=>{cur?p.toggle():p.play(i);onPick?.()}} aria-label={`${cur?'Pause':'Play'} ${t.title} by ${t.artist}`} className="group flex w-full items-center gap-4 border-b border-bone/15 py-3 text-left">
<Art a={t.a} b={t.b} image={t.image} className="h-12 w-12 shrink-0"/><span className="min-w-0 flex-1"><span className="block truncate font-medium">{t.title}</span><span className="block truncate text-sm text-bone/60">{t.artist}, {t.genre}{t.src?'':' (preview soon)'}</span></span>
{cur&&<Eq on/>}<span className="text-bone/75 transition group-hover:text-cyan"><Icon n={cur?'pause':'play'}/></span></button></li>}
