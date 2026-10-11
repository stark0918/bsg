/* ---------- 個人獎項（球季結束後頒獎） ---------- */
const AWARD_KINGS=[["avg","打擊王"],["hr","全壘打王"],["rbi","打點王"],["sb","盜壘王"],["r","得分王"],["era","防禦率王"],["w","勝投王"],["k","三振王"],["sv","救援王"]];
function awardPts(s,isPit){
  if(isPit)return Math.round((s.w||0)*3+(s.sv||0)*2+(s.k||0)*0.15+(s.outs||0)*0.1-(s.er||0)*1.5);
  const ab=s.ab||1;
  return Math.round((s.h||0)*0.8+(s.hr||0)*2.5+(s.rbi||0)*1+(s.sb||0)*0.5+(s.r||0)*0.8+(s.h/ab)*110);
}
function computeAwards(){
  const ps=S.season.playerStats,q=leadersQualify();
  const kings=AWARD_KINGS.map(([kind,title])=>{
    const top=leadersList(kind)[0];
    return {kind,title,val:top?top.val:null,name:top?top.p.name:"",pid:top?top.pid:"",team:top?top.pid.replace(/[bp]\d+$/,""):""};
  });
  const batters=[],pitchers=[],rookies=[];
  for(const pid in ps.bat){
    const s=ps.bat[pid],p=playerById(pid);
    if(!p||(s.g||0)<q.bat)continue;
    batters.push({pid,p,s,pts:awardPts(s,false)});
    if(p.age<=22)rookies.push({pid,p,s,pts:awardPts(s,false)});
  }
  for(const pid in ps.pit){
    const s=ps.pit[pid],p=playerById(pid);
    if(!p||(s.g||0)<q.pit)continue;
    pitchers.push({pid,p,s,pts:awardPts(s,true)});
  }
  const pick3=arr=>arr.sort((a,b)=>b.pts-a.pts).slice(0,3).map((x,i)=>({rank:i+1,name:x.p.name,pid:x.pid,team:x.pid.replace(/[bp]\d+$/,""),pts:x.pts}));
  S.season.awards={kings,mvp:pick3(batters),cy:pick3(pitchers),rookie:pick3(rookies),gp:q.gp};
}
function awardPodium(list,label,emoji){
  const row=a=>`<tr class="${a.rank===1?"me":""}"><td class="num">${a.rank<=3?`<span class="medal g${a.rank}">${a.rank}</span>`:a.rank}</td>
    <td class="name">${esc(a.name)}${a.rank===1?" 🏆":""}</td><td class="name">${teamBadge(a.team)}</td><td class="num">${a.pts} 分</td></tr>`;
  return `<h3>${emoji||""} ${label}</h3><table class="grid"><tr><th>#</th><th>球員</th><th>球隊</th><th>評分</th></tr>${list.map(row).join("")}</table>`;
}
function awardKingGrid(title,list,a){
  const rows=list.map(k=>{
    const e=a.kings.find(x=>x.kind===k[0])||{};
    return `<tr><td class="name">${k[1]}</td><td class="name">${e.name?esc(e.name):"－"}</td>
      <td class="name">${e.team?teamBadge(e.team):""}</td><td class="num"><b>${e.val!=null?esc(String(e.val)):""}</b></td></tr>`;
  }).join("");
  return `<h3>${title}</h3><table class="grid"><tr><th>獎項</th><th>得主</th><th>球隊</th><th>成績</th></tr>${rows}</table>`;
}
function champPanel(champ){
  if(!champ)return `<div class="panel ceremony center"><h3>👑 總冠軍</h3><p class="muted">本季季後賽未產生總冠軍。</p></div>`;
  return `<div class="panel ceremony center"><h3>👑 總冠軍</h3>
    <div class="champbanner">${teamBadge(champ)}</div>
    <p class="muted">恭喜奪下本季最高榮耀！</p></div>`;
}
const AWARD_MAX=6;
function viewAwards(){
  const a=S.season.awards;
  if(!a)return `<div class="panel"><h2>🏆 頒獎典禮</h2><p class="muted">球季（含季後賽）結束後才會公布獎項。</p>
    <div class="hr"></div><button class="btn blk" data-act="backHub">← 回球季總部</button></div>`;
  const batKings=AWARD_KINGS.filter(k=>["avg","hr","rbi","sb","r"].indexOf(k[0])>=0);
  const pitKings=AWARD_KINGS.filter(k=>["era","w","k","sv"].indexOf(k[0])>=0);
  const champ=(S.season.playoff&&S.season.playoff.champion)||null;
  const step=(S.awardsStep==null?0:S.awardsStep);
  const parts=[];
  parts.push(`<div class="panel party center"><h2>🏆 劇空間年度頒獎典禮</h2>
    <p class="muted">本季例行賽 ${a.gp} 場，加上季後賽的精采表現，年度獎項就此揭曉。</p></div>`);
  if(step>=1)parts.push(`<div class="panel ceremony">${awardKingGrid("打擊部門王座",batKings,a)}</div>`);
  if(step>=2)parts.push(`<div class="panel ceremony">${awardKingGrid("投手部門王座",pitKings,a)}</div>`);
  if(step>=3)parts.push(`<div class="panel ceremony">${awardPodium(a.rookie,"新人王（22 歲以下）","🌟")}</div>`);
  if(step>=4)parts.push(`<div class="panel ceremony">${awardPodium(a.cy,"最佳投手","🔥")}</div>`);
  if(step>=5)parts.push(`<div class="panel ceremony">${awardPodium(a.mvp,"最有價值球員 MVP","👑")}</div>`);
  if(step>=6)parts.push(champPanel(champ));
  const nav=step>=AWARD_MAX
    ? `<button class="btn gold blk" data-act="awardsReplay">↺ 重新播放</button>
       <button class="btn blk" data-act="backHub">← 回球季總部</button>`
    : `<button class="btn gold blk" data-act="awardStep">▶ 宣布下一項</button>
       <button class="btn blk" data-act="awardAll">全部展開</button>
       <button class="btn blk" data-act="backHub">← 回球季總部</button>`;
  return parts.join("")+`<div class="panel"><div class="hr"></div>${nav}</div>`;
}

