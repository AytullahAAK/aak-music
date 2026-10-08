import {createContext,useContext,useMemo,useState,ReactNode} from 'react';
export type View={k:'search';q:string}|{k:'artist';id:string}|{k:'event';id:string}|null;
type U={view:View;openSearch:(q?:string)=>void;openArtist:(id:string)=>void;openEvent:(id:string)=>void;close:()=>void};
const Ctx=createContext<U>(null!);export const useUI=()=>useContext(Ctx);
export function UIProvider({children}:{children:ReactNode}){const [view,setView]=useState<View>(null);
const v=useMemo(()=>({view,openSearch:(q='')=>setView({k:'search',q}),openArtist:(id:string)=>setView({k:'artist',id}),openEvent:(id:string)=>setView({k:'event',id}),close:()=>setView(null)}),[view]);
return <Ctx.Provider value={v}>{children}</Ctx.Provider>}
