/* TRACE SUTRA – dashboard, graph, dossier, audit chain */
let S,tab="Dashboard",sel=null,layers={m:1,d:1},log=[];
const sha=async t=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t)))].map(b=>b.toString(16).padStart(2,"0")).join("");
async function audit(msg){const prev=log.length?log[log.length-1].h:"GENESIS",ts=new Date().toLocaleTimeString("en-IN");log.push({ts,msg,h:await sha(prev+msg+ts)})}
async function run(seed){BIG=null;S=analyse(gen(seed));sel=null;appr={};log=[];await audit("Ingested "+S.D.ments.length+" identity mentions and "+S.D.txns.length+" transactions; dataset SHA-256 "+(await sha(JSON.stringify(S.D.txns))).slice(0,16));
await audit("Entity resolution: "+S.D.ments.length+" mentions → "+S.ents.length+" entities");await audit("Mule scoring and gang linking complete ("+S.gangs.length+" gangs)");draw()}
const col=a=>a>=60?"var(--red)":a>=30?"var(--amb)":"var(--grn)",pill=s=>`<span class="pill ${s>=60?"r":s>=30?"a":"g"}">${s}</span>`;
const SCR=[["Dashboard","00",dash],["Evidence thread","∿",board],["Case intake","01",intake],["Entities","02",er],["Network","03",net],["Mules & freeze","04",mules],["Timeline","05",timeline],["Dossier","06",dos],["Audit log","07",auditv],["Evaluation","08",evalv],["Data explorer","09",xplore],["Ask TRACE","+",ask]];
const HD={"Dashboard":["Home","Dashboard","Summary of all linked complaints, fraud gangs and the accounts to freeze first."],"Evidence thread":["Triage","Evidence Thread","One case followed from complaint to cash-out, with every piece of evidence linked together."],"Case intake":["Triage","Register a Complaint","Paste a complaint to pull out account, UPI and phone details and match them to known suspects."],"Entities":["Investigate","Identity Matching","Different spellings of the same account or person, merged into one identity."],"Network":["Investigate","Fraud Network","Map of victims, mule accounts and shared devices. Click any dot or line to see the evidence behind it."],"Mules & freeze":["Act","Mule Accounts & Freeze","Suspected mule accounts ranked by the money still held. An officer approves every freeze."],"Timeline":["Investigate","Money Trail Timeline","Replay how the stolen money moved, minute by minute."],"Dossier":["Report","Case Report (Dossier)","Court-ready gang report in English or Hindi, with evidence hash and a draft Section 63 certificate."],"Audit log":["Report","Audit Log","Tamper-evident record of every action taken in this system."],"Evaluation":["Report","Accuracy & Validation","How accurately the system finds mule accounts on held-out test data."],"Data explorer":["Investigate","Data Explorer","Every transaction, every account and every signal behind the case, in full detail: graph, ledger, scores and raw identities."],"Ask TRACE":["Triage","Ask TRACE","Ask questions about the case data in plain English."]};
function draw(){const fl=S.gangs.flatMap(g=>g.fl),rec=S.gangs.reduce((x,g)=>x+g.rec,0);
$("#stats").style.display="none";
$("#stats").innerHTML=[S.D.imported?[S.D.imported.rows,"Transactions read"]:[S.D.comps.length,"Complaints"],S.D.imported?[S.D.imported.accounts,"Accounts scored"]:[S.D.ments.length+" → "+S.ents.length,"Mentions → entities"],[S.gangs.length,"Linked gangs"],S.D.imported?[S.D.imported.whole.flag,"Flagged (whole file)"]:[fl.length,"Flagged mules"],[fmt(rec),"Recoverable if frozen now"]].map(x=>`<div class="st"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("");
const GR=[["Triage",["Evidence thread","Case intake"]],["Investigate",["Entities","Network","Timeline","Data explorer"]],["Act",["Mules & freeze"]],["Report",["Dossier","Audit log","Evaluation"]]];
$("#tabs").innerHTML='<div class="navin"><button class="'+(tab==="Dashboard"?"on":"")+'" data-t="Dashboard">Home</button>'+GR.map(([h,ns])=>`<div class="ng ${ns.includes(tab)?"on":""}"><button class="gl" aria-haspopup="true">${h}</button><div class="dd">${ns.map(n=>`<button class="${n===tab?"on":""}" data-t="${n}">${HD[n][1]}</button>`).join("")}</div></div>`).join("")+'<button class="demo" data-dm="start">▶ Guided demo</button></div>';
$("#tabs").onclick=e=>{const b=e.target.closest("[data-t]");if(b){tab=b.dataset.t;draw();$("#tabs").classList.add("shut");scrollTo(0,0)}};$("#tabs").onmouseover=e=>{if(e.target.closest(".gl"))$("#tabs").classList.remove("shut")};
$("#view").onclick=null;const H=HD[tab];$("#sh").innerHTML=H?`<div class="sh"><div class="crumb"><button data-go="Dashboard">Home</button>${tab==="Dashboard"?"":" › "+H[0]+" › "+H[1]}</div><h2>${H[1]}</h2><p>${H[2]}</p></div>`:"";(!S.gangs.length&&!["Audit log","Evaluation","Entities","Ask TRACE","Data explorer"].includes(tab)?nogang:SCR.find(s=>s[0]===tab)[2])();if(tab==="Dashboard")countUp("#view .st b")}
function nogang(){$("#view").innerHTML=(S.D.imported?impNote():"")+`<div class="card"><b>No linked gang found</b><p class="mut">Nothing in this data scored high enough, with a victim-to-mule trail, to form a gang. Try Entities or Ask TRACE to inspect individual accounts, or import a different sample.</p></div>`}
function net(){const nodes=[],ed=[],id={};const add=(i,t,l)=>{if(!id[i]){id[i]={i,t,l,x:450+Math.cos(nodes.length*2.4)*(40+nodes.length*5),y:270+Math.sin(nodes.length*2.4)*(40+nodes.length*4)};nodes.push(id[i])}};
S.D.accts.forEach(a=>{if(a.g>=0)add(a.id,"a",a.id)});(S.D.imported?S.D.comps.filter(c=>S.A[c.to]&&S.A[c.to].g>=0).sort((a,b)=>b.amt-a.amt).slice(0,60):S.D.comps).forEach(c=>add(c.v,"v",""));
const em={};S.D.txns.forEach(t=>{if(!id[t.from]||!id[t.to])return;const k=t.from+">"+t.to;em[k]=(em[k]||{a:t.from,b:t.to,w:0,k:"m"});em[k].w+=t.amt});Object.values(em).forEach(e=>ed.push(e));
S.D.accts.forEach(a=>{if(a.g>=0&&!S.D.imported){add(a.dev,"d",a.dev.replace("DEV-","D"));ed.push({a:a.id,b:a.dev,k:"d",w:0})}});
for(let it=0;it<260;it++){nodes.forEach(p=>{p.fx=(450-p.x)*.012;p.fy=(270-p.y)*.012;nodes.forEach(q=>{if(p!==q){const dx=p.x-q.x,dy=p.y-q.y,d2=dx*dx+dy*dy+1,k=2600/d2,d=Math.sqrt(d2);p.fx+=dx/d*k;p.fy+=dy/d*k}})});
ed.forEach(e=>{const p=id[e.a],q=id[e.b],dx=q.x-p.x,dy=q.y-p.y,d=Math.sqrt(dx*dx+dy*dy)+.1,k=(d-70)*.03;p.fx+=dx/d*k;p.fy+=dy/d*k;q.fx-=dx/d*k;q.fy-=dy/d*k});
nodes.forEach(p=>{p.x=Math.max(25,Math.min(875,p.x+p.fx));p.y=Math.max(25,Math.min(515,p.y+p.fy))})}
const hot={};if(sel&&!sel.startsWith("e:")){let fr=[sel],d=0;const seen=new Set([sel]);while(fr.length&&d<6){const nx=[];fr.forEach(x=>S.D.txns.forEach(t=>{if(t.from===x&&id[t.to]){const k=x+">"+t.to;if(hot[k]===undefined)hot[k]=d;if(!seen.has(t.to)){seen.add(t.to);nx.push(t.to)}}}));fr=nx;d++}}
const sv=ed.filter(e=>layers[e.k]).map(e=>{const p=id[e.a],q=id[e.b],kk=e.a+(e.k==="d"?"~":">")+e.b;return `<line data-e="${kk}" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="transparent" stroke-width="12" style="cursor:pointer"/><line pointer-events="none" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${sel==="e:"+kk?"var(--acc)":e.k==="d"?"var(--pur)":"var(--mut)"}" stroke-width="${e.k==="d"?1.2:1+Math.min(3,e.w/150000)}" ${e.k==="d"?'stroke-dasharray="4 3"':(hot[kk]!==undefined?`class="hot" pathLength="1" style="animation-delay:${hot[kk]*.5}s"`:'opacity=".7" class="flow"')}/>`}).join("")+
nodes.map(n=>{const a=S.A[n.i],s=n.i===sel?' stroke="var(--fg)" stroke-width="3"':' stroke="var(--card)" stroke-width="1.5"';
const sh=n.t==="a"?`<circle cx="${n.x}" cy="${n.y}" r="${9+a.lvl*2}" fill="${col(a.score)}"${s}/>`:n.t==="d"?`<rect x="${n.x-8}" y="${n.y-8}" width="16" height="16" fill="var(--pur)"${s}/>`:`<circle cx="${n.x}" cy="${n.y}" r="4.5" fill="var(--mut)"${s}/>`;
return `<g data-n="${n.i}" style="cursor:pointer">${sh}<text x="${n.x}" y="${n.y-13}" font-size="10" text-anchor="middle" fill="var(--fg)">${n.l}</text></g>`}).join("");
$("#view").innerHTML=`<div class="row"><div><svg viewBox="0 0 900 540">${sv}</svg><div class="mut" style="margin-top:6px">● victims · ● accounts coloured by mule score (larger = deeper layer) · ■ devices · dashed = shared device. Select an account or victim to trace its money downstream, or a line for its evidence.
 <button class="${layers.m?"on":""}" data-l="m">Money flow</button> <button class="${layers.d?"on":""}" data-l="d">Shared devices</button></div></div><div class="card" id="det">${detail()}</div></div>`;
$("#view").onclick=e=>{const g=e.target.closest("[data-n]"),l=e.target.dataset.l,eg=e.target.closest("[data-e]");if(g){sel=g.dataset.n;net()}else if(eg){sel="e:"+eg.dataset.e;net()}else if(l){layers[l]=!layers[l];net()}}}
function detail(){if(!sel)return `<b>Select a node or a line</b><p class="mut">Click an account for its score and the records behind every reason. Click a line to see why the connection exists. Nothing is auto-actioned: an investigator approves every freeze.</p>`;
if(sel.startsWith("e:")){const k=sel.slice(2),dev=k.includes("~"),[x,y]=k.split(dev?"~":">");
if(dev){const q=S.dv[y]||[];return `<b>Shared-device link</b> <span class="mut">${x} ↔ ${y}</span><p>Why it exists: the KYC record of ${x} lists device ${y}${q.length>1?", which also appears on "+q.filter(z=>z!==x).join(", "):""}.</p><b>Supporting records</b><ul class="ev">${q.map(z=>`<li>KYC record of ${z} → device ${y}</li>`).join("")}</ul>`}
const ts=S.D.txns.filter(t=>t.from===x&&t.to===y),c=S.D.comps.find(c=>c.v===x);
return `<b>Money-flow link</b> <span class="mut">${x} → ${y}</span><p>Why it exists: bank statements show ${ts.length} transfer(s) totalling ${fmt(ts.reduce((s,t)=>s+t.amt,0))}.${c?" Complaint "+c.id+" ("+c.state+", "+c.type+") names "+y+" as the beneficiary.":""}</p><b>Supporting records</b><ul class="ev">${ts.map(t=>`<li>${t.id}: ${fmt(t.amt)} at ${hm(t.t)}</li>`).join("")}${c?`<li>Complaint ${c.id}, filed in ${c.state}</li>`:""}</ul>`}
const a=S.A[sel];if(a)return `<b>${a.id} · ${a.name}</b> ${pill(a.score)}<p class="mut">UPI ${a.upi}${a.rec?"<br>Onboarded via "+a.rec:""}<br>Phone ${a.phone} · ${a.dev}<br>In ${fmt(a.in)} · Out ${fmt(a.out)} · <b style="color:var(--fg)">Est. balance ${fmt(a.bal)}</b></p><b>Why flagged, with the evidence</b>${a.why.map((w,i)=>`<details ${i<2?"open":""}><summary>${w}</summary><ul class="ev">${a.ev[i].map(x=>`<li>${x}</li>`).join("")}</ul></details>`).join("")||'<p class="mut">No risk indicators.</p>'}<p class="mut">The score is the sum of these rule weights. Nothing is hidden.</p>`;
const c=S.D.comps.find(c=>c.v===sel);if(c)return `<b>Victim ${c.v}</b><p class="mut">Complaint ${c.id} · ${c.state} · ${c.type}<br>Lost ${fmt(c.amt)} to ${c.to}</p>`;
return `<b>Device ${sel}</b><p class="mut">Used by: ${(S.dv[sel]||[]).join(", ")}</p>`}
function er(){$("#view").innerHTML=`<div class="card"><b>Entity resolution</b><p class="mut">Complaints name the same beneficiary in different ways (spacing, +91 prefix, case, initials). Records are merged when they share a normalised account number, UPI handle or phone. Merge accuracy against the synthetic ground truth: <b style="color:var(--fg)">${S.acc}%</b>.</p><div class="tw"><table><tr><th>Entity</th><th>Mentions merged</th><th>Name variants seen</th><th>Matched on</th></tr>${S.ents.filter(e=>S.A[e.acc].g>=0).map(e=>`<tr><td>${e.acc}</td><td>${e.n}</td><td>${e.names.join(" · ")}</td><td>${["a:","u:","p:"].filter(p=>e.ms.slice(1).some(m=>m._k.some(k=>k.startsWith(p)))).map(p=>({"a:":"account","u:":"UPI","p:":"phone"})[p]).join(", ")||"KYC only"}</td></tr>`).join("")}</table></div></div>`}
let lang="en",gi=0;
function dossier(g){const L=lang==="en",co=g.ac.find(a=>a.lvl===2)||g.fl[0]||g.ac[0];
return L?`CYBER FRAUD GANG DOSSIER – ${g.id}  [DRAFT – human review required]
Complaints linked: ${g.cs.length} across ${g.states.length} states (${g.states.join(", ")})
Total reported loss: ${fmt(g.loss)}
Accounts in network: ${g.ac.length} (flagged mules: ${g.fl.length})
Shared devices: ${g.devs.join(", ")}
Likely recruiter handle: ${g.rc?g.rc[0]+" ("+g.rc[1]+" accounts)":"none found"}
Dominant modus operandi: ${g.mo[0]} (${g.mo[1]} of ${g.cs.length} complaints)
Likely cash-out account: ${co.id} (${co.name}, ${co.upi})

Recommended freeze order:
${g.fl.map((a,i)=>`${i+1}. ${a.id} – est. balance ${fmt(a.bal)} – score ${a.score} – ${a.why[0]||""}`).join("\n")}

Estimated recoverable if frozen now: ${fmt(g.rec)}
Note: draft evidence certificate under Section 63, Bharatiya Sakshya Adhiniyam – verify format with legal counsel.`:
`साइबर ठगी गिरोह डोज़ियर – ${g.id}  [मसौदा – जाँच अधिकारी की समीक्षा आवश्यक]
जुड़ी शिकायतें: ${g.cs.length} (${g.states.length} राज्यों में)
कुल रिपोर्टेड नुकसान: ${fmt(g.loss)}
नेटवर्क में खाते: ${g.ac.length} (संदिग्ध म्यूल खाते: ${g.fl.length})
साझा डिवाइस: ${g.devs.join(", ")}
संभावित भर्ती-एजेंट हैंडल: ${g.rc?g.rc[0]+" ("+g.rc[1]+" खाते)":"नहीं मिला"}
प्रमुख तरीका: ${g.mo[0]} (${g.cs.length} में से ${g.mo[1]} शिकायतें)
संभावित कैश-आउट खाता: ${co.id} (${co.name}, ${co.upi})

फ्रीज़ करने का सुझावित क्रम:
${g.fl.map((a,i)=>`${i+1}. ${a.id} – अनुमानित शेष ${fmt(a.bal)} – स्कोर ${a.score}`).join("\n")}

अभी फ्रीज़ करने पर अनुमानित वसूली योग्य राशि: ${fmt(g.rec)}
नोट: भारतीय साक्ष्य अधिनियम (BSA) धारा 63 प्रमाणपत्र का मसौदा – प्रारूप की वैधानिक पुष्टि करें।`}
async function dos(){const g=S.gangs[gi],t=dossier(g),h=await sha(t);
$("#view").innerHTML=`<div class="card">${S.gangs.map((x,i)=>`<button class="${i===gi?"on":""}" data-g="${i}">${x.id}</button>`).join(" ")} <button class="${lang==="en"?"on":""}" data-lg="en">English</button> <button class="${lang==="hi"?"on":""}" data-lg="hi">हिन्दी</button>
<pre>${t}</pre><b>Evidence hash (SHA-256)</b><div class="hash">${h}</div></div>
<div class="card"><b>Draft Section 63 certificate</b><pre>${cert(g,h)}</pre></div>
<div class="card"><b>Chain-of-custody audit trail</b><p class="mut">Each entry hashes the previous one, so tampering breaks the chain.</p><div class="tw"><table>${log.map(l=>`<tr><td>${l.ts}</td><td>${l.msg}<div class="hash mut">${l.h.slice(0,32)}…</div></td></tr>`).join("")}</table></div></div>`;
$("#view").onclick=e=>{const d=e.target.dataset;if(d.g!==undefined){gi=+d.g;dos()}if(d.lg){lang=d.lg;dos()}}}
$("#dl").onclick=()=>{const D=JSON.parse(JSON.stringify(S.D,(k,v)=>k==="_k"?undefined:v)),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(D,null,2)],{type:"application/json"}));a.download="trace-sutra-dataset.json";a.click()};
$("#th").onclick=()=>{const r=document.documentElement;r.dataset.theme=r.dataset.theme==="dark"?"light":"dark"};
$("#re").onclick=()=>run(Math.floor(Math.random()*9e6)+1);run(20261029);
