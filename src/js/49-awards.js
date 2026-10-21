/* ---------- 個人獎項（球季結束後頒獎） ---------- */
const AWARD_KINGS=[["avg","打擊王"],["hr","全壘打王"],["rbi","打點王"],["h","安打王"],["sb","盜壘王"],["r","得分王"],["era","防禦率王"],["w","勝投王"],["k","三振王"],["sv","救援王"]];
function awardPts(s,isPit){
  if(isPit)return starterPts(s);
  const ab=s.ab||1;
  return Math.round((s.h||0)*0.8+(s.hr||0)*2.5+(s.rbi||0)*1+(s.sb||0)*0.5+(s.r||0)*0.8+(s.h/ab)*110);
}
/* 投手評分已拆分：先發用 starterPts、後援用 relieverPts */
function starterPts(s){
  const era=s.outs?(s.er/s.outs)*27:99;
  return Math.round((s.w||0)*10+(s.k||0)*0.25+(s.outs||0)*0.07-era*7);
}
function relieverPts(s){
  const era=s.outs?(s.er/s.outs)*27:99;
  return Math.round((s.sv||0)*6+(s.w||0)*4+(s.k||0)*0.2-era*5);
}
function computeAwards(){
  if(!S.season.playerStats)S.season.playerStats={bat:{},pit:{}};
  const ps=S.season.playerStats,q={gp: (S.season&&S.season.day)||0, bat:3, pit:3, eraOuts:12}; // 先用保守值，實際用 leadersQualify 也行
  const q2 = leadersQualify();
  const qf = q2 || q;
  const kings=AWARD_KINGS.map(([kind,title])=>{
    const top=leadersList(kind)[0];
    return {kind,title,val:top?top.val:null,name:top?top.p.name:"",pid:top?top.pid:"",team:top?top.pid.replace(/[bp]\d+$/,""):""};
  });
  const batters=[],starters=[],relievers=[],rookies=[];
  /* 新人王資格：22 歲以下，且「本季是他的初登場」——CAREER.debut 記錄每位球員第一次
     在正式球季出賽的球季（球季結束時寫入）；沒有紀錄＝從沒在前面任何一季登場過。
     因此一個人一生涯只可能拿一次新人王。出道門檻放寬到一半，讓替補出身的新人也有機會。 */
  const debut=CAREER.debut||{};
  const rookieMinG=Math.max(3,Math.floor((qf.bat||6)/3));
  for(const pid in ps.bat){
    const s=ps.bat[pid],p=playerById(pid);
    if(!p||(s.g||0)<qf.bat)continue;
    batters.push({pid,p,s,pts:awardPts(s,false)});
    if(p.age<=22&&!debut[pid]&&(s.g||0)>=rookieMinG)rookies.push({pid,p,s,pts:awardPts(s,false)});
  }
  for(const pid in ps.pit){
    const s=ps.pit[pid],p=playerById(pid);
    if(!p||(s.g||0)<qf.pit)continue;
    if(p.starter){
      if((s.outs||0)<45)continue;   // 先發需一定局數
      starters.push({pid,p,s,pts:starterPts(s)});
    }else{
      if((s.outs||0)<15)continue;   // 後援需一定出賽量
      relievers.push({pid,p,s,pts:relieverPts(s)});
    }
  }
  const pick3=arr=>arr.sort((a,b)=>b.pts-a.pts).slice(0,3).map((x,i)=>({rank:i+1,name:x.p.name,pid:x.pid,team:x.pid.replace(/[bp]\d+$/,""),pts:x.pts,s:x.s}));
  const cy=pick3(starters);
  // 澤村賞排除最佳投手得主：兩個獎項不重複頒給同一人
  const sawamura=pickSawamura(ps,qf);
  const bestDH=pickBestDH(ps,qf);
  S.season.awards={kings,mvp:pick3(batters),cy,reliever:pick3(relievers),rookie:pick3(rookies),sawamura,best9:pickBest9(ps,qf,bestDH),gloves:pickGloves(ps,qf),bestDH,gp:q.gp};
}
/* 最佳九人：8 個守備位置各選最佳打者 ＋ DH 席（實際以 DH 身份上場過的最佳）＋ 投手席 */
function pickBest9(ps,qf,bestDH){
  const posOrder=["C","1B","2B","3B","SS","LF","CF","RF"];
  const out=[];
  posOrder.forEach(pos=>{
    let best=null;
    for(const pid in ps.bat){
      const s=ps.bat[pid],p=playerById(pid);
      if(!p||p.pos!==pos)continue;
      if((s.g||0)<qf.bat)continue;
      const pts=awardPts(s,false);
      if(!best||pts>best.pts)best={pos,name:p.name,pid,team:pid.replace(/[bp]\d+$/,""),pts,s};
    }
    if(best)out.push(best);
  });
  // DH 席：不是看名單守位，而是看本季「實際以 DH 身份上場過」的最佳打者
  if(bestDH&&bestDH.length){
    const d=bestDH[0];
    out.push({pos:"DH",name:d.name,pid:d.pid,team:d.team,pts:d.pts,s:d.s});
  }
  let bestP=null;
  for(const pid in ps.pit){
    const s=ps.pit[pid],p=playerById(pid);
    if(!p||!p.starter)continue;   // 最佳九人投手席取先發最佳
    if((s.g||0)<qf.pit||(s.outs||0)<45)continue;
    const pts=starterPts(s);
    if(!bestP||pts>bestP.pts)bestP={pos:"P",name:p.name,pid,team:pid.replace(/[bp]\d+$/,""),pts,s};
  }
  if(bestP)out.push(bestP);
  return out;
}
/* 最佳指定打擊：以「實際以 DH 身份上場過」為資格，不看球員守位。
   DH 是某一棒的專職打者位置，內野手／外野手都可能擔任，所以不能只看 roster 的 pos。
   評分只看 DH 期間的表現（DH 打率、OBP、全壘打、打點）＋ DH 出賽量。 */
