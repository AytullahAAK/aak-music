import {useParallax} from '../hooks/useParallax';
export default function Immersive(){const g1=useParallax<HTMLDivElement>(.12),g2=useParallax<HTMLDivElement>(-.18);
return <section className="relative grid min-h-[110vh] place-items-center overflow-hidden">
<div ref={g1} aria-hidden className="absolute -inset-[20%]" style={{background:'radial-gradient(40% 50% at 30% 40%,rgb(var(--accent) / var(--glow-a)),transparent 70%)',filter:'blur(30px)'}}/>
<div ref={g2} aria-hidden className="absolute -inset-[20%]" style={{background:'radial-gradient(35% 45% at 76% 62%,rgb(var(--accent2) / calc(var(--glow-a) * .6)),transparent 70%)',filter:'blur(40px)'}}/>

<h2 className="relative px-6 font-display text-[clamp(2.4rem,9vw,9rem)] font-extrabold leading-[.9] tracking-[-.035em] md:px-12"><span className="block">FEEL THE<br/>SOUND.</span><span className="mt-2 block text-transparent [-webkit-text-stroke:1.5px_rgb(var(--fg))] md:ml-[16vw]">SEE THE<br/>FREQUENCY.</span></h2></section>}
