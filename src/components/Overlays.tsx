import {useUI} from '../hooks/useUI';import Search from './Search';import ArtistPanel from './ArtistPanel';import EventPanel from './EventPanel';
export default function Overlays(){const {view}=useUI();return <>{view?.k==='search'&&<Search q={view.q}/>}{view?.k==='artist'&&<ArtistPanel id={view.id}/>}{view?.k==='event'&&<EventPanel id={view.id}/>}</>}