function pickBestDH(ps,qf){
  const arr=[];
  const minDH=Math.max(4,Math.ceil((qf.bat||6)*0.5));   // DH 出賽門檻
  for(const pid in ps.bat){
    const s=ps.bat[pid],p=playerById(pid);
    if(!p)continue;
    const pa=s.dh||0;
    if(pa<minDH)continue;
    const ab=s.dhAb||0,h=s.dhH||0,hr=s.dhHr||0,rbi=s.dhRbi||0,bb=s.dhBb||0;
    const avg=ab>0?h/ab:0;
    const obp=(ab+bb)>0?(h+bb)/(ab+bb):0;
    // 樣本太小會讓打率亂噴：把率值往聯盟平均收斂（打數滿 15 才完全採信）
    const w=Math.min(1,ab/15);
    const avgS=avg*w+0.250*(1-w);
    const obpS=obp*w+0.320*(1-w);
    const pts=Math.round(obpS*100+avgS*60+hr*2.5+rbi*1.2+pa*0.6);
    arr.push({pid,p,s,pts,dhPA:pa,dhAB:ab,dhH:h,dhHR:hr,dhRBI:rbi,dhBB:bb,avg,obp});
  }
  arr.sort((a,b)=>b.pts-a.pts||b.dhPA-a.dhPA);
  return arr.slice(0,3).map((x,i)=>({rank:i+1,name:x.p.name,pid:x.pid,team:x.pid.replace(/[bp]\d+$/,""),pts:x.pts,s:x.s,
    dhPA:x.dhPA,dhAB:x.dhAB,dhH:x.dhH,dhHR:x.dhHR,dhRBI:x.dhRBI,dhBB:x.dhBB,avg:x.avg,obp:x.obp}));
}
/* 澤村賞：頒給「最會壓制的先發投手」——刻意不看勝場，只看投球品質。
   評分＝三振率×400 − 保送率×300 − 防禦率×10（三振率／保送率＝每局三振／每局保送），
   並須投滿 120 局（40 局）以上才算實質先發。
   為什麼不看勝場：最佳投手本來就是「勝場加權」的獎項，澤村賞再放勝場進去，
   兩個獎項的冠軍會高度重疊（實測 14 場的球季約 58% 撞盤）。拿掉勝場後降到約 17%。
   兩獎可以頒給同一人（真實棒球也常見），只是評選的面向不同。 */
