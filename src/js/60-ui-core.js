/* ---------- 畫面渲染 ---------- */
/* 開啟球員資料前記住「從哪裡來」，才能原路返回，不用繞回總部再點一次 */
const PLAYER_CTX=["screen","leadCat","recTab","histTab","histCat","gameDetail","awardsStep"];
function screenCtx(){const c={};PLAYER_CTX.forEach(k=>{if(S[k]!==undefined)c[k]=S[k];});return c;}
function ctxLabel(c){
  if(!c)return "";
  const map={leaders:"球員排行",records:"球團紀錄殿堂",history:"遊戲紀錄",gameDetail:"比賽明細",
             awards:"頒獎典禮",roster:"陣容與成績",abilities:"選手能力數值",allstar:"明星賽",
             hub:"球季總部",title:"主選單",season:"球季資訊"};
  let n=map[c.screen]||"上一頁";
  if(c.screen==="leaders"){
    const cats={avg:"打擊率",hr:"全壘打",rbi:"打點",h:"安打",sb:"盜壘",r:"得分",era:"防禦率",w:"勝投",k:"三振",sv:"救援"};
    n+="（"+(cats[c.leadCat]||"")+"）";
  }else if(c.screen==="history"){
    const t={games:"逐場賽果",seasons:"跨季生涯",detail:"球季詳細",player:"球員生涯",
             mile:"生涯里程碑",allstar:"明星賽",retire:"引退名單",boards:"生涯榜"};
    n+="（"+(t[c.histTab]||"")+"）";
  }else if(c.screen==="records"){
    const t={single:"單場紀錄",season:"本季團隊",seasonbest:"單季紀錄"};
    n+="（"+(t[c.recTab]||"")+"）";
  }
  return n;
}
/* 需要「進行中的球季」才成立的畫面；無球季時退回標題，避免存取 null。 */
const NEED_SEASON={hub:1,game:1,roster:1,abilities:1,player:1,schedule:1,standings:1,leaders:1,records:1,awards:1,draft:1,gameDetail:1,lineup:1,allstar:1,season:1,admin:1};
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
  else if(S.screen==="retiree")app.innerHTML=viewRetiree();
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
  else if(S.screen==="admin")app.innerHTML=viewAdmin();
  const log=$("#log");if(log)log.scrollTop=log.scrollHeight;
  if(S.screen==="game"&&S.match&&S.match.over){const gr=$("#gameresult");if(gr&&gr.scrollIntoView)gr.scrollIntoView({block:"start"});}
  const toast=$("#toast");
  if(toast&&S.flash){toast.textContent=S.flash;toast.classList.add("on");S.flash="";setTimeout(()=>toast.classList.remove("on"),1800);}
}
/* ---------- 徽章 ---------- */
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
/* 引退紀錄索引：pid 會被新人沿用，所以要同時比對名字，才不會點到同位置的新人 */
function retireeIdx(pid,name){
  const list=CAREER.retirements||[];
  for(let i=list.length-1;i>=0;i--){
    const r=list[i];
    if(r.pid===pid&&(!name||r.name===name))return i;
  }
  return -1;
}
/* 引退紀錄索引（用自己專屬的 rid，已併入生涯榜的球員就是用這個 key） */
function retireeIdxByRid(rid){
  const list=CAREER.retirements||[];
  for(let i=0;i<list.length;i++)if(list[i].rid===rid)return i;
  return -1;
}
/* 排行榜／名單上的球員名稱：在役 → 進資料卡；已引退 → 進引退資料卡 */
function pidLink(pid,name){
  if(/^R\d+$/.test(pid)){                       // 已引退球員的跨季紀錄（rid）
    const i=retireeIdxByRid(pid);
    return i>=0?`<span class="plink" data-act="retiree" data-arg="${i}">${esc(name||"")}</span>`:esc(name||pid);
  }
  const p=playerById(pid);
  const label=name||(p?p.name:pid);
  if(p&&(!name||p.name===name))return `<span class="plink" data-act="player" data-arg="${pid}">${esc(p.name)}</span>`;
  const i=retireeIdx(pid,name);
  if(i>=0)return `<span class="plink" data-act="retiree" data-arg="${i}">${esc(label)}</span>`;
  return esc(label);
}
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
