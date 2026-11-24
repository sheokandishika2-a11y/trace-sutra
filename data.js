/* TRACE SUTRA – synthetic fraud-case generator (seeded, deterministic) */
const $=s=>document.querySelector(s),fmt=n=>"₹"+Math.round(n).toLocaleString("en-IN");
const FN=["Rahul","Amit","Sunil","Priya","Neha","Vikram","Anil","Pooja","Rohit","Sanjay","Meena","Deepak"],LN=["Kumar","Sharma","Singh","Verma","Gupta","Yadav","Khan","Mishra"];
const ST=["Delhi","Uttar Pradesh","Haryana","Bihar","Rajasthan","Maharashtra","Karnataka","Telangana"];
function gen(seed,EV){let s=seed;const R=()=>(s=s*16807%2147483647)/2147483647,ri=(a,b)=>a+Math.floor(R()*(b-a+1)),pk=a=>a[Math.floor(R()*a.length)];
const accts=[],txns=[],ments=[],comps=[];let n=0;
const mk=(g,lvl,devs,age)=>{const f=pk(FN),l=pk(LN),a={id:"A"+ ++n,g,lvl,name:f+" "+l,acct:""+ri(1e7,9e7)+ri(1e3,9e3),upi:f.toLowerCase()+ri(10,99)+pk(["@ybl","@oksbi","@paytm"]),phone:"9"+ri(1e8,9e8),dev:(EV&&R()<.5)?"DEV-X"+n:pk(devs),rec:(g>=0&&R()<.8)?"@agent_"+(g+1)+"_loans":null,label:g>=0?1:0,age};accts.push(a);ments.push({src:"Bank KYC",name:a.name,acct:a.acct,upi:a.upi,phone:a.phone,accId:a.id});return a};
const noisy=(a,c)=>{const nm=pk([a.name,a.name.split(" ")[0][0]+". "+a.name.split(" ")[1],a.name.toLowerCase(),a.name.replace("a","aa")]);
const m={src:"Complaint "+c,name:nm,truth:a.id,acct:R()<.5?a.acct.replace(/(\d{4})/g,"$1 ").trim():null,upi:R()<.7?pk([a.upi.toUpperCase(),a.upi]):null,phone:R()<.7?pk(["+91 "+a.phone,a.phone.slice(0,5)+" "+a.phone.slice(5),"0"+a.phone]):null};if(!m.upi&&!m.phone)m.upi=a.upi.toUpperCase();ments.push(m)};
let vn=0,cn=0,pn=0;
[{L1:4,L2:3,V:16,sts:ST,ty:["Investment scam","Investment scam","Phishing link","Fake KYC call"]},{L1:3,L2:2,V:10,sts:ST.slice(0,4),ty:["SIM swap","UPI collect scam","SIM swap"]}].forEach((G,g)=>{
const devs=["DEV-"+(g*3+1),"DEV-"+(g*3+2)],L1=[...Array(G.L1)].map(()=>mk(g,0,devs,ri(8,45))),L2=[...Array(G.L2)].map(()=>mk(g,1,devs,ri(8,45))),C=mk(g,2,devs,ri(8,45));
const inL2=[];
for(let k=0;k<G.V;k++){const v="V"+ ++vn,to=pk(L1),amt=pk([25000,48000,99999,150000,72500,200000,36000]),t=ri(0,600),c="C"+ ++cn;
comps.push({id:c,v,state:pk(G.sts),type:pk(G.ty),amt,t,to:to.id});noisy(to,c);txns.push({from:v,to:to.id,amt,t});
if(t<480){const base=Math.round(amt*.92/1000)*1000+(EV?ri(1,999):0),p1=Math.round(base*.55/1000)*1000+(EV?ri(1,99):0),d1=pk(L2),d2=L2.find(x=>x!==d1)||d1;
const a1={from:to.id,to:d1.id,amt:p1,t:t+(ri(3,18)+(EV?ri(35,60):0))},a2={from:to.id,to:d2.id,amt:base-p1,t:t+(ri(4,20)+(EV?ri(35,60):0))};txns.push(a1,a2);inL2.push(a1,a2)}}
inL2.forEach(x=>{if(x.t<540)txns.push({from:x.to,to:C.id,amt:Math.round(x.amt*.97/500)*500,t:x.t+(ri(8,25)+(EV?ri(35,60):0))})})});
for(let i=0;i<12;i++){const b=mk(-1,-1,["DEV-B"+i],ri(700,1500)),k=i<6?ri(4,9):ri(1,2);for(let j=0;j<k;j++)txns.push({from:"P"+ ++pn,to:b.id,amt:ri(150,4000)*(i<6?1:3)+ri(1,99),t:ri(0,600)});if(i>=6)txns.push({from:b.id,to:accts.find(a=>a.lvl===-1).id,amt:ri(200,2000)+ri(1,99),t:ri(60,600)})}
for(let i=0;i<4;i++){const b=mk(-1,-1,["DEV-H"+i],ri(20,50)),m0=accts.find(a=>a.lvl===-1);for(let j=0;j<ri(4,6);j++){const t=ri(0,500),am=ri(2,9)*1000;txns.push({from:"P"+ ++pn,to:b.id,amt:am,t});txns.push({from:b.id,to:m0.id,amt:am-ri(0,4)*500,t:t+ri(8,30)})}}
txns.sort((a,b)=>a.t-b.t).forEach((t,i)=>t.id="T"+(i+1));
return{accts,txns,ments,comps}}