function pickSawamura(ps,qf){
  const arr=[];
  for(const pid in ps.pit){
    const s=ps.pit[pid],p=playerById(pid);
    if(!p||!p.starter)continue;
    if((s.g||0)<qf.pit||(s.outs||0)<120)continue;
    const outs=Math.max(1,s.outs||0);
    const era=(s.er||0)/outs*27;
    const kRate=(s.k||0)/outs;            // 每局三振
    const bbRate=(s.bb||0)/outs;          // 每局保送
    const pts=Math.round(kRate*400-bbRate*300-era*10);
    arr.push({pid,p,s,pts,era,kRate,bbRate});
  }
  arr.sort((a,b)=>b.pts-a.pts||(b.s.outs||0)-(a.s.outs||0)||(b.s.k||0)-(a.s.k||0));
  return arr.slice(0,3).map((x,i)=>({rank:i+1,name:x.p.name,pid:x.pid,team:x.pid.replace(/[bp]\d+$/,""),pts:x.pts,s:x.s,
    era:x.era,kRate:x.kRate,bbRate:x.bbRate}));
}
/* awardPodium：statFn 可自訂每列的關鍵數據文字與表頭（DH 獎用 DH 專屬數據） */
function awardPodium(list,label,emoji,isPit,emptyMsg,statFn){
  const row=a=>{
    const p = playerById(a.pid);
    const age = p ? p.age : (a.s?.age||"");
    const s=a.s||{};
    const stats=statFn
      ? statFn(a)
      : (isPit
      ? `防禦率 ${s.er!=null&&s.outs?fmtERA(s.er,s.outs):"-.--"}　勝投 ${s.w||0}　三振 ${s.k||0}　救援 ${s.sv||0}　局數 ${s.outs?fmtIP(s.outs):"0.0"}`
      : `打擊率 ${s.ab?fmtAvg(s.h/s.ab):".000"}　全壘打 ${s.hr||0}　打點 ${s.rbi||0}　得分 ${s.r||0}　盜壘 ${s.sb||0}`);
    return `<tr class="${a.rank===1?"me":""}"><td class="num">${a.rank<=3?`<span class="medal g${a.rank}">${a.rank}</span>`:a.rank}</td>
      <td class="name">${pidLink(a.pid,a.name)}${age?` <span class="muted">（${age}歲）</span>`:""}${a.rank===1?" 🏆":""}</td><td class="name">${teamBadge(a.team)}</td>
      <td class="num">${a.pts} 分</td><td class="muted" style="font-size:11px">${esc(stats)}</td></tr>`;
  };
  const statHeader=statFn?"DH 出賽／DH 打率／OBP／全壘打／打點":(isPit?"防禦率／勝投／三振／救援／局數":"打擊率／全壘打／打點／得分／盜壘");
  if(!list||!list.length)
    return `<h3>${emoji||""} ${label}</h3><table class="grid"><tr><td class="muted">${esc(emptyMsg||"本季無符合資格的球員。")}</td></tr></table>`;
  return `<h3>${emoji||""} ${label}</h3><table class="grid"><tr><th>#</th><th>球員</th><th>球隊</th><th>評分</th><th>關鍵數據（${statHeader}）</th></tr>${list.map(row).join("")}</table>`;
}
/* 最佳指定打擊的數據列：只算 DH 期間的表現 */
function dhStatLine(a){
  const pa=a.dhPA||0,ab=a.dhAB||0,h=a.dhH||0;
  return `DH 出賽 ${pa}　DH 打率 ${ab?fmtAvg(h/ab):".000"}　OBP ${a.obp>0?fmtAvg(a.obp):".000"}　全壘打 ${a.dhHR||0}　打點 ${a.dhRBI||0}`;
}
function awardKingGrid(title,list,a){
  const rows=list.map(k=>{
    const e=a.kings.find(x=>x.kind===k[0])||{};
    return `<tr><td class="name">${k[1]}</td><td class="name">${e.name?pidLink(e.pid,e.name):"－"}</td>
      <td class="name">${e.team?teamBadge(e.team):""}</td><td class="num"><b>${e.val!=null?esc(String(e.val)):""}</b></td></tr>`;
  }).join("");
  return `<h3>${title}</h3><table class="grid"><tr><th>獎項</th><th>得主</th><th>球隊</th><th>成績</th></tr>${rows}</table>`;
}
function awardBest9(list){
  const posName={C:"捕手","1B":"一壘手","2B":"二壘手","3B":"三壘手",SS:"游擊手",LF:"左外野",CF:"中外野",RF:"右外野",DH:"指定打擊",P:"投手"};
  const statOf=x=>{
    const s=x.s||{};
    if(x.pos==="P")return `防禦率 ${s.outs?fmtERA(s.er||0,s.outs):"-.--"}　${s.w||0}勝 ${s.k||0}K`;
    return `打擊率 ${s.ab?fmtAvg((s.h||0)/s.ab):".000"}　${s.hr||0}轟 ${s.rbi||0}打點`;
  };
  const rows=list.map(x=>{
    const p=playerById(x.pid);
    const age=p?` <span class="muted">（${p.age}歲）</span>`:"";
    return `<tr><td class="name">${posName[x.pos]||x.pos}</td>
      <td class="name">${pidLink(x.pid,x.name)}${age}</td><td class="name">${teamBadge(x.team)}</td>
      <td class="muted" style="font-size:11px">${statOf(x)}</td></tr>`;
  }).join("");
  return `<h3>🌟 最佳九人</h3><table class="grid"><tr><th>守位</th><th>球員</th><th>球隊</th><th>成績</th></tr>${rows}</table>`;
}
/* 金手套：按守位選守備能力最佳（指定打擊不守備，不設此獎；失策記到個人前以守備能力＋出賽為準） */
function pickGloves(ps,qf){
  const posOrder=["C","1B","2B","3B","SS","LF","CF","RF"];
  const out=[];
  posOrder.forEach(pos=>{
    let best=null;
    for(const pid in ps.bat){
      const s=ps.bat[pid],p=playerById(pid);
      if(!p||p.pos!==pos)continue;
      if((s.g||0)<qf.bat)continue;
      const score=(p.defense||0)*10+(s.g||0);
      if(!best||score>best.score)best={pos,name:p.name,pid,team:pid.replace(/[bp]\d+$/,""),score,def:p.defense||0,g:s.g||0};
    }
    if(best)out.push(best);
  });
  return out;
}
function awardGloves(list){
  const posName={C:"捕手","1B":"一壘手","2B":"二壘手","3B":"三壘手",SS:"游擊手",LF:"左外野",CF:"中外野",RF:"右外野",DH:"指定打擊"};
  const rows=list.map(x=>`<tr><td class="name">${posName[x.pos]||x.pos}</td>
      <td class="name">${pidLink(x.pid,x.name)}</td><td class="name">${teamBadge(x.team)}</td>
      <td class="num">守備 ${x.def}　出賽 ${x.g}</td></tr>`).join("");
  return `<h3>🧤 金手套</h3><table class="grid"><tr><th>守位</th><th>球員</th><th>球隊</th><th>依據</th></tr>${rows}</table>`;
}
function champPanel(champ){
  if(!champ)return `<div class="panel ceremony center"><h3>👑 總冠軍</h3><p class="muted">本季季後賽未產生總冠軍。</p></div>`;
  return `<div class="panel ceremony center"><h3>👑 總冠軍</h3>
    <div class="champbanner">${teamBadge(champ)}</div>
    <p class="muted">恭喜奪下本季最高榮耀！</p></div>`;
}
const AWARD_MAX=11;
function viewAwards(){
  const a=S.season.awards;
  if(!a)return `<div class="panel"><h2>🏆 頒獎典禮</h2><p class="muted">球季（含季後賽）結束後才會公布獎項。</p>
    <div class="hr"></div><button class="btn blk" data-act="backHub">← 回球季總部</button></div>`;
  const batKings=AWARD_KINGS.filter(k=>["avg","hr","rbi","h","sb","r"].indexOf(k[0])>=0);
  const pitKings=AWARD_KINGS.filter(k=>["era","w","k","sv"].indexOf(k[0])>=0);
  const champ=(S.season.playoff&&S.season.playoff.champion)||null;
  const step=(S.awardsStep==null?0:S.awardsStep);
  const parts=[];
  parts.push(`<div class="panel party center"><h2>🏆 球團年度頒獎典禮</h2>
    <p class="muted">本季例行賽 ${a.gp} 場的成績，年度獎項就此揭曉。（季後賽成績獨立計算，不列入）</p>
    <p class="muted" style="font-size:11px">評分公式（3 出局＝1 局）：野手＝安打×0.8＋全壘打×2.5＋打點×1＋盜壘×0.5＋得分×0.8＋打擊率×110；先發＝勝×10＋三振×0.25＋出局數×0.07－防禦率×7；後援＝救援×6＋勝×4＋三振×0.2－防禦率×5；澤村賞＝三振率×400－保送率×300－防禦率×10（須投滿120局以上；不看勝場，與最佳投手得主可重複）；金手套＝守備×10＋出賽；最佳指定打擊＝DH 期間 OBP×100＋打率×60＋全壘打×2.5＋打點×1.2＋DH 出賽×0.6。MVP取野手最高分；最佳投手取先發最高分；最佳後援取後援最高分；新人王取22歲以下、本季初登場（前一季起未在任何正式球季出賽過）的野手最高分；最佳九人取各守位野手最高分（投手席取先發最佳）；最佳DH以「實際以 DH 身份上場」為資格，不限守位；九王座取單項第一。（MVP・新人王的投打統一評分研究中）</p></div>`);
  if(step>=1)parts.push(`<div class="panel ceremony">${awardKingGrid("打擊部門王座",batKings,a)}</div>`);
  if(step>=2)parts.push(`<div class="panel ceremony">${awardKingGrid("投手部門王座",pitKings,a)}</div>`);
  if(step>=3)parts.push(`<div class="panel ceremony">${awardPodium(a.rookie,"新人王（22 歲以下、本季初登場）","🌟",false,"本季沒有符合資格的新人（22 歲以下、且這一季才首次在正式球季出賽），不頒獎。")}</div>`);
  if(step>=4)parts.push(`<div class="panel ceremony">${awardPodium(a.cy,"最佳投手（先發）","🔥",true)}</div>`);
  if(step>=5&&a.reliever&&a.reliever.length)parts.push(`<div class="panel ceremony">${awardPodium(a.reliever,"最佳後援","🧱",true)}</div>`);
  if(step>=6&&a.sawamura&&a.sawamura.length)parts.push(`<div class="panel ceremony">${awardPodium(a.sawamura,"澤村賞（先發投手）","⚾",true)}</div>`);
  if(step>=7&&a.best9&&a.best9.length)parts.push(`<div class="panel ceremony">${awardBest9(a.best9)}</div>`);
  if(step>=8&&a.gloves&&a.gloves.length)parts.push(`<div class="panel ceremony">${awardGloves(a.gloves)}</div>`);
  if(step>=9)parts.push(`<div class="panel ceremony">${awardPodium(a.bestDH,"最佳指定打擊","🎯",false,
    "本季沒有符合資格的指定打擊（DH 出賽數不足，或沒有球員被排入 DH 棒次）。",dhStatLine)}</div>`);
  if(step>=10)parts.push(`<div class="panel ceremony">${awardPodium(a.mvp,"最有價值球員 MVP","👑",false)}</div>`);
  if(step>=11)parts.push(champPanel(champ));
  const nav=step>=AWARD_MAX
    ? `<button class="btn gold blk" data-act="awardsReplay">↺ 重新播放</button>
       <button class="btn blk" data-act="backToHub">← 回球季總部</button>`
    : `<button class="btn gold blk" data-act="awardStep">▶ 宣布下一項</button>
       <button class="btn blk" data-act="awardAll">全部展開</button>
       <button class="btn blk" data-act="backToHub">← 回球季總部</button>`;
  return parts.join("")+`<div class="panel"><div class="hr"></div>${nav}</div>`;
}

