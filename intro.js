/* TRACE SUTRA – hold-to-enter welcome screen with a live "freeze the network" scene */
(function(){
const I=document.getElementById("intro"),hb=document.getElementById("hb"),bar=hb.querySelector("i"),T=document.getElementById("it"),cv=document.getElementById("ig"),ctx=cv.getContext("2d"),fz=document.querySelector("#fz b"),steps=[...document.querySelectorAll(".steps span")];
const RM=matchMedia("(prefers-reduced-motion:reduce)").matches;
let t0=0,raf=0,done=false,target=0,cur=0,W=0,H=0,dpr=1,loop=0;
/* network layout in 0..1 coordinates */
const V=[.1,.27,.44,.6,.76,.9,.18].map((y,i)=>({x:.06+(i%2)*.02,y:i===6?.35:y}));
const M=[[.27,.2],[.3,.52],[.34,.84],[.45,.36],[.48,.7],[.58,.18],[.6,.52],[.74,.3],[.74,.7]].map(([x,y])=>({x,y}));
const C=[{x:.94,y:.3},{x:.94,y:.7}];
const N=M.length;
const E=[];const add=(a,b)=>E.push({a,b});
[[0,0],[1,0],[2,1],[3,1],[4,2],[5,2],[6,0]].forEach(([v,m])=>add({k:"v",i:v},{k:"m",i:m}));
[[0,3],[1,3],[1,4],[2,4],[3,5],[3,6],[4,6],[4,8],[5,7],[6,7],[6,8]].forEach(([a,b])=>add({k:"m",i:a},{k:"m",i:b}));
[[7,0],[7,1],[8,1],[6,0]].forEach(([m,c])=>add({k:"m",i:m},{k:"c",i:c}));
const P=n=>n.k==="v"?V[n.i]:n.k==="m"?M[n.i]:C[n.i];
const frozen=i=>i<Math.floor(cur*(N+.999));
const pk=[];const bursts=[];
function size(){dpr=Math.min(2,devicePixelRatio||1);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
function css(n,f){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||f}
function draw(){
 const dark=document.documentElement.dataset.theme==="dark",mut=css("--mut","#4d5566"),acc=css("--acc","#b45309"),navy=css("--navy2","#0b2a7a");
 const red=dark?"#ff6b6b":"#c62828",ice=dark?"#9fe0ff":"#bfe6ff",line=dark?"rgba(255,255,255,.35)":"rgba(60,40,20,.28)";
 const X=x=>12+x*(W-24),Y=y=>26+y*(H-44);
 ctx.clearRect(0,0,W,H);
 ctx.font="600 11px 'Noto Sans',system-ui,sans-serif";ctx.fillStyle=mut;ctx.textAlign="center";
 ctx.fillText("VICTIMS",X(.07),14);ctx.fillText("MULE ACCOUNTS",X(.5),14);ctx.fillText("CASH-OUT",X(.94),14);
 E.forEach(e=>{const a=P(e.a),b=P(e.b),dead=e.a.k==="m"&&frozen(e.a.i);ctx.beginPath();ctx.setLineDash(dead?[3,5]:[]);ctx.strokeStyle=dead?(dark?"rgba(159,224,255,.5)":"rgba(11,42,122,.35)"):line;ctx.lineWidth=1.3;ctx.moveTo(X(a.x),Y(a.y));ctx.lineTo(X(b.x),Y(b.y));ctx.stroke()});
 ctx.setLineDash([]);
 V.forEach(v=>{ctx.beginPath();ctx.arc(X(v.x),Y(v.y),5.5,0,7);ctx.fillStyle=dark?"#fff":"#5b6478";ctx.fill()});
 M.forEach((m,i)=>{const x=X(m.x),y=Y(m.y),f=frozen(i);ctx.beginPath();ctx.arc(x,y,9,0,7);ctx.fillStyle=f?ice:red;ctx.fill();if(f){ctx.lineWidth=2.5;ctx.strokeStyle=dark?"#fff":navy;ctx.stroke();ctx.beginPath();ctx.arc(x,y,14,0,7);ctx.lineWidth=1.2;ctx.strokeStyle=dark?"#9fe0ff":"#4a8fd8";ctx.setLineDash([2,3]);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=navy;ctx.font="700 10px system-ui";ctx.fillText("✕",x,y+3.5)}});
 C.forEach(c=>{const x=X(c.x),y=Y(c.y);ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle=acc;ctx.fillRect(-9,-9,18,18);ctx.restore();ctx.fillStyle=dark?"#000":"#fff";ctx.font="700 11px system-ui";ctx.fillText("₹",x,y+4)});
 pk.forEach(p=>{const a=P(p.e.a),b=P(p.e.b),x=X(a.x+(b.x-a.x)*p.t),y=Y(a.y+(b.y-a.y)*p.t);ctx.beginPath();ctx.arc(x,y,4.2,0,7);ctx.fillStyle=acc;ctx.shadowColor=acc;ctx.shadowBlur=8;ctx.fill();ctx.shadowBlur=0});
 bursts.forEach(b=>{ctx.beginPath();ctx.arc(X(b.x),Y(b.y),9+b.r,0,7);ctx.strokeStyle="rgba(11,42,122,"+(1-b.r/22)+")";ctx.lineWidth=2;ctx.stroke()});
}
let last=0;
function frame(t){
 const dt=Math.min(40,t-last||16);last=t;cur+=(target-cur)*Math.min(1,dt/90);if(Math.abs(target-cur)<.002)cur=target;
 const live=E.filter(e=>!(e.a.k==="m"&&frozen(e.a.i)));
 if(live.length&&Math.random()<.22+dt/120*.1)pk.push({e:live[Math.random()*live.length|0],t:0,s:.0014+Math.random()*.0018});
 for(let i=pk.length-1;i>=0;i--){const p=pk[i];p.t+=p.s*dt;const tg=p.e.b;if(p.t>=1||(p.e.a.k==="m"&&frozen(p.e.a.i)&&p.t<.3)){pk.splice(i,1);continue}
  if(tg.k==="m"&&frozen(tg.i)&&p.t>.86){const b=P(tg);bursts.push({x:b.x,y:b.y,r:0});pk.splice(i,1)}else if(p.t>=1)pk.splice(i,1)}
 for(let i=bursts.length-1;i>=0;i--){bursts[i].r+=.5*dt/16;if(bursts[i].r>=22)bursts.splice(i,1)}
 state();draw();loop=requestAnimationFrame(frame)}
function state(){const n=Math.min(N,Math.floor(cur*(N+.999)));fz.textContent=n;steps.forEach((s,i)=>s.classList.toggle("lit",cur>=i*.25+(i?0.02:0)&&(cur>0||i===0&&false)))}
function setP(p){target=p;if(RM){cur=p;state();draw()}}
size();addEventListener("resize",()=>{size();draw()});
if(RM){state();draw()}else{loop=requestAnimationFrame(frame)}
/* hold to enter */
const enter=()=>{if(done)return;done=true;cancelAnimationFrame(loop);I.classList.add("out");setTimeout(()=>I.remove(),750)};
const tick=t=>{if(!t0)return;const p=Math.min(1,(t-t0)/1600);bar.style.transform="scaleX("+p+")";setP(p);if(p>=1)setTimeout(enter,350);else raf=requestAnimationFrame(tick)};
const down=()=>{if(t0||done)return;t0=performance.now();raf=requestAnimationFrame(tick);hb.classList.add("holding")},up=()=>{if(done)return;if(target>=1)return;t0=0;cancelAnimationFrame(raf);bar.style.transform="scaleX(0)";setP(0);hb.classList.remove("holding")};
addEventListener("keydown",e=>{if(done)return;if(e.code==="Space"){e.preventDefault();if(!e.repeat)down()}else if(e.key==="Enter"&&e.target.id==="sk")enter()});addEventListener("keyup",e=>{if(e.code==="Space")up()});
hb.addEventListener("pointerdown",down);addEventListener("pointerup",up);document.getElementById("sk").onclick=enter;
if(!RM)addEventListener("mousemove",e=>{if(!done)T.style.transform="translate("+(e.clientX/innerWidth-.5)*14+"px,"+(e.clientY/innerHeight-.5)*8+"px)"});
hb.focus({preventScroll:true})})();
