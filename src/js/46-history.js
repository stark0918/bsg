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
  CAREER.history.push({
    no:CAREER.seasons+1, team:me, w:rec.w, l:rec.l, t:rec.t, rank,
    champ:(se.playoff&&se.playoff.champion)||null, isChamp:!!(se.playoff&&se.playoff.champion===me)
  });
  saveCareer();
}

/* ---------- 畫面 ---------- */
function histGamesPanel(){
  const se=S.season;
  const me=se?se.playerTeam:"";
  const gl=(se&&se.gl)||[];
  if(!gl.length)return `<div class="panel"><h2>逐場賽果</h2><p class="muted">本季尚無比賽紀錄。</p></div>`;
  let rows="",lastKey=null;
  gl.forEach(g=>{
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
    rows+=`<tr class="${mine?"me":""}"><td class="name">${teamBadge(g.aw)} vs ${teamBadge(g.hm)}</td>
      <td class="num">${g.a}：${g.h}</td><td class="name">${res}</td></tr>`;
  });
  return `<div class="panel"><h2>逐場賽果</h2>
    <p class="muted">本季所有比賽（例行賽＋季後賽）。＊標記者為你的球隊。</p>
    <table class="grid"><tr><th>對戰（客 vs 主）</th><th>比數（客：主）</th><th>結果</th></tr>${rows}</table>
    <p class="muted" style="font-size:11px;margin-top:6px">※ 比數以「客隊：主隊」顯示。</p></div>`;
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
const HIST_CATS=[["hr","全壘打"],["h","安打"],["rbi","打點"],["sb","盜壘"],["r","得分"],["k","三振"],["w","勝投"],["sv","救援"]];
function histMilePanel(){
  const c=CAREER.career;
  if(!c||((!c.bat||!Object.keys(c.bat).length)&&(!c.pit||!Object.keys(c.pit).length)))
    return `<div class="panel"><h2>生涯里程碑</h2><p class="muted">尚未有跨季累計資料。</p></div>`;
  const cat=S.histCat||"hr";
  const isPit=["k","w","sv"].indexOf(cat)>=0;
  const src=isPit?(c.pit||{}):(c.bat||{});
  const arr=[];
  for(const pid in src){const v=src[pid][cat]||0;if(v>0)arr.push({pid,v});}
  arr.sort((a,b)=>b.v-a.v);
  const rows=arr.slice(0,10).map((x,i)=>{
    const p=playerById(x.pid);
    const tid=teamOfPlayer({id:x.pid});
    return `<tr><td class="num">${i+1}</td><td class="name">${p?esc(p.name):x.pid}</td>
      <td class="name">${teamBadge(tid)}</td><td class="num" style="font-weight:700">${x.v}</td></tr>`;
  }).join("")||`<tr><td colspan="4" class="muted">尚無資料。</td></tr>`;
  const tabs=HIST_CATS.map(k=>`<button class="btn sm ${k[0]===cat?"gold":""}" data-act="histCat" data-arg="${k[0]}">${k[1]}</button>`).join("");
  const title=(HIST_CATS.find(k=>k[0]===cat)||["",""])[1];
  return `<div class="panel"><h2>生涯里程碑</h2>
    <p class="muted">跨季累計的生涯數據排行榜（前 10 名）。</p>
    <div class="actions">${tabs}</div>
    <table class="grid"><tr><th>#</th><th>球員</th><th>現屬球隊</th><th>生涯${title}</th></tr>${rows}</table></div>`;
}
function viewHistory(){
  const tab=S.histTab||"games";
  const tabs=[["games","逐場賽果"],["seasons","跨季生涯"],["mile","生涯里程碑"]];
  const bar=tabs.map(t=>`<button class="btn sm ${t[0]===tab?"gold":""}" data-act="histTab" data-arg="${t[0]}">${t[1]}</button>`).join("");
  const body=tab==="seasons"?histSeasonsPanel():tab==="mile"?histMilePanel():histGamesPanel();
  return `<div class="panel"><h2>📜 遊戲紀錄</h2>
    <p class="muted">回顧你的每一場比賽、每個球季，以及跨季累積的生涯里程碑。</p>
    <div class="actions">${bar}</div></div>
    ${body}
    <div class="panel"><button class="btn blk" data-act="backHub">← 回到球季總部</button></div>`;
}
