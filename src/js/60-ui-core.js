/* ---------- 畫面渲染 ---------- */
/* 需要「進行中的球季」才成立的畫面；無球季時退回標題，避免存取 null。 */
const NEED_SEASON={hub:1,game:1,roster:1,abilities:1,player:1,schedule:1,standings:1,leaders:1,records:1,awards:1,draft:1,gameDetail:1,lineup:1,allstar:1,season:1};
function render(){
  if(!S.season&&NEED_SEASON[S.screen])S.screen="title";
  if(S.season&&S.season.statSchema!==2)migrateSeasonStats();
  const app=$("#app");
  if(S.screen==="title")app.innerHTML=viewTitle();
  else if(S.screen==="newgame")app.innerHTML=viewNewGame();
  else if(S.screen==="hub")app.innerHTML=viewHub();
  else if(S.screen==="game")app.innerHTML=viewGame();
  else if(S.screen==="roster")app.innerHTML=viewRoster();
  else if(S.screen==="abilities")app.innerHTML=viewAbilities();
  else if(S.screen==="player")app.innerHTML=viewPlayer();
  else if(S.screen==="schedule")app.innerHTML=viewSchedule();
  else if(S.screen==="standings")app.innerHTML=viewStandings();
  else if(S.screen==="leaders")app.innerHTML=viewLeaders();
  else if(S.screen==="records")app.innerHTML=viewRecords();
  else if(S.screen==="history")app.innerHTML=viewHistory();
  else if(S.screen==="awards")app.innerHTML=viewAwards();
  else if(S.screen==="draft")app.innerHTML=viewDraft();
  else if(S.screen==="help")app.innerHTML=viewHelp();
  else if(S.screen==="league")app.innerHTML=viewLeague();
  else if(S.screen==="save")app.innerHTML=viewSaveManager();
  else if(S.screen==="lineup")app.innerHTML=viewLineup();
  else if(S.screen==="allstar")app.innerHTML=viewAllstar();
  else if(S.screen==="season")app.innerHTML=viewSeasonInfo();
  else if(S.screen==="gameDetail")app.innerHTML=viewGameDetail();
  renderCGI();
  const log=$("#log");if(log)log.scrollTop=log.scrollHeight;
  const toast=$("#toast");
  if(toast&&S.flash){toast.textContent=S.flash;toast.classList.add("on");S.flash="";setTimeout(()=>toast.classList.remove("on"),1800);}
}
function renderCGI(){
  const c=$("#cgi");if(!c)return;
  let q="mode=top";
  if(S.screen==="game"&&S.match){
    const m=S.match;
    q=`game.cgi?mode=bat&inn=${m.inning}&half=${m.half}&o=${m.outs}&b=${m.bases.map(x=>x?1:0).join("")}&sc=${m.score.away}-${m.score.home}`;
  }else if(S.season){
    q=`season.cgi?team=${S.season.playerTeam}&day=${S.season.day}&mode=${S.screen}`;
  }
  c.textContent="http://gekikuukan.local/cgi-bin/"+q;
}
function emblemSVG(t,s){
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="vertical-align:-3px;margin-right:3px" aria-hidden="true">
    <path d="M12 1.6 L20.6 4.4 V11 c0 5.5-3.7 9.6-8.6 11.1 C6.9 20.6 3.4 16.5 3.4 11 V4.4 Z" fill="${t.c1}" stroke="${t.c2}" stroke-width="1.1"/>
    <path d="M6.2 6 h11.6 v6.4 a5.8 5.8 0 0 1-11.6 0 Z" fill="#fff" opacity="0.12"/>
    <text x="12" y="15.3" text-anchor="middle" font-size="11.5" font-weight="700" fill="#fff" stroke="${t.c2}" stroke-width="0.3">${t.short.slice(0,2)}</text>
  </svg>`;
}
function teamBadge(id,size){
  const t=getTeam(id);
  return `${emblemSVG(t,size||18)}<span class="tname">${esc(t.name)}</span>`;
}
function teamOfPlayer(p){return String(p.id||"").replace(/[bp]\d+$/,"");}
function playerAvatar(p,size){
  const s=size||34;
  const h=hashStr(p.id||"x");
  const t=getTeam(p.teamId||teamOfPlayer(p));
  const c=t?t.c1:"#8a93a5";
  const skins=["#F6CF9F","#E8B27E","#C98E5A","#8D5A35","#F3DFC8"];
  const hairs=["#262019","#4a2f1c","#101010","#6e4c2c","#8a8a8a","#a63d32"];
  const skin=skins[h%skins.length],hair=hairs[(h>>4)%hairs.length];
  const band=(h>>9)%3; // 0 瀏海 1 髮帶 2 鴨舌帽
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="vertical-align:-4px" aria-hidden="true">
    <circle cx="12" cy="13.4" r="7.6" fill="${skin}"/>
    ${band===2?`<path d="M4.6 7.4 C4.6 3.2 8.4 2 12 2 c3.6 0 7.4 1.2 7.4 5.4 V8.4 H4.6 Z" fill="${c}"/><path d="M4.6 7.8 H19.4 a1.7 1.7 0 0 1 1.6 1.6 c0 1.1-1.4 1.5-3 1.5 H6 c-1.6 0-3-.4-3-1.5 a1.7 1.7 0 0 1 1.6-1.6 Z" fill="${c}" opacity="0.85"/>`:
      band===1?`<path d="M4.8 6.6 H19.2 V9.2 H4.8 Z" fill="${c}"/>`:
      `<path d="M4.8 7 C4.8 3.8 7.4 3 12 3 c4.6 0 7.2 .8 7.2 3.8 v0.4 c-2-1.2-4.6-1.8-7.2-1.8 S7.2 5.4 5.2 6.6 Z" fill="${hair}"/>`}
    <circle cx="9" cy="13" r="1.35" fill="#fff"/><circle cx="15" cy="13" r="1.35" fill="#fff"/>
    <circle cx="9" cy="13" r="0.62" fill="#261f1a"/><circle cx="15" cy="13" r="0.62" fill="#261f1a"/>
    <path d="M10.6 16.4 c0.9 .9 1.9 .9 2.8 0" stroke="#a04a2e" stroke-width="0.9" fill="none" stroke-linecap="round"/>
  </svg>`;
}
function rbar(label,v){
  const col=v>=75?"#2e9e4f":v>=58?"#c9a227":"#b5533a";
  return `<div class="rrow"><span class="rlab">${label}</span><span class="rbar"><i style="width:${v}%;background:${col}"></i></span><b>${v}</b></div>`;
}
function playerOverall(p){
  if(p.role!==undefined)return Math.round(p.velocity*0.30+p.control*0.28+p.breaking*0.27+p.stamina*0.15);
  return Math.round(p.meet*0.34+p.power*0.30+p.eye*0.14+p.speed*0.11+p.defense*0.11);
}
function gradeOf(v){return v>=88?"S":v>=78?"A":v>=66?"B":v>=54?"C":"D";}
function gradeBadge(p){const v=playerOverall(p),g=gradeOf(v);return `<span class="grade g-${g}" title="綜合 ${v}">${g}</span>`;}
function ageNote(a){if(a<=22)return ' <span style="color:#1f8f4a" title="成長期">▲</span>';if(a>=34)return ' <span style="color:#b5533a" title="衰退期">▼</span>';return ' <span style="color:#6b6455" title="巔峰">–</span>';}