/* ---------- 明星賽（季中表演賽，不列入戰績） ---------- */
const AS_POS=["C","1B","2B","3B","SS","LF","CF","RF","DH"];
function asReady(){
  const se=S.season;if(!se)return false;
  return (se.day||0)>=Math.floor(((se.schedule||[]).length)/2);
}
function asPick(groupTeams){
  const pool=[];
  groupTeams.forEach(tid=>getTeam(tid).batters.forEach(b=>{if(!b.bench)pool.push({id:b.id,pos:b.pos,ov:playerOverall(b)});}));
  const byPos={};
  pool.forEach(x=>{if(x.pos&&(!byPos[x.pos]||x.ov>byPos[x.pos].ov))byPos[x.pos]=x;});
  const ids=AS_POS.map(pos=>byPos[pos]).filter(Boolean).map(x=>x.id);
  if(ids.length<9){
    const used=new Set(ids);
    pool.sort((a,b)=>b.ov-a.ov).forEach(x=>{if(ids.length<9&&!used.has(x.id)){ids.push(x.id);used.add(x.id);}});
  }
  let sp=null,spOv=-1;
  groupTeams.forEach(tid=>getTeam(tid).pitchers.filter(p=>p.starter).forEach(p=>{
    const ov=Math.round(p.velocity*0.35+p.control*0.35+p.breaking*0.3);
    if(ov>spOv){spOv=ov;sp=p.id;}
  }));
  return {batters:ids.slice(0,9),sp};
}
function asRosterTeams(){
  const st=standingsList();
  return {red:st.slice(0,4).map(x=>x.id),blue:st.slice(4,8).map(x=>x.id)};
}
function ensureAllstarRoster(){
  const se=S.season;if(!se||!asReady())return;
  if(se.allstar&&se.allstar.red)return;
  const g=asRosterTeams();
  se.allstar={played:false,red:asPick(g.red),blue:asPick(g.blue),redTeams:g.red,blueTeams:g.blue};
}
function asOverallOf(pid){const p=playerById(pid);return p?playerOverall(p):50;}
function asStrength(squad){
  const bat=squad.batters.reduce((a,pid)=>a+asOverallOf(pid),0)/Math.max(1,squad.batters.length);
  const sp=squad.sp?asOverallOf(squad.sp):60;
  return bat*0.55+sp*0.45;
}
function simAllstar(){
  const se=S.season;if(!se)return null;
  ensureAllstarRoster();
  const a=se.allstar;if(!a||a.played)return a;
  const rs=asStrength(a.red),bs=asStrength(a.blue);
  const ran=n=>Math.round((Math.random()*2-1)*n);
  let red=Math.max(0,Math.round(4+(rs-62)*0.09+ran(3)));
  let blue=Math.max(0,Math.round(4+(bs-62)*0.09+ran(3)));
  if(red===blue){if(rs>=bs)red++;else blue++;}
  a.score={red,blue};a.winner=red>blue?"red":"blue";a.played=true;
  a.no=(CAREER.seasons||0)+1;
  const winSquad=a.winner==="red"?a.red:a.blue;
  const cand=winSquad.batters.map(pid=>({pid,ov:asOverallOf(pid)}));
  const pick=cand[Math.floor(Math.random()*cand.length)];
  a.mvp={pid:pick.pid,name:recName(pick.pid),team:teamOfPlayer({id:pick.pid})};
  (CAREER.allstars||(CAREER.allstars=[])).push({no:a.no,winner:a.winner,red,blue,mvp:a.mvp.name,team:a.mvp.team});
  saveCareer();
  const wName=a.winner==="red"?"紅隊":"藍隊";
  const hi=Math.max(red,blue),lo=Math.min(red,blue);
  se.news=se.news||[];se.news.push({day:se.day,text:`★ 明星賽：${wName}以 ${hi}:${lo} 獲勝，MVP ${a.mvp.name}`,special:true});
  if(se.news.length>5)se.news.shift();
  S.flash=`★ 明星賽結束：${wName}獲勝，MVP ${a.mvp.name}`;
  return a;
}
function asRosterTable(squad){
  const rows=squad.batters.map((pid,i)=>{const p=playerById(pid);if(!p)return "";
    return `<tr><td class="num">${i+1}</td><td class="name">${esc(p.name)}</td><td>${esc(p.posLabel||"")}</td>
      <td class="name">${teamBadge(teamOfPlayer({id:pid}))}</td><td class="num">${playerOverall(p)}</td></tr>`;}).join("");
  const sp=playerById(squad.sp);
  const spRow=sp?`<tr><td class="num">P</td><td class="name">${esc(sp.name)}</td><td>${esc(sp.role||"先發")}</td>
      <td class="name">${teamBadge(teamOfPlayer({id:squad.sp}))}</td><td class="num">${playerOverall(sp)}</td></tr>`:"";
  return `<table class="grid"><tr><th>#</th><th>球員</th><th>守位</th><th>球隊</th><th>綜合</th></tr>${rows}${spRow}</table>`;
}
function viewAllstar(){
  const se=S.season;
  if(!asReady()){
    const need=Math.floor(((se.schedule||[]).length)/2);
    return `<div class="panel"><h2>⭐ 明星賽</h2>
      <p class="muted">例行賽進行到一半（第 ${need} 日）後才會舉辦明星賽，屆時會依戰績分成紅隊與藍隊，各由四個球團的精銳組成。</p>
      <div class="hr"></div><button class="btn blk" data-act="backHub">← 回球季總部</button></div>`;
  }
  ensureAllstarRoster();
  const a=se.allstar;
  const head=`<div class="panel"><h2>⭐ 劇空間明星賽</h2>
    <p class="muted">季中表演賽，勝負不列入例行賽戰績。紅隊由目前戰績前四強的球團精銳組成，藍隊為後四強。</p></div>`;
  const redPanel=`<div class="panel"><h3>🔴 紅隊</h3>${asRosterTable(a.red)}</div>`;
  const bluePanel=`<div class="panel"><h3>🔵 藍隊</h3>${asRosterTable(a.blue)}</div>`;
  let result="";
  if(a.played){
    const w=a.winner==="red"?"🔴 紅隊":"🔵 藍隊";
    result=`<div class="panel ceremony center"><h3>比賽結果</h3>
      <p style="font-size:22px;font-weight:900">紅隊 ${a.score.red} ： ${a.score.blue} 藍隊</p>
      <p class="muted">勝隊：${w}</p>
      <p>🌟 明星賽 MVP：<b>${esc(a.mvp.name)}</b>（${teamBadge(a.mvp.team)}）</p></div>`;
  }
  const nav=a.played
    ? `<button class="btn blk" data-act="backHub">← 回球季總部</button>`
    : `<button class="btn gold blk" data-act="allstarSim">▶ 進行明星賽</button>
       <button class="btn blk" data-act="backHub">← 回球季總部</button>`;
  return head+redPanel+bluePanel+result+`<div class="panel"><div class="hr"></div>${nav}</div>`;
}