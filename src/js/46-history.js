/* ---------- 遊戲紀錄 ---------- */
/* 三種紀錄：
   1) 逐場賽果：本季每場比賽（例行賽＋季後賽）的對戰與比數。
   2) 跨季生涯：每完成一季，留下一筆摘要（戰績、名次、總冠軍）。
   3) 生涯里程碑：跨季累計的各項生涯數據排行榜。 */

/* 記錄一場比賽（例行賽帶 day；季後賽帶 stage 標籤、day 為 null） */
function logGame(day,stage,awayId,homeId,sa,sh){
  const se=S.season;if(!se)return;
  se.gl=se.gl||[];
  se.gl.push({d:day||null,st:stage||"",aw:awayId,hm:homeId,a:sa,h:sh});
}

/* 球季（含季後賽）結束：累計生涯數據、寫入跨季生涯摘要 */
function finalizeSeason(){
  const se=S.season;
  if(!se||se.finalized)return;
  se.finalized=true;

  /* 生涯累計（全聯盟球員） */
  CAREER.career=CAREER.career||{bat:{},pit:{}};
  const cb=CAREER.career.bat,cp=CAREER.career.pit;
  const ps=se.playerStats||{bat:{},pit:{}};

  /* 初登場球季：只要在這一季有過正式出賽就記下來（新人王只能拿第一季）。
     必須在生涯累計合併「之前」判斷：若這位球員前面幾季就已有跨季成績，代表他出道更早，
     只是當時還沒有這個紀錄功能 → 記 -1（未知），日後不拿它算效力球季數。 */
  CAREER.debut=CAREER.debut||{};
  const debutNo=CAREER.seasons+1;
  for(const pool of [ps.bat,ps.pit])for(const pid in pool){
    if((pool[pid].g||0)<=0||CAREER.debut[pid])continue;
    const priorG=(cb[pid]&&cb[pid].g)||(cp[pid]&&cp[pid].g)||0;
    CAREER.debut[pid]=priorG>0?-1:debutNo;
  }

  const BAT=["g","ab","h","hr","rbi","bb","k","r","sb"];
  const PIT=["g","outs","h","r","er","bb","k","pp","w","l","sv"];
  for(const pid in ps.bat){const s=ps.bat[pid],d=cb[pid]||(cb[pid]={});BAT.forEach(k=>d[k]=(d[k]||0)+(s[k]||0));}
  for(const pid in ps.pit){const s=ps.pit[pid],d=cp[pid]||(cp[pid]={});PIT.forEach(k=>d[k]=(d[k]||0)+(s[k]||0));}

  /* 跨季生涯摘要 */
  const st=standingsList();
  const me=se.playerTeam;
  const rank=st.findIndex(x=>x.id===me)+1;
  const rec=se.records[me]||{w:0,l:0,t:0};
  CAREER.history=CAREER.history||[];
  const hno=CAREER.seasons+1;
  CAREER.history.push({
    no:hno, team:me, w:rec.w, l:rec.l, t:rec.t, rank,
    champ:(se.playoff&&se.playoff.champion)||null, isChamp:!!(se.playoff&&se.playoff.champion===me)
  });
  /* 詳細球季存檔（供歷史回顧） */
  CAREER.seasonDetails=CAREER.seasonDetails||[];
  CAREER.seasonDetails.push({
    no:hno, team:me,
    rec:{w:rec.w, l:rec.l, t:rec.t, rank},
    rs:rec.rs||0, ra:rec.ra||0,
    champ:(se.playoff&&se.playoff.champion)||null,
    isChamp:!!(se.playoff&&se.playoff.champion===me),
    playoff:se.playoff?{stage:se.playoff.stage,champion:se.playoff.champion,semi:se.playoff.semi,final:se.playoff.final}:null,
    awards:se.awards?{mvp:se.awards.mvp,cy:se.awards.cy,reliever:se.awards.reliever,rookie:se.awards.rookie,sawamura:se.awards.sawamura,best9:se.awards.best9,gloves:se.awards.gloves,bestDH:se.awards.bestDH,kings:se.awards.kings}:null,
    leaders:se.awards?{bat:Object.keys(se.playerStats?.bat||{}).length,pit:Object.keys(se.playerStats?.pit||{}).length}:null,
    standings:st.map(x=>({id:x.id,w:x.w,l:x.l,t:x.t,pct:x.pct,rs:x.rs,ra:x.ra})),
    teamStats:{bat:{},pit:{}}
  });
  // 存球隊打擊/投手彙總
  const sd=CAREER.seasonDetails[CAREER.seasonDetails.length-1];
  for(const pid in ps.bat){const s=ps.bat[pid];const tid=teamOfPlayer({id:pid});if(tid===me)sd.teamStats.bat[pid]={...s};}
  for(const pid in ps.pit){const s=ps.pit[pid];const tid=teamOfPlayer({id:pid});if(tid===me)sd.teamStats.pit[pid]={...s};}
  // 逐季球員成績（全聯盟，用精簡陣列省空間）：供球員資料頁的「逐季成績」表使用
  // 同時存下當季的名字：pid 會被選秀新人沿用（同編號換人），光看 pid 分不出是誰的成績
  sd.playerStats={bat:{},pit:{}};
  sd.playerNames={bat:{},pit:{}};
  for(const pid in ps.bat){
    sd.playerStats.bat[pid]=BAT.map(k=>ps.bat[pid][k]||0);
    const p=playerById(pid); if(p)sd.playerNames.bat[pid]=p.name;
  }
  for(const pid in ps.pit){
    sd.playerStats.pit[pid]=PIT.map(k=>ps.pit[pid][k]||0);
    const p=playerById(pid); if(p)sd.playerNames.pit[pid]=p.name;
  }

  /* 歷屆獎項：綁定選手百科與紀錄殿堂 */
  CAREER.awards=CAREER.awards||[];
  const aw=se.awards;
  if(aw){
    const top1=list=>list&&list[0]?{pid:list[0].pid,name:list[0].name,team:list[0].team,pts:list[0].pts,s:list[0].s||null}:null;
    CAREER.awards.push({
      no:CAREER.seasons+1,
      champ:(se.playoff&&se.playoff.champion)||null,
      mvp:top1(aw.mvp), cy:top1(aw.cy), reliever:top1(aw.reliever), rookie:top1(aw.rookie), sawamura:top1(aw.sawamura),
      best9:(aw.best9||[]).map(x=>({pos:x.pos,name:x.name,pid:x.pid,team:x.team,pts:x.pts,s:x.s||null})),
      gloves:(aw.gloves||[]).map(x=>({pos:x.pos,name:x.name,pid:x.pid,team:x.team})),
      bestDH:(function(){
        const t=top1(aw.bestDH);if(!t||!aw.bestDH||!aw.bestDH[0])return null;
        const a=aw.bestDH[0];
        return {...t,dhPA:a.dhPA,dhAB:a.dhAB,dhH:a.dhH,dhHR:a.dhHR,dhRBI:a.dhRBI,dhBB:a.dhBB,avg:a.avg,obp:a.obp};
      })(),
      kings:(aw.kings||[]).filter(k=>k.name).map(k=>({kind:k.kind,title:k.title,name:k.name,pid:k.pid||"",team:k.team,val:k.val}))
    });
  }
  /* 單季紀錄榜（跨季最佳單季成績）＋ 季末里程碑補檢 */
  recordSeasonBest(ps,CAREER.seasons+1);
  checkMilestones();
  saveCareer();
}

