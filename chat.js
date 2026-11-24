/* TRACE SUTRA – floating "Ask TRACE" assistant (bottom-left). Reuses runAsk()/askData() from screens.js */
(function(){
const fab=document.createElement("button");fab.id="chatfab";fab.setAttribute("aria-haspopup","dialog");fab.setAttribute("aria-expanded","false");fab.innerHTML='<span aria-hidden="true">💬</span> Ask TRACE';
const box=document.createElement("section");box.id="chatbox";box.setAttribute("role","dialog");box.setAttribute("aria-label","Ask TRACE");box.hidden=true;
box.innerHTML='<div class="ch-h"><div><b>Ask TRACE</b><small>Ask about the case data in plain English</small></div><button id="chatx" aria-label="Close">✕</button></div><div class="ch-b"><p class="mut ch-i">Try one of these, or type your own question.</p><div id="chips"></div><div id="ar"></div></div><div class="ch-f"><input id="aq" class="q" placeholder="e.g. top 5 mules by balance" aria-label="Your question"><button class="on" data-ask="1">Ask</button></div>';
document.body.append(fab,box);
const chips=()=>{const l=(typeof BIG!=="undefined"&&BIG)?EXI:EX;document.getElementById("chips").innerHTML=l.map(q=>`<button data-q="${q}">${q}</button>`).join("")};
const open=o=>{box.hidden=!o;fab.hidden=o;fab.setAttribute("aria-expanded",o);if(o){chips();document.getElementById("aq").focus()}else fab.focus()};
fab.onclick=()=>open(true);document.getElementById("chatx").onclick=()=>open(false);
addEventListener("keydown",e=>{if(e.key==="Escape"&&!box.hidden)open(false)});
document.getElementById("aq").onkeydown=e=>{if(e.key==="Enter")runAsk()};
})();
