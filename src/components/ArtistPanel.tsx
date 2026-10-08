import Dialog,{Close} from './Dialog';import Art from './Art';import Button from './Button';import TrackRow from './TrackRow';import {artistById,tracks} from '../data';import {useUI} from '../hooks/useUI';import {usePlayer} from '../hooks/usePlayer';
export default function ArtistPanel({id}:{id:string}){const {close}=useUI(),p=usePlayer(),a=artistById(id);if(!a)return null;
const mine=tracks.map((t,i)=>i).filter(i=>tracks[i].artistIds.includes(id));
return <Dialog label={a.name} onClose={close}><div className="sheet ml-auto h-full w-full max-w-xl overflow-y-auto bg-raised"><Close onClose={close}/>
<Art a={a.a} b={a.b} image={a.image} className="aspect-[4/3] w-full"/><div className="p-6 pb-16 md:p-10"><p className="text-sm text-cyan">{a.genre}</p>
<h2 className="mt-2 font-display text-5xl font-extrabold leading-[.92] tracking-[-.03em] md:text-6xl">{a.name}</h2><p className="mt-5 max-w-md text-bone/75">{a.bio}</p>
{mine.length>0?<><div className="mt-8"><Button onClick={()=>p.play(mine[0])}>PLAY LATEST</Button></div><h3 className="mb-2 mt-10 text-sm text-bone/60">Tracks</h3><ul>{mine.map(i=><TrackRow key={i} i={i}/>)}</ul></>:<p className="mt-10 text-bone/60">No releases yet.</p>}</div></div></Dialog>}
