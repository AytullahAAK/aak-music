export * from './types';export {tracks} from './tracks';export {artists} from './artists';export {events} from './events';export {genres} from './genres';export {articles} from './articles';export {site} from './site';
import {artists} from './artists';export const artistById=(id:string)=>artists.find(a=>a.id===id);
