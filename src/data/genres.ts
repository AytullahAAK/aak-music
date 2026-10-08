import type {Genre} from './types';
export const genres:Genre[]=[['EDM',270,200],['Progressive House',285,320],['Future Bass',200,300],['Melodic Techno',255,195],['Festival',310,260],['Cinematic',230,210],['Trap',290,240],['Hardstyle',320,270],['House',215,280],['Drum & Bass',190,265]].map(([n,a,b])=>({id:String(n).toLowerCase().replace(/\W+/g,'-'),name:String(n),a:+a,b:+b}));
