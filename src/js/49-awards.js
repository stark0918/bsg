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
    return {kind,title,val:top?top.val:null,name:top?top.p.name:"",team:top?top.pid.replace(/[bp]\d+$/,""):""};
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
function awardPodium(list,label){
  const row=a=>`<tr><td class="num">${a.rank}</td><td class="name">${esc(a.name)}</td><td class="name">${teamBadge(a.team)}</td><td class="num">${a.pts} 分</td></tr>`;
  return `<h3>${label}</h3><table class="grid"><tr><th>#</th><th>球員</th><th>球隊</th><th>評分</th></tr>${list.map(row).join("")}</table>`;
}
function viewAwards(){
  const a=S.season.awards;
  if(!a)return `<div class="panel"><h2>🏆 頒獎典禮</h2><p class="muted">球季（含季後賽）結束後才會公布獎項。</p>
    <div class="hr"></div><button class="btn blk" data-act="backHub">← 回球季總部</button></div>`;
  const batKings=AWARD_KINGS.filter(k=>["avg","hr","rbi","sb","r"].indexOf(k[0])>=0);
  const pitKings=AWARD_KINGS.filter(k=>["era","w","k","sv"].indexOf(k[0])>=0);
  const krows=(list)=>list.map(k=>{
    const e=a.kings.find(x=>x.kind===k[0])||{};
    return `<tr><td>${k[1]}</td><td class="name">${e.name?esc(e.name):"－"}</td><td class="name">${e.team?teamBadge(e.team):""}</td><td class="num">${e.val!=null?esc(String(e.val)):""}</td></tr>`;
  }).join("");
  return `
  <div class="panel center party"><h2>🏆 季後頒獎典禮</h2>
    <p class="muted">頒發本季（例行賽 ${a.gp} 場＋季後賽）個人獎項。</p></div>
  <div class="panel">${awardPodium(a.mvp,"最優秀選手 MVP")}
    ${awardPodium(a.cy,"最佳投手")}
    ${awardPodium(a.rookie,"新人王（22 歲以下）")}
    <h3>打擊部門王座</h3>
    <table class="grid"><tr><th>獎項</th><th>得主</th><th>球隊</th><th>成績</th></tr>${krows(batKings)}</table>
    <h3>投手部門王座</h3>
    <table class="grid"><tr><th>獎項</th><th>得主</th><th>球隊</th><th>成績</th></tr>${krows(pitKings)}</table>
    <div class="hr"></div>
    <button class="btn blk" data-act="backHub">← 回球季總部</button>
  </div>`;
}