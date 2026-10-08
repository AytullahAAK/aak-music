import type {Track} from './types';
// PLACEHOLDER releases: replace with your real songs. Media per track: image:'/images/your-cover.jpg', src:'/audio/your-song.mp3' (files live in /public). dur is a fallback until the MP3 reports its own length.
export const tracks:Track[]=[
{id:'t1',title:'Aphelion Drive',artist:'AAK Music',artistIds:['aak-music'],genre:'Melodic Techno',bpm:124,date:'12 Sep 2026',dur:312,a:265,b:195,src:'/audio/test-song.mp3'},
{id:'t2',title:'Glass Cathedral',artist:'AAK Music',artistIds:['aak-music'],genre:'Progressive House',bpm:126,date:'05 Sep 2026',dur:287,a:285,b:320},
{id:'t3',title:'Solar Static',artist:'AAK Music',artistIds:['aak-music'],genre:'Future Bass',bpm:150,date:'29 Aug 2026',dur:214,a:200,b:270},
{id:'t4',title:'Last Light',artist:'AAK Music',artistIds:['aak-music'],genre:'Cinematic',bpm:96,date:'14 Aug 2026',dur:358,a:255,b:215},
{id:'t5',title:'Ritual 808',artist:'AAK Music',artistIds:['aak-music'],genre:'Hardstyle',bpm:150,date:'01 Aug 2026',dur:241,a:300,b:250},
{id:'t6',title:'Tidal Memory',artist:'AAK Music',artistIds:['aak-music'],genre:'Drum & Bass',bpm:174,date:'18 Jul 2026',dur:263,a:190,b:280}];
