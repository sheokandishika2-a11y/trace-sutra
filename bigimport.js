/* TRACE SUTRA – whole-file CSV import. Streams every row, scores every account with typed arrays, measures against the label column,
   then builds the full investigation view (graph, timeline, evidence, dossier) for the highest-risk accounts. Overrides runImport/impNote from import.js. */
const EXI=["summarize this file","largest transactions","top 10 risky accounts","top senders by volume","how many labelled mules and how well did we do"];
function pTime(s,unit){const n=+s;if(s!==""&&!isNaN(n))return unit==="hours"?n*60:unit==="seconds"?n/60:n;const m=/^(\d{4})[\/-](\d\d)[\/-](\d\d)[ T](\d\d):(\d\d)/.exec(s);return m?Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5])/60000:Date.parse(s)/60000}
async function runImport(){const v=id=>+document.getElementById(id).value,unit=document.getElementById("im_unit").value,cap=v("im_cap")||Infinity,
c={f:v("im_from"),t:v("im_to"),a:v("im_amt"),ts:v("im_time"),l:v("im_lab"),fb:v("im_fb"),tb:v("im_tb")},file=IMP.file,card=document.querySelector("#impm .card"),
prog=(m,p)=>{card.innerHTML=`<b>Reading ${eh(IMP.name)}</b><p class="mut">${m}</p><div class="bar"><i style="width:${p*100}%"></i><em>${Math.round(p*100)}%</em></div>`;return new Promise(r=>setTimeout(r))},need=Math.max(c.f,c.t,c.a,c.ts,c.fb,c.tb,c.l);
const c0=Math.ceil(file.size/(IMP.avg||90)*1.15)+1000;let F=new Int32Array(c0),T=new Int32Array(c0),AM=new Float64Array(c0),TM=new Float64Array(c0),LB=new Uint8Array(c0),n=0;
const idx=new Map(),names=[],gid=k=>{let i=idx.get(k);if(i===undefined){i=names.length;idx.set(k,i);names.push(k)}return i},
grow=()=>{const m=Math.ceil(F.length*1.5),g=(A,C)=>{const B=new C(m);B.set(A);return B};F=g(F,Int32Array);T=g(T,Int32Array);AM=g(AM,Float64Array);TM=g(TM,Float64Array);LB=g(LB,Uint8Array)};
const CH=16*1048576;let off=0,carry="",first=true,seen=0;
while(off<file.size&&seen<cap){const ls=(carry+await file.slice(off,off+CH).text()).split(/\r?\n/);off+=CH;carry=off<file.size?ls.pop():"";
for(const ln of ls){if(!ln)continue;if(first){first=false;continue}if(seen>=cap)break;seen++;const r=ln.indexOf('"')<0?ln.split(","):parseCSV(ln)[0];if(r.length<=need)continue;
const fs=(c.fb>=0?r[c.fb].trim()+"_":"")+r[c.f].trim(),ts=(c.tb>=0?r[c.tb].trim()+"_":"")+r[c.t].trim();if(!fs||!ts||fs===ts)continue;
const amt=Math.abs(parseFloat(String(r[c.a]).replace(/[^0-9.\-]/g,""))),tm=pTime(String(r[c.ts]).trim(),unit);if(!isFinite(amt)||!isFinite(tm))continue;
if(n>=F.length)grow();F[n]=gid(fs);T[n]=gid(ts);AM[n]=amt;TM[n]=tm;LB[n]=c.l>=0&&+r[c.l]===1?1:0;n++}
await prog(`Read ${n.toLocaleString("en-IN")} transactions, ${names.length.toLocaleString("en-IN")} accounts…`,Math.min(.6,off/file.size*.6))}
if(!n){alert("No usable rows. Check the column mapping.");document.getElementById("impm").remove();return}
await prog("Scoring every account…",.65);
const NA=names.length,inN=new Int32Array(NA),outN=new Int32Array(NA),inA=new Float64Array(NA),outA=new Float64Array(NA),rnd=new Int32Array(NA),fast=new Int32Array(NA),fanIn=new Int32Array(NA),fanOut=new Int32Array(NA),lab=new Uint8Array(NA),last=new Float64Array(NA).fill(-Infinity),pk=new Float64Array(n),ord=new Float64Array(n);
let mn=Infinity;for(let i=0;i<n;i++)if(TM[i]<mn)mn=TM[i];const M=2**Math.ceil(Math.log2(n+1));
for(let i=0;i<n;i++){const s=F[i],t=T[i];outN[s]++;inN[t]++;outA[s]+=AM[i];inA[t]+=AM[i];if(AM[i]%500===0)rnd[s]++;if(LB[i]){lab[s]=1;lab[t]=1}pk[i]=s*NA+t;ord[i]=(TM[i]-mn)*M+i}
pk.sort();for(let i=0;i<n;i++){if(i&&pk[i]===pk[i-1])continue;const s=Math.floor(pk[i]/NA);fanOut[s]++;fanIn[pk[i]-s*NA]++}
ord.sort();for(let k=0;k<n;k++){const i=ord[k]%M,s=F[i],t=T[i],tt=TM[i]-mn;if(tt-last[s]<30)fast[s]++;last[t]=tt}
const TH=40,sc=new Uint8Array(NA);
for(let a=0;a<NA;a++){let s=0;if(fanIn[a]>=3)s+=15;if(fanOut[a]>=2)s+=10;if(outN[a]&&fast[a]/outN[a]>.5)s+=25;if(outN[a]&&rnd[a]/outN[a]>.5)s+=10;if(inA[a]>0&&outA[a]/inA[a]>.85)s+=10;sc[a]=s}
const nb=new Int32Array(NA);for(let i=0;i<n;i++){if(i&&pk[i]===pk[i-1])continue;const s=Math.floor(pk[i]/NA),t=pk[i]-s*NA;if(sc[t]>=TH)nb[s]++;if(sc[s]>=TH)nb[t]++}
for(let a=0;a<NA;a++)if(nb[a]>=2)sc[a]=Math.min(100,sc[a]+30);
await prog("Ranking accounts and measuring against your labels…",.8);
const SH=2**Math.ceil(Math.log2(NA+1)),rk=new Float64Array(NA);for(let a=0;a<NA;a++)rk[a]=(sc[a]*1e4+Math.min(9999,Math.round(Math.log10(1+inA[a]+outA[a])*500)))*SH+a;rk.sort();
const top=new Int32Array(NA);for(let k=0;k<NA;k++)top[k]=rk[NA-1-k]%SH;
let flag=0,tp=0,pos=0;for(let a=0;a<NA;a++){if(lab[a])pos++;if(sc[a]>=TH){flag++;if(lab[a])tp++}}
const atk=k=>{k=Math.min(k,NA);let h=0;for(let i=0;i<k;i++)if(lab[top[i]])h++;return h/k};
const cand=[];for(let k=0;k<NA&&cand.length<150;k++)if(sc[top[k]]>0)cand.push(top[k]);const cf=new Uint8Array(NA),cc=new Int32Array(NA);cand.forEach(a=>cf[a]=1);
const LIM=1500,pick=[];for(let k=0;k<n;k++){const i=ord[k]%M,s=F[i],t=T[i];if((cf[s]&&cc[s]<LIM)||(cf[t]&&cc[t]<LIM)){pick.push(i);if(cf[s])cc[s]++;if(cf[t])cc[t]++}}
await prog("Building the investigation view…",.9);
const am=new Map(),vm=new Map();let na=0,nv=0;const aid=g=>{let k=am.get(g);if(!k){k="A"+ ++na;am.set(g,k)}return k},vid=g=>{let k=vm.get(g);if(!k){k="V"+ ++nv;vm.set(g,k)}return k},txns=[];
pick.forEach(i=>{const s=F[i],t=T[i];txns.push({from:inN[s]>0||cf[s]?aid(s):vid(s),to:aid(t),amt:AM[i],t:Math.round(TM[i]-mn)})});
txns.sort((a,b)=>a.t-b.t).forEach((t,i)=>t.id="T"+(i+1));
const accts=[...am].map(([g,id])=>({id,g:-1,lvl:-1,gi:g,name:names[g],acct:names[g],upi:names[g].toLowerCase(),phone:"–",dev:"DEV-"+id,rec:null,label:lab[g],age:999})),
ments=accts.map(a=>({src:"Bank KYC",name:a.name,acct:null,upi:a.upi,phone:null,accId:a.id})),comps=txns.filter(t=>t.from[0]==="V").map((t,i)=>({id:"C"+(i+1),v:t.from,state:"Imported",type:"Imported",amt:t.amt,t:t.t,to:t.to})),
D={accts,txns,ments,comps,imported:{name:IMP.name,rows:n,total:seen,hasLabel:c.l>=0,accounts:NA,cand:cand.length,pick:pick.length,whole:{flag},m:c.l>=0?{flag,tp,pos,P:flag?tp/flag:0,R:pos?tp/pos:0,p100:atk(100),p500:atk(500),p1000:atk(1000),base:pos/NA}:null}};
document.getElementById("impm").remove();
const s=analyse(D,true,TH),GA=new Set(s.gangs.flatMap(g=>g.ac).sort((a,b)=>b.score-a.score).slice(0,120).map(a=>a.id)),l0=new Set(txns.filter(t=>t.from[0]==="V"&&GA.has(t.to)).map(t=>t.to)),l1=new Set(txns.filter(t=>l0.has(t.from)&&GA.has(t.to)&&!l0.has(t.to)).map(t=>t.to));
accts.forEach(a=>{a.g=GA.has(a.id)?0:-1;a.lvl=!GA.has(a.id)?-1:l0.has(a.id)?0:l1.has(a.id)?1:2;s.A[a.id].g=a.g;s.A[a.id].lvl=a.lvl});
BIG={n,NA,names,idx,F,T,AM,TM,mn,inN,outN,inA,outA,fanIn,fanOut,sc,lab,TH,top,low:null,am};
S=s;sel=null;appr={};log=[];tab="Dashboard";gi=0;
await audit("Imported "+IMP.name+": read all "+n+" transactions and scored "+NA+" accounts; SHA-256 "+(await sha(JSON.stringify(txns.slice(0,5000)))).slice(0,16));
await audit("Whole-file scoring at threshold "+TH+"; detailed view built from the top "+cand.length+" accounts ("+pick.length+" transactions); "+s.gangs.length+" gang(s) linked");draw()}
function impNote(){const i=S.D.imported,m=i.m,L=x=>x.toLocaleString("en-IN");return `<div class="card warn"><b>Imported data: ${eh(i.name)}</b> · read all ${L(i.total)} rows (${L(i.rows)} usable transactions; ${L(i.total-i.rows)} self-transfers or unreadable rows skipped) and scored ${L(i.accounts)} accounts across the whole file; ${L(i.whole.flag)} reach the flag threshold (${S.thr}). The network, timeline, evidence and dossier views are built from the ${i.cand} highest-risk accounts and ${L(i.pick)} of their transactions. A CSV has no device, account-age or recruiter data, so only flow rules apply (max 70, +30 propagation). Payers that never receive money stand in for victims. Amounts keep the file's own currency units.${m?`<br>Against your label column, whole file: ${L(m.tp)} of ${L(m.pos)} labelled mules are among the ${L(m.flag)} flagged (precision ${(m.P*100).toFixed(1)}%, recall ${(m.R*100).toFixed(1)}%). Of the 100 top-ranked accounts, ${Math.round(m.p100*100)}% are labelled (random guessing: ${(m.base*100).toFixed(1)}%).${m.P<.3?" Flow-only rules are not tuned for this dataset, so many flags are false alarms.":""}`:""} <button data-demo="1">Back to synthetic demo</button></div>`}
function askData(raw){if(!BIG)return null;const B=BIG,q=raw.toLowerCase(),tk=q.split(/[\s,;:()?]+/).filter(Boolean),L=x=>Math.round(x).toLocaleString("en-IN"),
tbl=(h,r)=>`<div class="tw"><table><tr>${h.map(x=>`<th>${x}</th>`).join("")}</tr>${r.map(x=>`<tr>${x.map(y=>`<td>${y}</td>`).join("")}</tr>`).join("")}</table></div>`,
row=a=>[B.names[a],B.sc[a]+"",L(B.inA[a]),L(B.outA[a]),B.fanIn[a]+" / "+B.fanOut[a],B.lab[a]?"yes":"–"],H=["Account","Score","Received","Sent","Fan-in / out","Labelled mule"],im=S.D.imported;
if(!B.low){B.low=new Map();B.names.forEach((k,i)=>B.low.set(k.toLowerCase(),i))}
let ai=-1;for(const t of tk){const i=B.low.get(t);if(i!==undefined){ai=i;break}if(/^a\d+$/.test(t)&&S.A[t.toUpperCase()]){ai=S.A[t.toUpperCase()].gi;break}}
if(ai>=0){const ts=[];for(let i=0;i<B.n;i++)if(B.F[i]===ai||B.T[i]===ai)ts.push(i);ts.sort((x,y)=>B.AM[y]-B.AM[x]);const a=Object.values(S.A).find(x=>x.gi===ai);
return `<p><b>${eh(B.names[ai])}</b> · score ${B.sc[ai]} · ${ts.length.toLocaleString("en-IN")} transactions · received ${L(B.inA[ai])} · sent ${L(B.outA[ai])} · fan-in ${B.fanIn[ai]}, fan-out ${B.fanOut[ai]}${B.lab[ai]?" · <b>labelled mule</b>":""}</p>${a&&a.why.length?"<p class='mut'>Why flagged: "+a.why.join("; ")+"</p>":""}<p class="mut">Largest transactions</p>`+tbl(["From","To","Amount"],ts.slice(0,10).map(i=>[B.names[B.F[i]],B.names[B.T[i]],L(B.AM[i])]))}
if(/label|laundering|precision|recall|accura|well|perform|how good|ground/.test(q)){const m=im.m;return m?`<p>Across all ${L(B.NA)} accounts: <b>${L(m.pos)}</b> are labelled mules (${(m.base*100).toFixed(2)}%). The rules flagged <b>${L(m.flag)}</b> and caught <b>${L(m.tp)}</b>: precision ${(m.P*100).toFixed(1)}%, recall ${(m.R*100).toFixed(1)}%.</p>`+tbl(["Top-ranked accounts","Labelled mules"],[100,500,1000].map(k=>["Top "+k,Math.round(m["p"+k]*100)+"%"]))+`<p class="mut">Random guessing would give ${(m.base*100).toFixed(2)}%. Labels were never used by the detector.</p>`:"<p>This file has no label column, so accuracy cannot be measured.</p>"}
if(/(largest|biggest|highest|top).*(transaction|transfer|payment)/.test(q)){const t=[];for(let i=0;i<B.n;i++){if(t.length<10||B.AM[i]>B.AM[t[t.length-1]]){t.push(i);t.sort((x,y)=>B.AM[y]-B.AM[x]);if(t.length>10)t.pop()}}return tbl(["From","To","Amount"],t.map(i=>[B.names[B.F[i]],B.names[B.T[i]],L(B.AM[i])]))}
const byV=(arr,cnt)=>{const o=[];for(let a=0;a<B.NA;a++){if(o.length<10||arr[a]>arr[o[o.length-1]]){o.push(a);o.sort((x,y)=>arr[y]-arr[x]);if(o.length>10)o.pop()}}return tbl(H,o.map(row))};
if(/sender|sending|paying|payer/.test(q))return /volume|amount|value|money/.test(q)?byV(B.outA):byV(B.outN);
if(/receiver|receiving|recipient|beneficiar|payee/.test(q))return /volume|amount|value|money/.test(q)?byV(B.inA):byV(B.inN);
if(/risk|suspic|flagged|mule|score|top/.test(q)){const k=Math.min(50,+(q.match(/(\d+)/)||[])[1]||10);return `<p class="mut">Highest scores across the whole file, ties broken by money moved.</p>`+tbl(H,[...B.top.slice(0,k)].map(row))}
return `<p><b>${eh(im.name)}</b>: ${L(B.n)} transactions, ${L(B.NA)} accounts, ${L(im.whole.flag)} flagged at threshold ${B.TH}, ${im.cand} accounts in the detailed view, ${L(B.inN.reduce((s,x)=>s+(x===0?1:0),0))} accounts that never receive money.</p><p class="mut">Try: an account name, "largest transactions", "top 10 risky accounts", "top senders by volume", "top receivers", "how well did we do".</p>`}
