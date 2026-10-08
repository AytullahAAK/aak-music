import RevealText from '../components/RevealText';import AmbientWave from '../components/AmbientWave';import Logo from '../components/Logo';import Button from '../components/Button';import {useUI} from '../hooks/useUI';import {useReveal} from '../hooks/useReveal';
const focus=['EDM','Festival music','Epic electronic music','Cinematic sound','Experimental electronic production'];
export default function About(){const {openArtist}=useUI(),r=useReveal<HTMLDivElement>();
return <section id="about" className="relative px-6 py-32 md:px-12 md:py-44"><AmbientWave className="-top-12"/><div aria-hidden className="pointer-events-none absolute -right-1/4 top-0 h-full w-3/4" style={{background:'radial-gradient(closest-side,rgb(var(--accent) / var(--halo-a)),transparent)'}}/>
<div ref={r} className="reveal relative mx-auto grid max-w-[1600px] gap-14 lg:grid-cols-12"><div className="flex items-center lg:col-span-5"><Logo className="h-28 md:h-44"/></div>
<div className="lg:col-span-6 lg:col-start-7"><RevealText as="h2" className="font-display text-5xl font-extrabold leading-[.92] tracking-[-.03em] md:text-7xl" lines={['ABOUT AAK MUSIC']}/>
<p className="mt-8 max-w-lg text-lg text-bone/75">AAK Music is an independent electronic music brand. Original tracks, made for big sound systems and close listening.</p>
<ul className="mt-10 max-w-lg border-t border-bone/15">{focus.map(f=><li key={f} className="border-b border-bone/15 py-3 font-display text-xl">{f}</li>)}</ul>
<div className="mt-10 flex flex-wrap gap-3"><Button href="#music">LISTEN</Button><Button onClick={()=>openArtist('aak-music')} variant="ghost">VIEW PROFILE</Button></div></div></div></section>}
