const tm=m=>{const t=540+m,d=Math.floor(t/1440);return (d?"D"+(d+1)+" ":"")+String(Math.floor(t/60)%24).padStart(2,"0")+":"+String(t%60).padStart(2,"0")};
/* TRACE SUTRA – entity resolution, mule scoring, gang linking */
function analyse(D,prop=true,TH=60){const par={},f=x=>par[x]===undefined?(par[x]=x):par[x]===x?x:(par[x]=f(par[x])),u=(a,b)=>{par[f(a)]=f(b)};
const nk=m=>{const k=[];if(m.acct)k.push("a:"+m.acct.replace(/\D/g,""));if(m.upi)k.push("u:"+m.upi.toLowerCase().replace(/\s/g,""));if(m.phone)k.push("p:"+m.phone.replace(/\D/g,"").slice(-10));return k};
D.ments.forEach(m=>{m._k=nk(m);m._k.forEach(x=>u(m._k[0],x))});
const E={};D.ments.forEach(m=>{const r=f(m._k[0]);(E[r]=E[r]||{ms:[]}).ms.push(m)});
const ents=Object.values(E);ents.forEach(e=>{e.acc=e.ms.find(m=>m.src==="Bank KYC").accId;e.names=[...new Set(e.ms.map(m=>m.name))];e.n=e.ms.length});
const cm=D.ments.filter(m=>m.truth),ok=cm.filter(m=>ents.find(e=>e.ms.includes(m)).acc===m.truth).length;
const A={};D.accts.forEach(a=>A[a.id]={...a,in:0,out:0,ins:[],outs:[],snd:new Set(),rcv:new Set()});
D.txns.forEach(t=>{const T=A[t.to],F=A[t.from];if(T){T.in+=t.amt;T.ins.push(t);T.snd.add(t.from)}if(F){F.out+=t.amt;F.outs.push(t);F.rcv.add(t.to)}});
const dv={};D.accts.forEach(a=>(dv[a.dev]=dv[a.dev]||[]).push(a.id));
const rcm={};D.accts.forEach(a=>a.rec&&(rcm[a.rec]=(rcm[a.rec]||0)+1));
Object.values(A).forEach(a=>{a.bal=Math.max(0,a.in-a.out);a.why=[];a.ev=[];let s=0;const add=(p,w,x)=>{s+=p;a.why.push(w);a.ev.push(x||[])},tx=t=>t.id+": "+t.from+" → "+t.to+" ₹"+t.amt.toLocaleString("en-IN")+" at "+tm(t.t);
const pr=a.outs.map(o=>{const i=a.ins.filter(i=>i.t<=o.t).sort((x,y)=>y.t-x.t)[0];return i&&{i,o,d:o.t-i.t}}).filter(Boolean).sort((x,y)=>x.d-y.d),dl=pr.map(p=>p.d),med=dl[Math.floor(dl.length/2)];
const sd=dv[a.dev].length>1,rs=a.rec&&rcm[a.rec]>=3,rn=a.outs.length?a.outs.filter(o=>o.amt%500===0).length/a.outs.length:0;
a.f=[Math.min(a.snd.size,8)/8,Math.min(a.rcv.size,4)/4,a.in?Math.min(1,a.out/a.in):0,med===undefined?1:Math.min(med,120)/120,rn,Math.min(a.age,400)/400,sd?1:0,rs?1:0];
if(sd)add(25,"Device "+a.dev+" shared with "+(dv[a.dev].length-1)+" other accounts",["KYC records list "+a.dev+" for: "+dv[a.dev].join(", ")]);
if(med!==undefined&&med<30)add(25,"Passes money onward in a median "+med+" min",pr.slice(0,2).map(p=>"In "+tx(p.i)+" → out "+tx(p.o)+" ("+p.d+" min later)"));
if(a.snd.size>=3)add(15,"Fan-in from "+a.snd.size+" distinct senders",a.ins.slice(0,4).map(tx));
if(a.rcv.size>=2)add(10,"Fan-out to "+a.rcv.size+" accounts",a.outs.slice(0,4).map(tx));
if(rn>.5)add(10,"Round-number transfers dominate outflow",a.outs.filter(o=>o.amt%500===0).slice(0,3).map(tx));
if(a.in&&a.out/a.in>.85)add(10,"Over "+Math.round(a.out/a.in*100)+"% of inflow forwarded",["Inflow ₹"+a.in.toLocaleString("en-IN")+", outflow ₹"+a.out.toLocaleString("en-IN")]);
if(a.age<60)add(15,"Young account ("+a.age+" days old)",["KYC record: account opened "+a.age+" days before the case window"]);
if(rs)add(10,"Onboarded via "+a.rec+", shared with "+(rcm[a.rec]-1)+" accounts",["Onboarding handle "+a.rec+" appears on "+rcm[a.rec]+" accounts"]);
a.score=Math.min(100,s)});
if(prop){const fg=new Set(Object.values(A).filter(a=>a.score>=TH).map(a=>a.id));Object.values(A).forEach(a=>{const nb=[...new Set([...a.snd,...a.rcv])].filter(x=>fg.has(x));if(nb.length>=2){a.score=Math.min(100,a.score+30);a.why.push("Transacts directly with "+nb.length+" flagged accounts (graph propagation)");a.ev.push(nb.map(x=>x+" (rule score "+A[x].score+") exchanged money with "+a.id))}})}
const p2={},g2=x=>p2[x]===undefined?(p2[x]=x):p2[x]===x?x:(p2[x]=g2(p2[x]));
const sus=x=>A[x]&&A[x].score>=40;D.txns.forEach(t=>{if(sus(t.from)&&sus(t.to))p2[g2(t.from)]=g2(t.to)});D.accts.forEach(a=>{if(!sus(a.id))return;const o=dv[a.dev].find(x=>x!==a.id&&sus(x));if(o)p2[g2(a.id)]=g2(o)});
const G={};D.accts.forEach(a=>(G[g2(a.id)]=G[g2(a.id)]||{ac:[]}).ac.push(A[a.id]));
const gangs=Object.values(G).filter(g=>g.ac.length>2&&g.ac.some(a=>a.score>=TH)).map(g=>{const ids=new Set(g.ac.map(a=>a.id));g.vt=D.txns.filter(t=>ids.has(t.to)&&t.from[0]==="V");g.loss=g.vt.reduce((x,t)=>x+t.amt,0);
const vs=new Set(g.vt.map(t=>t.from));g.cs=D.comps.filter(c=>vs.has(c.v));g.states=[...new Set(g.cs.map(c=>c.state))];g.devs=[...new Set(g.ac.map(a=>a.dev))];
g.mo=Object.entries(g.cs.reduce((o,c)=>(o[c.type]=(o[c.type]||0)+1,o),{})).sort((x,y)=>y[1]-x[1])[0]||["–",0];g.rc=Object.entries(g.ac.reduce((o,a)=>(a.rec&&(o[a.rec]=(o[a.rec]||0)+1),o),{})).sort((x,y)=>y[1]-x[1])[0];g.fl=g.ac.filter(a=>a.score>=TH).sort((x,y)=>y.bal-x.bal);g.rec=g.fl.reduce((x,a)=>x+a.bal,0);return g}).filter(g=>g.cs.length>0).sort((a,b)=>b.loss-a.loss);gangs.forEach((g,i)=>g.id="G"+(i+1));
return{ents,A,gangs,thr:TH,acc:cm.length?Math.round(ok/cm.length*100):null,dv,D}}