/* ---------- 畫面 ---------- */
function histGamesPanel(){
  const se=S.season;
  const me=se?se.playerTeam:"";
  const gl=(se&&se.gl)||[];
  if(!gl.length)return `<div class="panel"><h2>逐場賽果</h2><p class="muted">本季尚無比賽紀錄。</p></div>`;
  let rows="",lastKey=null;
  let debugInfo = [];
  gl.forEach((g,gi)=>{
    const key=g.d?("D"+g.d):("S"+g.st);
    if(key!==lastKey){
      lastKey=key;
      const label=g.d?`第 ${g.d} 日`:(g.st||"季後賽");
      rows+=`<tr class="daysep"><td colspan="3">${esc(label)}</td></tr>`;
    }
    const mine=(g.aw===me||g.hm===me);
    const tie=g.a===g.h;
    const winner=tie?null:(g.a>g.h?g.aw:g.hm);
    const res=tie?'<span class="muted">和局</span>':`${teamBadge(winner)} 勝`;
    // 找對應的 box
    let box=null,inningHtml="";
    if(g.d!=null){
      const dayBoxes=(se.boxes||[])[g.d-1]||[];
      const idx=dayBoxes.findIndex(b=>b.aw===g.aw&&b.hm===g.hm);
      if(idx>=0)box=dayBoxes[idx];
    }else if(g.st!=null){
      box=(se.poBoxes||[]).find(b=>b.aw===g.aw&&b.hm===g.hm);
    }
    if(box){
      const a=box.line.aw||[],h=box.line.hm||[];
      const N=Math.max(a.length,h.length,1);
      const mk=(arr,tid)=>`<tr><td class="name">${teamBadge(tid)}</td>`+arr.slice(0,N).map(v=>`<td class="num">${v!=null?v:0}</td>`).join("")+`<td class="num"><b>${arr.reduce((s,v)=>s+(v||0),0)}</b></td></tr>`;
      const toggleId=`inning-${gi}`;
      inningHtml=`<tr id="${toggleId}" class="inning-detail" style="display:none"><td colspan="3">
        <table class="grid" style="margin:4px 0;font-size:11px"><tr><th></th>`+
        Array.from({length:N},(_,i)=>`<th>${i+1}</th>`).join("")+`<th>R</th></tr>`+
        mk(a,box.aw)+mk(h,box.hm)+`</table></td></tr>`;
      rows+=`<tr class="${mine?"me":""}" onclick="document.getElementById('${toggleId}').style.display=''"><td class="name">${teamBadge(g.aw)} vs ${teamBadge(g.hm)}</td>
        <td class="num">${g.a}：${g.h}</td><td class="name">${res} <span class="pill" style="font-size:10px">▼ 局數</span></td></tr>`;
      rows+=inningHtml;
    }else{
      rows+=`<tr class="${mine?"me":""}"><td class="name">${teamBadge(g.aw)} vs ${teamBadge(g.hm)}</td>
        <td class="num">${g.a}：${g.h}</td><td class="name">${res}</td></tr>`;
    }
  });
  return `<div class="panel"><h2>逐場賽果</h2>
    <p class="muted">本季所有比賽（例行賽＋季後賽）。＊標記者為你的球隊。點擊比賽列展開每局得分。</p>
    <table class="grid"><tr><th>對戰（客 vs 主）</th><th>比數（客：主）</th><th>結果</th></tr>${rows}</table>
    <p class="muted" style="font-size:11px;margin-top:6px">※ 比數以「客隊：主隊」顯示。0 分顯示為 0。點擊列展開局數細節。</p></div>`;
}
function histSeasonsPanel(){
  const h=CAREER.history||[];
  if(!h.length)return `<div class="panel"><h2>跨季生涯</h2><p class="muted">尚未完成任何一個球季。</p></div>`;
  const rows=h.map(x=>`<tr class="${x.isChamp?"me":""}"><td class="num">第 ${x.no} 季</td>
    <td class="name">${teamBadge(x.team)}</td>
    <td class="num">${x.w}-${x.l}${x.t?"-"+x.t:""}</td>
    <td class="num">第 ${x.rank} 名</td>
    <td class="name">${x.champ?teamBadge(x.champ)+(x.isChamp?" 🏆":""):"<span class=\"muted\">－</span>"}</td></tr>`).join("");
  const titles=CAREER.history.filter(x=>x.isChamp).length;
  const seasons=CAREER.history.length;
  return `<div class="panel"><h2>跨季生涯</h2>
    <p class="muted">共完成 <b>${seasons}</b> 個球季，其中 <b>${titles}</b> 次奪冠。</p>
    <table class="grid"><tr><th>球季</th><th>你的球隊</th><th>例行賽戰績</th><th>名次</th><th>總冠軍</th></tr>${rows}</table></div>`;
}
const HIST_CATS=[["hr","全壘打"],["h","安打"],["rbi","打點"],["sb","盜壘"],["r","得分"],["avg","打擊率"],["k","三振"],["w","勝投"],["sv","救援"]];
const HIST_MIN_AB=CAREER_MIN_AB;   // 生涯打擊率榜規定打席（與「生涯榜」、打擊率里程碑同門檻）
function histMilePanel(){
  const c=careerMerged(true);   // 含本季進行中、以及已引退球員的成績
  if(!c||((!c.bat||!Object.keys(c.bat).length)&&(!c.pit||!Object.keys(c.pit).length)))
    return `<div class="panel"><h2>生涯里程碑</h2><p class="muted">尚未有生涯累計資料。</p></div>`;
  const cat=S.histCat||"hr";
  const isPit=["k","w","sv"].indexOf(cat)>=0;
  const src=isPit?(c.pit||{}):(c.bat||{});
  const arr=[];
  const minAB=careerGateMin(CAREER_MIN_AB,CAREER_GATE_FLOOR_AB);
  if(cat==="avg"){
    for(const pid in src){const s=src[pid];if((s.ab||0)>=minAB)arr.push({pid,v:s.h/s.ab});}
  }else{
    for(const pid in src){const v=src[pid][cat]||0;if(v>0)arr.push({pid,v});}
  }
  arr.sort((a,b)=>b.v-a.v);
  const fmtV=cat==="avg"?fmtAvg:(v=>v);
  const rows=arr.slice(0,10).map((x,i)=>{
    const tid=careerTeam(x.pid);
    return `<tr><td class="num">${i+1}</td><td class="name">${pidLink(x.pid,careerName(x.pid))}</td>
      <td class="name">${tid?teamBadge(tid):""}</td><td class="num" style="font-weight:700">${fmtV(x.v)}</td></tr>`;
  }).join("")||`<tr><td colspan="4" class="muted">尚無資料。</td></tr>`;
  const tabs=HIST_CATS.map(k=>`<button class="btn sm ${k[0]===cat?"gold":""}" data-act="histCat" data-arg="${k[0]}">${k[1]}</button>`).join("");
  const title=(HIST_CATS.find(k=>k[0]===cat)||["",""])[1];
  return `<div class="panel"><h2>生涯里程碑</h2>
    <p class="muted">生涯數據排行榜（前 10 名，含本季目前成績）。${cat==="avg"?`打擊率需滿 ${minAB} 打席（標準 ${HIST_MIN_AB} 打席，生涯累積夠會自動收緊）。`:""}</p>
    <div class="actions">${tabs}</div>
    <table class="grid"><tr><th>#</th><th>球員</th><th>現屬球隊</th><th>生涯${title}</th></tr>${rows}</table></div>`;
}
function histAllstarPanel(){
  const list=(CAREER.allstars||[]).slice().reverse();
  if(!list.length)return `<div class="panel"><h2>明星賽</h2><p class="muted">尚未舉辦過明星賽。</p></div>`;
  const cards=list.map(x=>{
    const redNames=(x.red||[]).map(p=>`<span class="player-tag">${pidLink(p.pid,p.name)}(${p.pos?esc(p.pos):"P"})</span>`).join("")||"無";
    const blueNames=(x.blue||[]).map(p=>`<span class="player-tag">${pidLink(p.pid,p.name)}(${p.pos?esc(p.pos):"P"})</span>`).join("")||"無";
    const wName=x.winner==="red"?"🔴 紅隊":"🔵 藍隊";
    const mvpTxt=x.mvpPid?pidLink(x.mvpPid,x.mvp):esc(x.mvp||"－");
    const mvpTeam=x.mvpTeam?teamBadge(x.mvpTeam):"";
    return `
      <div class="panel card">
        <div class="card-head">
          <span class="num">第 ${x.no} 季</span>
          <span class="name">${wName} 勝 <span class="muted">(${x.score?.red||0}:${x.score?.blue||0})</span></span>
          <span class="name">${mvpTeam} <b>${mvpTxt}</b> <span class="pill on">MVP</span></span>
        </div>
        <div class="card-body">
          <div class="roster">
            <h4>🔴 紅隊</h4>
            <div class="tags">${redNames}</div>
          </div>
          <div class="roster">
            <h4>🔵 藍隊</h4>
            <div class="tags">${blueNames}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");
  return `<div class="panel"><h2>明星賽</h2>
    <p class="muted">歷屆明星賽結果、MVP、完整名單。入選依據：綜合能力 60% + 本季表現 40%。</p>
    <div class="cards">${cards}</div></div>`;
}
function histSeasonDetailPanel(){
  const list=(CAREER.seasonDetails||[]).slice().reverse();
  if(!list.length)return `<div class="panel"><h2>球季詳細回顧</h2><p class="muted">尚無完成的球季資料。</p></div>`;
  const cards=list.map(sd=>{
    const aw=sd.awards||{};
    // 舊存檔快照缺新獎項時，用 CAREER.awards 同季記錄回填
    const care=((CAREER.awards||[]).filter(a=>a.no===sd.no))[0]||{};
    const pick=(k)=>aw[k]||care[k];
    const isChamp=sd.isChamp||(sd.playoff&&sd.playoff.champion===sd.team);
    const po=sd.playoff;
    let poText="未進季後賽";
    if(po){
      if(po.champion) poText=po.champion===sd.team?`🏆 奪冠`:`出局（總冠軍：${teamBadge(po.champion)}）`;
      else if(po.stage==="final") poText="冠軍戰出局";
      else if(po.stage==="semi") poText="準決賽出局";
    }
    const prizeStat=(e,isPit,statFn)=>{
      if(!e||!e.name)return "<span class=\"muted\">－</span>";
      const s=e.s||{};
      const stats=statFn?statFn(e):(isPit
        ? `防禦率 ${s.outs?fmtERA(s.er||0,s.outs):"-.--"}　${s.w||0}勝 ${s.k||0}K ${s.sv||0}SV`
        : `打擊率 ${s.ab?fmtAvg((s.h||0)/s.ab):".000"}　${s.hr||0}轟 ${s.rbi||0}打點 ${e.pts!=null?`（${e.pts}分）`:""}`);
      return `${e.team?teamBadge(e.team):""} ${e.pid?pidLink(e.pid,e.name):esc(e.name)}<br><span class="muted" style="font-size:11px">${stats}</span>`;
    };
    const prize=(label,e,isPit,statFn)=>`<div class="slotinfo"><div class="nm">${label}</div><div class="meta">${prizeStat(e,isPit,statFn)}</div></div>`;
    /* 最佳指定打擊：顯示 DH 期間的數據 */
    const dhStat=e=>`DH 出賽 ${e.dhPA||0}　DH 打率 ${e.dhAB?fmtAvg((e.dhH||0)/e.dhAB):".000"}　OBP ${e.obp>0?fmtAvg(e.obp):".000"}　${e.dhHR||0}轟 ${e.dhRBI||0}打點${e.pts!=null?`（${e.pts}分）`:""}`;
    const mvp=(pick("mvp")||[])[0],cy=(pick("cy")||[])[0],rel=(pick("reliever")||[])[0],rook=(pick("rookie")||[])[0],sawa=(pick("sawamura")||[])[0],bdh=(pick("bestDH")||[])[0];
    const kings=((pick("kings")||[]).filter(k=>k.name)).map(k=>`<tr><td class="name">${esc(k.title)}</td><td class="name">${k.team?teamBadge(k.team):""} ${k.pid?pidLink(k.pid,k.name):esc(k.name)}</td><td class="num"><b>${k.val!=null?esc(String(k.val)):""}</b></td></tr>`).join("");
    const posName={C:"捕手","1B":"一壘手","2B":"二壘手","3B":"三壘手",SS:"游擊手",LF:"左外野",CF:"中外野",RF:"右外野",DH:"指定打擊",P:"投手"};
    const statOf=x=>{
      const s=x.s||{};
      if(x.pos==="P")return `防禦率 ${s.outs?fmtERA(s.er||0,s.outs):"-.--"} ${s.w||0}勝 ${s.k||0}K`;
      if(!s.ab)return "";
      return `打擊率 ${fmtAvg((s.h||0)/s.ab)} ${s.hr||0}轟 ${s.rbi||0}打點`;
    };
    const best9rows=(pick("best9")||[]).map(x=>`<tr><td class="name">${posName[x.pos]||x.pos}</td><td class="name">${x.team?teamBadge(x.team):""} ${x.pid?pidLink(x.pid,x.name):esc(x.name)}</td><td class="muted" style="font-size:11px">${statOf(x)}</td></tr>`).join("");
    return `<div class="panel card ${isChamp?"me":""}">
      <div class="card-head"><span class="num">第 ${sd.no} 季</span>
        <span class="name">${teamBadge(sd.team)}　${sd.rec.w}-${sd.rec.l}${sd.rec.t?"-"+sd.rec.t:""}（第 ${sd.rec.rank} 名）</span>
        <span class="name">得失 ${sd.rs||0}:${sd.ra||0}</span>
        <span class="name">${poText}${isChamp?" 🏆":""}</span></div>
      <div class="roster"><h4>個人獎項</h4>
        <div class="prizegrid">${prize("👑 最有價值球員",mvp,false)}${prize("🔥 最佳投手（先發）",cy,true)}${prize("🧱 最佳後援",rel,true)}${prize("⚾ 澤村賞（先發）",sawa,true)}${prize("🌟 新人王",rook,false)}${prize("🎯 最佳指定打擊",bdh,false,dhStat)}</div></div>
      <div class="two"><div class="roster"><h4>本季王座</h4>
        ${kings?`<table class="grid"><tr><th>獎項</th><th>得主</th><th>成績</th></tr>${kings}</table>`:'<p class="muted">－</p>'}</div>
        <div class="roster"><h4>最佳九人</h4>
        ${best9rows?`<table class="grid"><tr><th>守位</th><th>得主</th><th>成績</th></tr>${best9rows}</table>`:'<p class="muted">－</p>'}</div></div>
    </div>`;
  }).join("");
  return `<div class="panel"><h2>球季詳細回顧</h2>
    <p class="muted">每個球季的完整數據：戰績、排名、得分失分、季後賽、個人獎項、王座項目。</p>
    <p class="muted" style="font-size:11px">評分公式（3 出局＝1 局）：野手＝安打×0.8＋全壘打×2.5＋打點×1＋盜壘×0.5＋得分×0.8＋打擊率×110；先發＝勝×10＋三振×0.25＋出局數×0.07－防禦率×7；後援＝救援×6＋勝×4＋三振×0.2－防禦率×5；澤村賞＝三振率×400－保送率×300＋防禦率分段曲線（2.5以下每低1分+80，以上每高1分−140）（須投滿90局以上；不看勝場，與最佳投手得主可重複）；金手套＝守備×10＋出賽；最佳指定打擊＝DH 期間 OBP×100＋打率×60＋全壘打×2.5＋打點×1.2＋DH 出賽×0.6。各獎取對應組別最高分；九王座取單項第一。（MVP・新人王的投打統一評分研究中）</p>
    <div class="cards">${cards}</div></div>`;
}
function histRetirePanel(){
  const all=CAREER.retirements||[];
  const list=all.slice().reverse();          // 由新到舊顯示，但引用的索引是原始順序
  if(!list.length)return `<div class="panel"><h2>引退名單</h2><p class="muted">尚無引退球員。</p></div>`;
  const rows=list.map((r,ri)=>{
    const idx=all.indexOf(r);
    const s=r.stats||{};
    const span=r.seasons?`${r.seasons}季`:(Object.keys(s).length?"出道季不明":"");
    const summary=s.ab!=null?`出賽${s.g||0}　打率${s.ab?fmtAvg(s.h/s.ab):".000"}　安打${s.h||0}　全壘${s.hr||0}　打點${s.rbi||0}`
      :s.outs!=null?`出賽${s.g||0}　${s.outs?fmtERA(s.er||0,s.outs):"-.-"}　${s.w||0}勝${s.l||0}敗　三振${s.k||0}`
      :(r.line||"（舊存檔無詳細紀錄）");
    // 獲獎／明星賽／里程碑：pid 會被新人沿用，一律用 pid＋名字雙重比對
    const aws=retireeAwardsOf(r.pid,r.name);
    const awardCell=aws.length
      ?`<span title="${esc(aws.join("、"))}">${aws.length} 項<span class="muted" style="font-size:11px">（${esc(aws[aws.length-1])}等）</span></span>`
      :`<span class="muted">－</span>`;
    const asN=retireeAllstarCount(r.pid,r.name);
    const asCell=asN?`<span class="pill on">${asN} 次</span>`:`<span class="muted">－</span>`;
    const miles=milestonesFrom(r.miles);
    const mileCell=miles.length
      ?`<span title="${esc(miles.join("、"))}">${miles.length} 項<span class="muted" style="font-size:11px">（${esc(miles[0])}）</span></span>`
      :`<span class="muted">－</span>`;
    return `<tr><td class="num">第 ${r.no} 季</td>
    <td class="name">${r.team?teamBadge(r.team):""} ${pidLink(r.pid,r.name)}${span?`<br><span class="muted" style="font-size:11px">${esc(span)}</span>`:""}</td>
    <td>${esc(r.pos||"")}</td><td class="num">${r.age!=null?r.age+" 歲":""}</td>
    <td class="muted" style="font-size:11px">${esc(summary)}</td>
    <td>${awardCell}</td><td>${asCell}</td><td>${mileCell}</td></tr>`;
  }).join("");
  return `<div class="panel"><h2>引退名單</h2>
    <p class="muted">高掛球鞋的球員們（38 歲以上由選秀新人接班，39 歲自動引退）。<b>點名字</b>可看完整生涯資料。獲獎／明星賽／里程碑欄位把滑鼠停在數字上會列出明細。</p>
    <table class="grid"><tr><th>球季</th><th>球員</th><th>守位</th><th>年齡</th><th>生涯成績</th><th>獲獎</th><th>明星賽</th><th>里程碑</th></tr>${rows}</table></div>`;
}
function histBoardsPanel(){
  const m=careerMerged(true);   // 含已引退球員的終身成績
  // 門檻會隨生涯累積進度自動放寬→收緊（前期先讓人上榜，累積夠了就用標準門檻）
  const batMin=careerGateMin(CAREER_MIN_AB,CAREER_GATE_FLOOR_AB);
  const eraMin=careerGateMin(CAREER_MIN_ERA_OUTS,CAREER_GATE_FLOOR_OUTS);
  const cntMin=careerGateMin(CAREER_MIN_COUNT_OUTS,CAREER_GATE_FLOOR_OUTS);
  const batP=CAREER_BAT_REC.map(r=>careLeaderTable(m.bat,r[0],r[1],r[2],batMin,false,r[4])).join("");
  const pitP=CAREER_PIT_REC.map((r,i)=>careLeaderTable(m.pit,r[0],r[1],r[2],i===0?eraMin:cntMin,true,r[4])).join("");
  const relax=(cur,std,unit)=>cur<std?`目前需 ${cur} ${unit}（標準 ${std}，生涯累積夠會自動收緊）`:`需 ${std} ${unit}`;
  return `<div class="panel"><h2>生涯榜（跨季累計）</h2>
    <p class="muted">打擊榜${relax(batMin,CAREER_MIN_AB,"打席")}；防禦率榜${relax(eraMin,CAREER_MIN_ERA_OUTS,"出局數")}，勝投／三振／救援榜${relax(cntMin,CAREER_MIN_COUNT_OUTS,"出局數")}。<b>含已引退球員的終身成績</b>（點名字可看他的完整生涯）。</p>
    <div class="two"><div>${batP}</div><div>${pitP}</div></div></div>`;
}
function histPlayerCareerPanel(){
  const merged=careerMerged(true);   // 含已引退球員
  const allstarApp=CAREER.allstarAppearances||{};
  const allPids=[...new Set([...Object.keys(merged.bat),...Object.keys(merged.pit)])];
  const players=allPids.map(pid=>{
    const p=playerById(pid);
    const b=merged.bat[pid]||{}, pt=merged.pit[pid]||{};
    const isBat=Object.keys(b).length>0;
    const as=isBat&&p?(allstarApp[pid]||0):retireeAllstarCount(pid,careerName(pid));
    if(p)return {pid,name:p.name,team:teamOfPlayer({id:pid}),isBat,bat:b,pit:pt,age:p.age,as};
    // 已引退：沒有能力值，只能顯示歷史成績與當時的球隊
    return {pid,name:careerName(pid),team:careerTeam(pid),isBat,bat:b,pit:pt,age:null,as};
  }).filter(x=>x.name);
  players.sort((a,b)=>b.bat.g-b.bat.g || b.pit.g-a.pit.g);
  const rows=players.slice(0,30).map((pl,i)=>{
    const b=pl.bat, pt=pl.pit;
    const ab=b.ab||0, h=b.h||0, hr=b.hr||0, rbi=b.rbi||0, sb=b.sb||0, avg=ab?fmtAvg(h/ab):".000";
    const w=pt.w||0, l=pt.l||0, k=pt.k||0, era=pt.outs?fmtERA(pt.er,pt.outs):"-.--";
    const as=pl.as>0?`<span class="pill on">${pl.as}⭐</span>`:"<span class=\"muted\">－</span>";
    return `<tr><td class="num">${i+1}</td>
      <td class="name">${pidLink(pl.pid,pl.name)} ${teamBadge(pl.team)} <span class="pill ${pl.isBat?"on":"off"}">${pl.isBat?"打者":"投手"}</span></td>
      <td class="num">${b.g||0}</td><td class="num">${ab}</td><td class="num">${avg}</td><td class="num">${hr}</td><td class="num">${rbi}</td><td class="num">${sb}</td>
      <td class="num">${pt.g||0}</td><td class="num">${w}-${l}</td><td class="num">${era}</td><td class="num">${k}</td>
      <td class="name">${as}</td></tr>`;
  }).join("");
  return `<div class="panel"><h2>球員生涯總覽</h2>
    <p class="muted">所有曾效力於你球隊的球員跨季累計數據（<b>含已引退球員的終身成績</b>，依出賽數排序，顯示前 30 名）。⭐=明星賽入選次數</p>
    <table class="grid"><tr><th>#</th><th>球員</th><th>出賽</th><th>打數</th><th>打擊率</th><th>全壘打</th><th>打點</th><th>盜壘</th><th>出賽</th><th>勝-敗</th><th>防禦率</th><th>三振</th><th>⭐</th></tr>${rows}</table></div>`;
}
function viewHistory(){
  const tab=S.histTab||"games";
  const tabs=[["games","逐場賽果"],["seasons","跨季生涯"],["detail","球季詳細"],["player","球員生涯"],["mile","生涯里程碑"],["allstar","明星賽"],["retire","引退名單"],["boards","生涯榜"]];
  const bar=tabs.map(t=>`<button class="btn sm ${t[0]===tab?"gold":""}" data-act="histTab" data-arg="${t[0]}">${t[1]}</button>`).join("");
  const body=tab==="seasons"?histSeasonsPanel():tab==="detail"?histSeasonDetailPanel():tab==="player"?histPlayerCareerPanel():tab==="mile"?histMilePanel():tab==="allstar"?histAllstarPanel():tab==="retire"?histRetirePanel():tab==="boards"?histBoardsPanel():histGamesPanel();
  return `<div class="panel"><h2>📜 遊戲紀錄</h2>
    <p class="muted">回顧你的每一場比賽、每個球季詳細數據、球員生涯軌跡、生涯里程碑與明星賽。</p>
    <div class="actions">${bar}</div></div>
    ${body}
    <div class="panel"><button class="btn blk" data-act="backHub">← 回到球季總部</button></div>`;
}
