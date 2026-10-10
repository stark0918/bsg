/* ---------- 基本工具 ---------- */
const $=(s,el=document)=>el.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const rf=(a,b)=>a+Math.random()*(b-a);
const chance=p=>Math.random()<p;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const rpick=(rnd,a)=>a[Math.floor(rnd()*a.length)];
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function nrm(rnd,mean,sd){return mean+((rnd()+rnd()+rnd()+rnd()-2)/2)*sd;}
function weightedPick(pairs){let t=0;for(const p of pairs)t+=p[1];let r=Math.random()*t;for(const p of pairs){r-=p[1];if(r<=0)return p[0];}return pairs[pairs.length-1][0];}
function poisson(l){let L=Math.exp(-l),k=0,p=1;do{k++;p*=Math.random();}while(p>L);return k-1;}
function fmtAvg(v){if(!v||isNaN(v))return ".000";return (v>=1?"1.000":v.toFixed(3).replace(/^0/,""));}
function fmtIP(outs){return Math.floor(outs/3)+"."+(outs%3);}
function fmtERA(er,outs){if(!outs)return"-.--";return (er*27/outs).toFixed(2);}
