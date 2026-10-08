import {useEffect,useRef} from 'react';import {motion,fine,reduced} from '../hooks/motion';
// Drifting dust that is gently pushed away from the cursor (150px), brightens near it, and draws faint links only between close pairs near it.
// Paused off-screen / hidden tab; static single frame under reduced motion; 34 particles on touch devices.
export default function InteractiveParticles(){const c=useRef<HTMLCanvasElement>(null);
useEffect(()=>{const cv=c.current!,x=cv.getContext('2d')!;let w=0,h=0,raf=0,vis=true;
const ps=Array.from({length:fine?70:34},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.4+.4,v:Math.random()*.00006+.00002,dx:0,dy:0,X:0,Y:0,n:0}));
const fit=()=>{w=cv.width=cv.offsetWidth;h=cv.height=cv.offsetHeight};fit();addEventListener('resize',fit);
const draw=()=>{x.clearRect(0,0,w,h);const col=getComputedStyle(document.documentElement).getPropertyValue('--particle'),rc=cv.getBoundingClientRect(),mx=motion.mx-rc.left,my=motion.my-rc.top,on=fine&&motion.seen&&!reduced,e=1+motion.level*2;const near:typeof ps=[];
for(const p of ps){if(!reduced){p.y-=p.v*16*e;if(p.y<0)p.y=1}p.n=0;let X=p.x*w+p.dx,Y=p.y*h+p.dy;
if(on){const ax=X-mx,ay=Y-my,d=Math.hypot(ax,ay)||1;if(d<150){const f=(1-d/150)*1.4;p.dx+=ax/d*f;p.dy+=ay/d*f;p.n=1-d/150}}
p.dx*=.94;p.dy*=.94;p.X=p.x*w+p.dx;p.Y=p.y*h+p.dy;x.fillStyle=`rgb(${col} / ${Math.min(1,.2+p.r*.22+p.n*.5)})`;x.beginPath();x.arc(p.X,p.Y,p.r+p.n*.8,0,7);x.fill();if(p.n>.15)near.push(p)}
x.lineWidth=.6;for(let i=0;i<near.length;i++)for(let j=i+1;j<near.length;j++){const d=Math.hypot(near[i].X-near[j].X,near[i].Y-near[j].Y);if(d<80){x.strokeStyle=`rgb(${col} / ${(1-d/80)*.25})`;x.beginPath();x.moveTo(near[i].X,near[i].Y);x.lineTo(near[j].X,near[j].Y);x.stroke()}}};
const tick=()=>{raf=requestAnimationFrame(tick);draw()};
const go=()=>{cancelAnimationFrame(raf);if(!vis||document.hidden)return;reduced?draw():tick()};
const io=new IntersectionObserver(([e])=>{vis=e.isIntersecting;go()});io.observe(cv);document.addEventListener('visibilitychange',go);
return()=>{io.disconnect();cancelAnimationFrame(raf);removeEventListener('resize',fit);document.removeEventListener('visibilitychange',go)}},[]);
return <canvas ref={c} aria-hidden className="absolute inset-0 h-full w-full"/>}
