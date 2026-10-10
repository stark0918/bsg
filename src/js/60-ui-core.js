/* ---------- 畫面渲染 ---------- */
function render(){
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
  else if(S.screen==="help")app.innerHTML=viewHelp();
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
function teamBadge(id){
  const t=getTeam(id);
  return `<span class="swatch" style="background:${t.c1}"></span>${esc(t.name)}`;
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
