import {useState} from 'react';import {site} from '../data';import {useTheme} from '../hooks/useTheme';
// Shows the supplied PNG untouched (no recolour/filter/crop). Height via className; width follows the aspect ratio.
// The supplied PNG already has transparent corners, so it can sit directly on either theme.
export default function Logo({className='h-10'}:{className?:string}){const [bad,setBad]=useState(false),{theme}=useTheme(),alt=theme==='light'&&site.brand.logoLight;
return bad?<span className="text-lg font-semibold">{site.brand.name}</span>:<span className="inline-flex items-center"><img src={alt||site.brand.logo} alt={site.brand.name} onError={()=>setBad(true)} className={`w-auto max-w-[50vw] object-contain ${className}`}/></span>}
