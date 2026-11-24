/* TRACE SUTRA – count-up numbers and text-size controls */
function countUp(sel){document.querySelectorAll(sel).forEach(el=>{const o=el.textContent,t0=performance.now(),rm=matchMedia("(prefers-reduced-motion:reduce)").matches,s=t=>{const p=rm?1:Math.min(1,(t-t0)/900),e=1-Math.pow(1-p,3);el.textContent=o.replace(/\d[\d,]*/g,v=>Math.round(+v.replace(/,/g,"")*e).toLocaleString("en-IN"));if(p<1)requestAnimationFrame(s)};requestAnimationFrame(s)})}
(function(){let z=100;const set=v=>{z=Math.max(85,Math.min(130,v));document.documentElement.style.fontSize=z+"%"};
document.addEventListener("click",e=>{const i=e.target.id;if(i==="fa")set(z+10);else if(i==="fm")set(z-10);else if(i==="fn")set(100)})})();
