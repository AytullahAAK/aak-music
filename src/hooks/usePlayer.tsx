import {createContext,useContext,useEffect,useMemo,useRef,useState,useCallback,ReactNode} from 'react';
import {tracks} from '../data';import {motion} from './motion';import {attachAnalyser} from './analyser';import type {Track} from '../data';
export type Status='idle'|'loading'|'ready'|'error'|'unavailable';
type P={track:Track;i:number;playing:boolean;status:Status;vol:number;play:(i?:number)=>void;toggle:()=>void;next:()=>void;prev:()=>void;seek:(s:number)=>void;setVol:(v:number)=>void};
const Ctx=createContext<P>(null!),TCtx=createContext({t:0,dur:0});
export const usePlayer=()=>useContext(Ctx),useTime=()=>useContext(TCtx); // time lives in its own context so only the player UI re-renders 4x/s
export const fmt=(s:number)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
export const statusLabel=(s:Status)=>s==='unavailable'||s==='error'?'Preview unavailable':s==='loading'?'Loading…':null;
export function PlayerProvider({children}:{children:ReactNode}){
const au=useRef<HTMLAudioElement>(null),[i,setI]=useState(0),[want,setWant]=useState(false),[media,setMedia]=useState<'idle'|'loading'|'ready'|'error'>('idle'),[vol,setVol]=useState(.8),[time,setTime]=useState({t:0,dur:0});
const track=tracks[i],status:Status=!track.src?'unavailable':want&&media==='idle'?'loading':media,playing=want&&!!track.src&&media!=='error';
const go=useCallback((n:number)=>{const k=(n+tracks.length)%tracks.length;setI(k);setMedia('idle');setTime({t:0,dur:0});setWant(!!tracks[k].src)},[]);
useEffect(()=>{const a=au.current;if(!a)return;if(!want||!track.src){a.pause();return}
if(a.error)a.load();attachAnalyser(a);a.play().catch(e=>{if(e.name!=='AbortError'){setMedia('error');setWant(false)}})},[want,i,track.src]);
useEffect(()=>{if(au.current)au.current.volume=vol},[vol]);useEffect(()=>{motion.playing=playing},[playing]);
const play=useCallback((n?:number)=>{if(n===undefined||n===i){setMedia(m=>m==='error'?'idle':m);setWant(!!track.src)}else go(n)},[i,track.src,go]);
const toggle=useCallback(()=>want?setWant(false):play(),[want,play]);
const prev=useCallback(()=>{const a=au.current;if(a&&a.currentTime>3){a.currentTime=0;return}go(i-1)},[i,go]);
const seek=useCallback((s:number)=>{const a=au.current;if(a&&track.src&&isFinite(a.duration)){a.currentTime=s;setTime(x=>({...x,t:s}))}},[track.src]);
const v=useMemo(()=>({track,i,playing,status,vol,play,toggle,next:()=>go(i+1),prev,seek,setVol}),[track,i,playing,status,vol,play,toggle,go,prev,seek]);
const sync=(a:HTMLAudioElement)=>setTime({t:a.currentTime,dur:isFinite(a.duration)?a.duration:0});
return <Ctx.Provider value={v}><TCtx.Provider value={time}>{children}</TCtx.Provider>
<audio ref={au} src={track.src} preload="none" onTimeUpdate={e=>sync(e.currentTarget)} onLoadedMetadata={e=>sync(e.currentTarget)} onWaiting={()=>setMedia('loading')} onCanPlay={()=>setMedia('ready')} onPlaying={()=>setMedia('ready')} onError={()=>{if(track.src){setMedia('error');setWant(false)}}} onEnded={()=>go(i+1)}/></Ctx.Provider>}
