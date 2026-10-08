import {createContext,useContext,useMemo,useState,ReactNode} from 'react';
export type Theme='dark'|'light';
const Ctx=createContext<{theme:Theme;toggle:()=>void}>(null!);export const useTheme=()=>useContext(Ctx);
// index.html applies the saved theme before first paint (no flash); light is the default. Colours live in src/index.css.
export function ThemeProvider({children}:{children:ReactNode}){
const [theme,setTheme]=useState<Theme>(()=>document.documentElement.dataset.theme==='dark'?'dark':'light');
const v=useMemo(()=>({theme,toggle:()=>{const n:Theme=theme==='dark'?'light':'dark',d=document.documentElement;
if(!matchMedia('(prefers-reduced-motion:reduce)').matches){d.classList.add('theme-anim');setTimeout(()=>d.classList.remove('theme-anim'),700)}
d.dataset.theme=n;document.querySelector('meta[name=theme-color]')?.setAttribute('content',n==='light'?'#f3f1ee':'#07060c');try{localStorage.setItem('aak-theme-v2',n)}catch{}setTheme(n)}}),[theme]);
return <Ctx.Provider value={v}>{children}</Ctx.Provider>}
