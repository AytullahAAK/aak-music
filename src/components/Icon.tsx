const P={play:'M7 4.5v15l12-7.5z',pause:'M6 4h4v16H6zM14 4h4v16h-4z',prev:'M6 5h2v14H6zM20 5v14L9 12z',next:'M16 5h2v14h-2zM4 5v14l11-7z'};
export default function Icon({n,s=18}:{n:keyof typeof P;s?:number}){return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d={P[n]}/></svg>}
export const Eq=({on}:{on:boolean})=><span aria-hidden className="eq inline-flex h-3 items-end gap-[2px]" data-on={on}>{[0,1,2].map(i=><i key={i} className="w-[2px] bg-cyan" style={{animationDelay:`${i*.2}s`}}/>)}</span>;