/* ---------- 明星賽（季中表演賽，不列入戰績） ---------- */
/* 明星賽 9 人：8 個守備位置各一位，第 9 位（DH）取綜合評分最高者 —— DH 是棒次不是守位 */
const AS_POS=["C","1B","2B","3B","SS","LF","CF","RF"];
function asReady(){
  const se=S.season;if(!se)return false;
  return (se.day||0)>=Math.floor(((se.schedule||[]).length)/2);
}
/* 本季表現分：打者 0~100，投手 0~100 */
function asSeasonScore(pid){
  const se=S.season; if(!se) return 0;
  const ps=se.playerStats; if(!ps) return 0;
  const b=ps.bat[pid], p=ps.pit[pid];
  if(b){
    const ab=b.ab||1;
    const avg=b.h/ab, obp=(b.h+(b.bb||0))/(ab+(b.bb||0));
    const hr=b.hr||0, rbi=b.rbi||0, sb=b.sb||0;
    return Math.min(100, Math.round(avg*300 + obp*200 + hr*3 + rbi*1.5 + sb*2));
  }
  if(p){
    const outs=p.outs||1;
    const era=(p.er||0)*27/outs;
    const whip=((p.h||0)+(p.bb||0))/outs*3;
    const w=p.w||0, k=p.k||0, sv=p.sv||0;
    return Math.min(100, Math.round((4.5-era)*15 + (1.3-whip)*80 + w*8 + k*0.5 + sv*6));
  }
  return 0;
}
function asPick(groupTeams){
  const pool=[];
  groupTeams.forEach(tid=>{
    getTeam(tid).batters.forEach(b=>{
      if(b.bench) return;
      const ov=playerOverall(b);
      const season=asSeasonScore(b.id);
      const score=Math.round(ov*0.6 + season*0.4);
      pool.push({id:b.id,pos:b.pos,ov,season,score});
    });
  });
  const byPos={};
  pool.forEach(x=>{
    if(!x.pos) return;
    if(!byPos[x.pos] || x.score>byPos[x.pos].score) byPos[x.pos]=x;
  });
  const ids=AS_POS.map(pos=>byPos[pos]).filter(Boolean).map(x=>x.id);
  if(ids.length<9){
    const used=new Set(ids);
    pool.sort((a,b)=>b.score-a.score).forEach(x=>{
      if(ids.length<9 && !used.has(x.id)){ids.push(x.id); used.add(x.id);}
    });
  }
  let sp=null,spScore=-1;
  groupTeams.forEach(tid=>{
    getTeam(tid).pitchers.filter(p=>p.starter).forEach(p=>{
      const ov=playerOverall(p);
      const season=asSeasonScore(p.id);
      const score=Math.round(ov*0.6 + season*0.4);
      if(score>spScore){spScore=score; sp=p.id;}
    });
  });
  return {batters:ids.slice(0,9),sp};
}
function asRosterTeams(){
  const st=standingsList();
  return {red:st.slice(0,4).map(x=>x.id),blue:st.slice(4,8).map(x=>x.id)};
}
function ensureAllstarRoster(){
  const se=S.season;if(!se||!GK.asReady())return;
  if(se.allstar&&se.allstar.red)return;
  const g=asRosterTeams();
  se.allstar={played:false,red:asPick(g.red),blue:asPick(g.blue),redTeams:g.red,blueTeams:g.blue};
  // 到達明星賽週自動生成名單並標記已通知
  se.asNotified=true;
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
  // 記錄完整名單到歷史
  const recordRed=a.red.batters.map(pid=>({pid,name:recName(pid),team:teamOfPlayer({id:pid}),pos:playerById(pid)?.posLabel,ov:playerOverall(playerById(pid))}));
  const recordBlue=a.blue.batters.map(pid=>({pid,name:recName(pid),team:teamOfPlayer({id:pid}),pos:playerById(pid)?.posLabel,ov:playerOverall(playerById(pid))}));
  const redSP=playerById(a.red.sp), blueSP=playerById(a.blue.sp);
  recordRed.push({pid:a.red.sp,name:recName(a.red.sp),team:teamOfPlayer({id:a.red.sp}),pos:redSP?.role||"先發",ov:playerOverall(redSP)});
  recordBlue.push({pid:a.blue.sp,name:recName(a.blue.sp),team:teamOfPlayer({id:a.blue.sp}),pos:blueSP?.role||"先發",ov:playerOverall(blueSP)});
  // 球員生涯明星賽次數
  CAREER.allstarAppearances=CAREER.allstarAppearances||{};
  [...recordRed,...recordBlue].forEach(p=>{
    CAREER.allstarAppearances[p.pid]=(CAREER.allstarAppearances[p.pid]||0)+1;
  });
  (CAREER.allstars||(CAREER.allstars=[])).push({
    no:a.no, winner:a.winner, red:recordRed, blue:recordBlue,
    mvp:a.mvp.name, mvpPid:a.mvp.pid, mvpTeam:a.mvp.team,
    score:a.score
  });
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
    const season=asSeasonScore(pid);
    return `<tr><td class="num">${i+1}</td><td class="name">${esc(p.name)}</td><td>${esc(p.posLabel||"")}</td>
      <td class="name">${teamBadge(teamOfPlayer({id:pid}))}</td><td class="num">${playerOverall(p)}</td><td class="num">${season}</td></tr>`;}).join("");
  const sp=playerById(squad.sp);
  const spSeason=sp?asSeasonScore(sp.id):0;
  const spRow=sp?`<tr><td class="num">P</td><td class="name">${esc(sp.name)}</td><td>${esc(sp.role||"先發")}</td>
      <td class="name">${teamBadge(teamOfPlayer({id:squad.sp}))}</td><td class="num">${playerOverall(sp)}</td><td class="num">${spSeason}</td></tr>`:"";
  return `<table class="grid"><tr><th>#</th><th>球員</th><th>守位</th><th>球隊</th><th>綜合</th><th>本季表現</th></tr>${rows}${spRow}</table>`;
}
function viewAllstar(){
  const se=S.season;
  if(!GK.asReady()){
    const need=Math.floor(((se.schedule||[]).length)/2);
    return `<div class="panel"><h2>⭐ 明星賽</h2>
      <p class="muted">例行賽進行到一半（第 ${need} 日）後才會舉辦明星賽，屆時會依戰績分成紅隊與藍隊，各由四個球團的精銳組成。</p>
      <div class="hr"></div><button class="btn blk" data-act="backHub">← 回球季總部</button></div>`;
  }
  ensureAllstarRoster();
  const a=se.allstar;
  const head=`<div class="panel"><h2>⭐ 球團明星賽</h2>
    <p class="muted">季中表演賽，勝負不列入例行賽戰績。紅隊由目前戰績前四強的球團精銳組成，藍隊為後四強。</p></div>`;
  const redPanel=`<div class="panel"><h3>🔴 紅隊</h3>${asRosterTable(a.red)}</div>`;
  const bluePanel=`<div class="panel"><h3>🔵 藍隊</h3>${asRosterTable(a.blue)}</div>`;
  let result="";
  if(a.played){
    const w=a.winner==="red"?"🔴 紅隊":"🔵 藍隊";
    result=`<div class="panel ceremony center"><h3>比賽結果</h3>
      <p style="font-size:22px;font-weight:900">紅隊 ${a.score.red} ： ${a.score.blue} 藍隊</p>
      <p class="muted">勝隊：${w}</p>
      <p>🌟 明星賽 MVP：<b>${esc(a.mvp.name)}</b>（${teamBadge(a.mvp.team)}）</p>
      <p class="muted" style="font-size:12px">入選依據：綜合能力 60% + 本季表現 40%</p></div>`;
  }
  const nav=a.played
    ? `<button class="btn blk" data-act="backToHub">← 回球季總部</button>`
    : `<button class="btn gold blk" data-act="allstarSim">▶ 進行明星賽</button>
       <button class="btn blk" data-act="backToHub">← 回球季總部</button>`;
  return head+redPanel+bluePanel+result+`<div class="panel"><div class="hr"></div>${nav}</div>`;
}