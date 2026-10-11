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