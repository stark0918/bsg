/* ---------- 連勝／連敗（本季即時＋隊史最長） ---------- */
/* 依賽程日序重建各隊當前連續狀態；和局中斷連續 */
function teamStreaks(){
  const se=S.season;const cur={};
  TEAM_DEFS.forEach(t=>cur[t.id]={type:null,n:0});
  (se.schedule||[]).forEach(day=>{
    (day||[]).forEach(g=>{
      if(!g.played||!g.score)return;
      const sc=gameScore(g);
      const res=sc.a===sc.h?null:(sc.a>sc.h?"away":"home");
      [[g.away,res==="away"?"W":(res?"L":null)],[g.home,res==="home"?"W":(res?"L":null)]].forEach(([id,r])=>{
        if(!r){cur[id]={type:null,n:0};return;}
        cur[id]=(cur[id].type===r)?{type:r,n:cur[id].n+1}:{type:r,n:1};
      });
    });
  });
  return cur;
}
function streakLabel(s){
  if(!s||!s.type||!s.n)return "<span class=\"muted\">－</span>";
  return s.type==="W"?`<b style="color:#4fd39a">${s.n}連勝</b>`:`<b style="color:#e06782">${s.n}連敗</b>`;
}
/* 每日賽後更新隊史最長連勝／連敗 */
function updateStreakBest(){
  const cur=teamStreaks();
  CAREER.streakBest=CAREER.streakBest||{};
  for(const id in cur){
    const b=CAREER.streakBest[id]||(CAREER.streakBest[id]={w:0,l:0});
    if(cur[id].type==="W"&&cur[id].n>b.w)b.w=cur[id].n;
    if(cur[id].type==="L"&&cur[id].n>b.l)b.l=cur[id].n;
  }
  saveCareer();
}
/* ---------- 單場紀錄簿（本季＋生涯） ---------- */
function newRecBook(){
  return {bat:{h:null,hr:null,rbi:null,r:null,sb:null,bb:null,k:null},
          pit:{k:null,ip:null},
          team:{r:null,margin:null,innings:null,inn:null}};
}
function recUp(book,cat,key,val,name,team,when,extra){
  if(!book||!book[cat])return null;
  const cur=book[cat][key];
  if(!cur||val>cur.val){
    const old = cur ? cur.val : null;
    book[cat][key]={val:val,name:name,team:team,when:when,season:(extra&&extra.season)||0};
    return {old, val, isNew: !cur};
  }
  return null;
}
function recUpBoth(cat,key,val,name,team,when){
  if(S.season&&!S.season.recs)S.season.recs=newRecBook();
  const br1 = recUp(S.season.recs,cat,key,val,name,team,when);
  const c=CAREER.records||(CAREER.records={});
  if(!c.bat)c.bat={};if(!c.pit)c.pit={};if(!c.team)c.team={};
  const br2 = recUp(c,cat,key,val,name,team,when,{season:seasonNo()});
  const br = br1 || br2;
  if(br && S.season){
    const lbl = REC_LABELS[cat]&&REC_LABELS[cat][key]||key;
    const verb = br.isNew ? "締造" : "刷新";
    const diff = (br.old!=null && br.val!=br.old) ? `（原紀錄 ${br.old}）` : "";
    const teamName = team ? getTeam(team).name : "";
    const who = (teamName&&name===teamName) ? teamName : (teamName?teamName+" "+name:name);
    const txt = `★ 單場紀錄 ${verb}：${who}　${lbl} ${br.val}${diff}`;
    const se=S.season;
    se.news = se.news||[];
    se.news.push({day:se.day+1,text:txt,special:true,team:team||null});
    if(se.news.length>10)se.news.shift();
    if(!S.flash) S.flash = txt;
  }
}
function recName(pid){const p=playerById(pid);return p?p.name:pid;}
function recTeam(pid){return teamOfPlayer({id:pid});}
/* 玩家（或任何有完整逐人成績的）比賽掃描 */
function checkMatchRecords(m,when){
  if(!S.season.recs)S.season.recs=newRecBook();
  if(!S.season.recs.bat)S.season.recs=newRecBook();
  for(const pid in m.stats){const s=m.stats[pid];
    ["h","hr","rbi","r","sb","bb","k"].forEach(k=>recUpBoth("bat",k,s[k]||0,recName(pid),recTeam(pid),when));
  }
  for(const pid in m.pstats){const s=m.pstats[pid];
    recUpBoth("pit","k",s.k||0,recName(pid),recTeam(pid),when);
    recUpBoth("pit","ip",Math.round((s.outs||0)/3*10)/10,recName(pid),recTeam(pid),when);
  }
  const aName=getTeam(m.awayId).name,hName=getTeam(m.homeId).name;
  recUpBoth("team","r",m.score.away,aName,m.awayId,when);
  recUpBoth("team","r",m.score.home,hName,m.homeId,when);
  const wId=m.score.away>m.score.home?m.awayId:m.homeId;
  recUpBoth("team","margin",Math.abs(m.score.away-m.score.home),m.winner?getTeam(wId).name:"兩隊",m.winner?wId:"",when);
  recUpBoth("team","innings",m.inning,m.winner?getTeam(wId).name:getTeam(m.homeId).name,m.winner?wId:m.homeId,when);
}
/* 快速模擬比賽的逐人成績掃描（synthGameStats 回傳） */
function checkLineRecords(lines,teamId,when){
  (lines.bat||[]).forEach(s=>{["h","hr","rbi","r","sb","bb","k"].forEach(k=>recUpBoth("bat",k,s[k]||0,recName(s.pid),teamId,when));});
  (lines.pit||[]).forEach(s=>{
    recUpBoth("pit","k",s.k||0,recName(s.pid),teamId,when);
    recUpBoth("pit","ip",Math.round((s.outs||0)/3*10)/10,recName(s.pid),teamId,when);
  });
}
function checkSimTeamRecords(awayId,homeId,ra,rh,when){
  recUpBoth("team","r",ra,getTeam(awayId).name,awayId,when);
  recUpBoth("team","r",rh,getTeam(homeId).name,homeId,when);
  const wId=ra>rh?awayId:homeId;
  recUpBoth("team","margin",Math.abs(ra-rh),getTeam(wId).name,wId,when);
}
/* 單局團隊得分：掃當日所有 box 的逐局線（含玩家實戰場，僅例行賽） */
function checkInningRecords(dayIdx,when){
  const arr=(S.season.boxes||[])[dayIdx]||[];
  arr.forEach(b=>{
    if(!b||!b.line)return;
    (b.line.aw||[]).forEach(v=>{if((v||0)>0)recUpBoth("team","inn",v,getTeam(b.aw).name,b.aw,when);});
    (b.line.hm||[]).forEach(v=>{if((v||0)>0)recUpBoth("team","inn",v,getTeam(b.hm).name,b.hm,when);});
  });
}
/* ---------- 紀錄殿堂畫面 ---------- */
const REC_LABELS={
  bat:{h:"單場安打",hr:"單場全壘打",rbi:"單場打點",r:"單場得分",sb:"單場盜壘",bb:"單場四壞",k:"單場三振"},
  pit:{k:"單場奪三振",ip:"單場投球局數"},
  team:{r:"單場團隊得分",margin:"最大勝差分",innings:"最長比賽局數",inn:"單局團隊得分"}
};
function recRow(book,cat,key){
  const r=book&&book[cat]&&book[cat][key];
  if(!r)return `<tr><td>${REC_LABELS[cat][key]}</td><td class="num muted">－</td><td></td></tr>`;
  const when=r.season?`第 ${r.season} 季 ${r.when}`:r.when;
  return `<tr><td>${REC_LABELS[cat][key]}</td><td class="num"><b>${r.val}</b></td>
    <td class="name">${r.team?teamBadge(r.team):""} ${esc(r.name)}<br><span class="muted" style="font-size:11px">${esc(when||"")}</span></td></tr>`;
}
function recPanel(book,title){
  let rows="";
  for(const cat in REC_LABELS)for(const key in REC_LABELS[cat])rows+=recRow(book,cat,key);
  return `<div class="panel"><h2>${title}</h2>
    <table class="grid"><tr><th>項目</th><th>紀錄值</th><th>締造者</th></tr>${rows}</table></div>`;
}
const REC_TABS=[["single","🏅 單場"],["season","📊 本季團隊"],["seasonbest","📈 單季紀錄"],["career","🏛 生涯榜"]];
function viewRecords(){
  const tab=S.recTab||"single";
  const tabbar=`<div class="tabbar">${REC_TABS.map(([k,l])=>`<button class="tab ${tab===k?"on":""}" data-act="recTab" data-arg="${k}">${l}</button>`).join("")}</div>`;
  const body=tab==="single"?recTabSingle():tab==="season"?recTabSeason():tab==="seasonbest"?recTabSeasonBest():recTabCareer();
  return `<div class="panel"><div class="hallhead">
    <h2 style="margin:0 0 2px">🏛 劇空間紀錄殿堂</h2>
    <p class="muted" style="margin:0">每一項數字，都是這些球季留下來的足跡。</p></div>
    ${tabbar}${body}
    <div class="hr"></div>
    <button class="btn gold blk" data-act="exportCsv">⬇ 匯出本季逐場 CSV</button>
    <button class="btn blk" data-act="backHub">← 回球季總部</button></div>`;
}
function recTabSingle(){
  const b=S.season.recs||newRecBook();
  return recPanel(b,"本季紀錄")+recPanel(CAREER.records,"聯盟歷史紀錄");
}
function recTabSeason(){
  const se=S.season;
  if(!se)return "";
  const agg={};
  TEAM_DEFS.forEach(t=>agg[t.id]={id:t.id,g:0,w:0,l:0,t:0,rs:0,ra:0});
  (se.boxes||[]).forEach(arr=>(arr||[]).forEach(b=>{
    const a=agg[b.aw],h=agg[b.hm];
    a.g++;h.g++;a.rs+=b.a;a.ra+=b.h;h.rs+=b.h;h.ra+=b.a;
    if(b.a>b.h){a.w++;h.l++;}else if(b.h>b.a){h.w++;a.l++;}else{a.t++;h.t++;}
  }));
  const rows=Object.values(agg).sort((x,y)=>y.w-x.w||(y.rs-y.ra)-(x.rs-x.ra)).map((x,i)=>{
    const isMe=x.id===se.playerTeam;
    return `<tr class="${isMe?"me":""}"><td class="num">${i+1}</td><td class="name">${teamBadge(x.id)}${isMe?"（你）":""}</td>
      <td class="num">${x.g}</td><td class="num">${x.w}-${x.l}${x.t?"-"+x.t:""}</td>
      <td class="num">${x.rs}:${x.ra}</td><td class="num">${x.rs-x.ra>0?"+":""}${x.rs-x.ra}</td></tr>`;
  }).join("");
  const ks=AWARD_KINGS.map(([kind,title])=>{
    const top=leadersList(kind)[0];
    if(!top)return "";
    return `<tr><td class="name">${esc(title)}</td><td class="name">${esc(top.p.name)}</td><td class="name">${teamBadge(top.pid.replace(/[bp]\d+$/,""))}</td><td class="num"><b>${esc(top.val)}</b></td></tr>`;
  }).join("");
  return `<div class="panel"><h2>團隊攻守（含所有模擬場次）</h2>
    <table class="grid"><tr><th>#</th><th>球隊</th><th>出賽</th><th>戰績</th><th>得:失</th><th>得失差</th></tr>${rows}</table></div>
    ${streakBestPanel()}
    <div class="panel"><h2>本季王座（暫列）</h2>
    <table class="grid"><tr><th>獎項</th><th>球員</th><th>球隊</th><th>成績</th></tr>${ks||'<tr><td colspan="4" class="muted">尚無資料</td></tr>'}</table></div>`;
}
function streakBestPanel(){
  const B=(CAREER.streakBest||{});
  const rows=TEAM_DEFS.map(t=>{
    const b=B[t.id]||{w:0,l:0};
    const cur=(function(){try{return teamStreaks()[t.id];}catch(e){return{type:null,n:0};}})();
    return `<tr><td class="name">${teamBadge(t.id)}</td>
      <td class="num">${b.w?`<b>${b.w} 連勝</b>`:'<span class="muted">－</span>'}</td>
      <td class="num">${b.l?`<b>${b.l} 連敗</b>`:'<span class="muted">－</span>'}</td>
      <td class="num">${streakLabel(cur)}</td></tr>`;
  }).join("");
  return `<div class="panel"><h2>隊史最長連勝／連敗</h2>
    <table class="grid"><tr><th>球隊</th><th>最長連勝</th><th>最長連敗</th><th>本季目前</th></tr>${rows}</table></div>`;
}
/* 生涯（跨季）累計：已完成球季＋本季進行中（若未結算） */
function careerMerged(){
  const cb={},cp={};
  const care=CAREER.career||{};
  for(const pid in (care.bat||{}))cb[pid]=Object.assign({},care.bat[pid]);
  for(const pid in (care.pit||{}))cp[pid]=Object.assign({},care.pit[pid]);
  const se=S.season;
  if(se&&!se.finalized&&se.playerStats){
    for(const pid in se.playerStats.bat){const s=se.playerStats.bat[pid],d=cb[pid]||(cb[pid]={});["g","ab","h","hr","rbi","bb","k","r","sb"].forEach(k=>d[k]=(d[k]||0)+(s[k]||0));}
    for(const pid in se.playerStats.pit){const s=se.playerStats.pit[pid],d=cp[pid]||(cp[pid]={});["g","outs","h","r","er","bb","k","pp","w","l","sv"].forEach(k=>d[k]=(d[k]||0)+(s[k]||0));}
  }
  return {bat:cb,pit:cp};
}
const CAREER_BAT_REC=[
  ["生涯打擊率",s=>s.ab?s.h/s.ab:null,fmtAvg,120,true],
  ["生涯全壘打",s=>s.hr||0,Number,120,true],
  ["生涯打點",s=>s.rbi||0,Number,120,true],
  ["生涯安打",s=>s.h||0,Number,120,true],
  ["生涯盜壘",s=>s.sb||0,Number,120,true]
];
const CAREER_PIT_REC=[
  ["生涯防禦率",s=>s.outs?(s.er/s.outs)*27:null,v=>v.toFixed(2),50,false],
  ["生涯勝投",s=>s.w||0,Number,50,true],
  ["生涯三振",s=>s.k||0,Number,50,true],
  ["生涯救援",s=>s.sv||0,Number,50,true]
];
function careLeaderTable(pool,title,valFn,fmt,min,isPit,desc){
  const arr=[];
  const re=isPit?/p\d+$/:/b\d+$/;
  for(const pid in pool){
    const s=pool[pid];
    if(!re.test(pid))continue;
    if(isPit){if((s.outs||0)<min)continue;}else if((s.ab||0)<min)continue;
    const v=valFn(s);if(v==null)continue;
    arr.push({pid,v,name:recName(pid),team:recTeam(pid)});
  }
  arr.sort((a,b)=>desc?b.v-a.v:a.v-b.v);
  const rows=arr.slice(0,5).map((r,i)=>`<tr><td class="num">${i<3?`<span class="medal g${i+1}">${i+1}</span>`:i+1}</td>
    <td class="name">${esc(r.name)}</td><td class="name">${teamBadge(r.team)}</td><td class="num"><b>${fmt(r.v)}</b></td></tr>`).join("");
  return `<div style="margin:8px 0"><h3 style="font-size:14px;margin:0 0 4px">${esc(title)}</h3>
    <table class="grid"><tr><th>#</th><th>球員</th><th>隊</th><th>成績</th></tr>${rows||'<tr><td colspan="4" class="muted">未達上榜門檻</td></tr>'}</table></div>`;
}
function careerAxis(){
  const h=CAREER.history||[];
  if(!h.length)return `<div class="panel"><h2>生涯戰績</h2><p class="muted">完成一整個球季後，會在這裡留下生涯足跡。</p></div>`;
  const items=h.slice().reverse().map(x=>{
    const champ=x.isChamp?' <span class="pill on">👑 總冠軍</span>':"";
    return `<tr class="${x.isChamp?"me":""}"><td class="num">第 ${x.no} 季</td>
      <td class="name">${teamBadge(x.team)}${champ}</td>
      <td class="num">${x.w}-${x.l}${x.t?"-"+x.t:""}</td><td class="num">第 ${x.rank} 名</td></tr>`;
  }).join("");
  const champs=h.filter(x=>x.isChamp).length;
  const totW=h.reduce((a,x)=>a+x.w,0),totL=h.reduce((a,x)=>a+x.l,0);
  return `<div class="panel"><h2>生涯戰績（${h.length} 季 · ${champs?"總冠軍 ×"+champs:"尚未奪冠"} · 累計 ${totW}勝${totL}敗）</h2>
    <table class="grid"><tr><th>球季</th><th>球隊</th><th>戰績</th><th>名次</th></tr>${items}</table></div>`;
}
function recTabCareer(){
  const m=careerMerged();
  const batP=CAREER_BAT_REC.map(r=>careLeaderTable(m.bat,r[0],r[1],r[2],r[3],false,r[4])).join("");
  const pitP=CAREER_PIT_REC.map(r=>careLeaderTable(m.pit,r[0],r[1],r[2],r[3],true,r[4])).join("");
  
  /* 里程碑摘要 */
  const totalMiles=Object.values(CAREER.milestones||{}).reduce((sum,ms)=>sum+Object.keys(ms).length,0);
  const topMilers=Object.entries(CAREER.milestones||{}).map(([pid,ms])=>({pid,count:Object.keys(ms).length})).sort((a,b)=>b.count-a.count).slice(0,5);
  const milerRows=topMilers.map((x,i)=>{const p=playerById(x.pid);return p?`<tr><td class="num">${i+1}</td><td class="name">${esc(p.name)} ${teamBadge(x.pid.replace(/[bp]\d+$/,""))}</td><td class="num">${x.count} 項</td></tr>`:"";}).join("");
  const milerTable=topMilers.length?`<div style="margin:8px 0"><h3 style="font-size:14px;margin:0 0 4px">里程碑達成王</h3>
    <table class="grid"><tr><th>#</th><th>球員</th><th>項數</th></tr>${milerRows}</table></div>`:"";
  
  return careerAxis()+awardsAxis()+milerTable+
    `<div class="panel"><h2>生涯紀錄榜（跨季累計）</h2>
    <p class="muted" style="font-size:12px">共 ${totalMiles} 項里程碑達成</p>
    <div class="two"><div>${batP}</div><div>${pitP}</div></div></div>`;
}
/* 歷屆榮譽（總冠軍＋三大獎＋各項王座） */
function awardsAxis(){
  const A=CAREER.awards||[];
  if(!A.length)return "";
  // 主要獎項表
  const majorRows=A.slice().reverse().map(a=>`
    <tr class="${a.isChamp?"me":""}">
      <td class="num">第 ${a.no} 季</td>
      <td class="name">${a.champ?teamBadge(a.champ):"－"}</td>
      <td class="name">${a.mvp?esc(a.mvp.name)+" "+teamBadge(a.mvp.team):"－"}</td>
      <td class="name">${a.cy?esc(a.cy.name)+" "+teamBadge(a.cy.team):"－"}</td>
      <td class="name">${a.rookie?esc(a.rookie.name)+" "+teamBadge(a.rookie.team):"－"}</td>
    </tr>`).join("");
  // 王座項目：分兩組顯示（打擊/投手）
  const batKings=["avg","hr","rbi","h","sb","r"];
  const pitKings=["era","k","w","sv"];
  const kingLabel={avg:"打擊王",hr:"全壘打王",rbi:"打點王",h:"安打王",sb:"盜壘王",r:"得分王",era:"防禦率王",k:"三振王",w:"勝投王",sv:"救援王"};
  const kingRowsBat=A.slice().reverse().map(a=>{
    const cells=batKings.map(k=>{
      const e=(a.kings||[]).find(x=>x.kind===k);
      return e?`<td class="name">${esc(e.name)} ${teamBadge(e.team)}<br><span class="muted" style="font-size:11px">${esc(e.val)}</span></td>`:"<td class=\"muted\">－</td>";
    }).join("");
    return `<tr><td class="num">第 ${a.no} 季</td>${cells}</tr>`;
  }).join("");
  const kingRowsPit=A.slice().reverse().map(a=>{
    const cells=pitKings.map(k=>{
      const e=(a.kings||[]).find(x=>x.kind===k);
      return e?`<td class="name">${esc(e.name)} ${teamBadge(e.team)}<br><span class="muted" style="font-size:11px">${esc(e.val)}</span></td>`:"<td class=\"muted\">－</td>";
    }).join("");
    return `<tr><td class="num">第 ${a.no} 季</td>${cells}</tr>`;
  }).join("");
  const batHeaders=batKings.map(k=>`<th>${kingLabel[k]}</th>`).join("");
  const pitHeaders=pitKings.map(k=>`<th>${kingLabel[k]}</th>`).join("");
  return `
    <div class="panel"><h2>歷屆榮譽</h2>
      <table class="grid"><tr><th>球季</th><th>總冠軍</th><th>MVP</th><th>最佳投手</th><th>新人王</th></tr>${majorRows}</table></div>
    <div class="panel"><h3>打擊部門王座</h3>
      <table class="grid"><tr><th>球季</th>${batHeaders}</tr>${kingRowsBat}</table></div>
    <div class="panel"><h3>投手部門王座</h3>
      <table class="grid"><tr><th>球季</th>${pitHeaders}</tr>${kingRowsPit}</table></div>
  `;
}
/* ---------- 逐場 CSV 匯出 ---------- */
function csvCell(v){v=(v==null?"":String(v));return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function seasonCSV(){
  const se=S.season;if(!se)return "";
  const rows=[["類別","日","階段","客隊","主隊","比分","球隊","球員","打數","安打","全壘打","打點","四壞","三振","得分","盜壘","局數","被安","責失","勝","敗","救援"]];
  const push=(b,d,stage)=>{
    const label=d==null?stage:("第 "+(d+1)+" 日");
    const aw=getTeam(b.aw).name,hm=getTeam(b.hm).name,score=b.a+"-"+b.h;
    for(const pid in b.bat){
      const f=b.bat[pid],p=playerById(pid);
      rows.push(["打者",label,"",aw,hm,score,getTeam(pid.replace(/[bp]\d+$/,"")).name,p?p.name:pid,
        f[0],f[1],f[2],f[3],f[4],f[5],f[6],f[7],"","","","","",""].map(csvCell));
    }
    for(const pid in b.pit){
      const f=b.pit[pid],p=playerById(pid);
      rows.push(["投手",label,"",aw,hm,score,getTeam(pid.replace(/[bp]\d+$/,"")).name,p?p.name:pid,
        "","","","","","","","",fmtIP(f[0]),f[1],f[3],f[7],f[8],f[9]].map(csvCell));
    }
  };
  (se.boxes||[]).forEach((arr,d)=>(arr||[]).forEach(b=>push(b,d,"")));
  (se.poBoxes||[]).forEach((b,i)=>push(b,null,b.st||"季後賽"));
  return "\uFEFF"+rows.map(r=>r.join(",")).join("\r\n");
}
function downloadCSV(){
  const csv=seasonCSV();
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");
  if(a.download!==undefined){
    a.href=URL.createObjectURL(blob);
    a.download="劇空間棒球_逐場明細.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
  }else{
    const w=window.open("","_blank");
    if(w){w.document.write("<pre>"+csv.replace(/</g,"&lt;")+"</pre>");w.document.close();}
  }
}

/* ---------- 單季紀錄（跨季最佳單季成績） ---------- */
function seasonBestUp(cat,key,val,name,team,no,higher){
  if(val==null||!isFinite(val))return;
  const B=CAREER.seasonBest||(CAREER.seasonBest={bat:{},pit:{}});
  if(!B[cat])B[cat]={};
  const cur=B[cat][key];
  if(!cur||(higher?val>cur.val:val<cur.val))B[cat][key]={val,name,team,no};
}
function recordSeasonBest(ps,no){
  if(!ps)return;
  // 門檻依 14 場例行賽調整（先發野手整季約 45~55 打數，先發投手約 60~90 出局數）
  for(const pid in (ps.bat||{})){
    const s=ps.bat[pid]||{},nm=recName(pid),tm=recTeam(pid);
    if((s.ab||0)>=20)seasonBestUp("bat","avg",Math.round(s.h/s.ab*1000)/1000,nm,tm,no,true);
    if((s.ab||0)>=30){seasonBestUp("bat","hr",s.hr||0,nm,tm,no,true);
      seasonBestUp("bat","rbi",s.rbi||0,nm,tm,no,true);
      seasonBestUp("bat","h",s.h||0,nm,tm,no,true);
      seasonBestUp("bat","sb",s.sb||0,nm,tm,no,true);}
  }
  for(const pid in (ps.pit||{})){
    const s=ps.pit[pid]||{},nm=recName(pid),tm=recTeam(pid);
    if((s.outs||0)>=21)seasonBestUp("pit","era",(s.er/s.outs)*27,nm,tm,no,false);
    if((s.outs||0)>=36){seasonBestUp("pit","w",s.w||0,nm,tm,no,true);
      seasonBestUp("pit","k",s.k||0,nm,tm,no,true);
      seasonBestUp("pit","sv",s.sv||0,nm,tm,no,true);}
  }
}
const SEASON_BEST=[
  ["bat","avg","單季打擊率",v=>fmtAvg(v)],
  ["bat","hr","單季全壘打",String],
  ["bat","rbi","單季打點",String],
  ["bat","h","單季安打",String],
  ["bat","sb","單季盜壘",String],
  ["pit","era","單季防禦率",v=>v.toFixed(2)],
  ["pit","w","單季勝投",String],
  ["pit","k","單季三振",String],
  ["pit","sv","單季救援",String]
];
function seasonBestTable(cat,title){
  const B=(CAREER.seasonBest||{})[cat]||{};
  const rows=SEASON_BEST.filter(x=>x[0]===cat).map(x=>{
    const r=B[x[1]];
    return `<tr><td>${x[2]}</td><td class="num">${r?`<b>${x[3](r.val)}</b>`:'<span class="muted">－</span>'}</td>
      <td class="name">${r?`${r.team?teamBadge(r.team):""} ${esc(r.name)}<br><span class="muted" style="font-size:11px">第 ${r.no} 季</span>`:""}</td></tr>`;
  }).join("");
  return `<div style="margin:8px 0"><h3 style="font-size:14px;margin:0 0 4px">${esc(title)}</h3>
    <table class="grid"><tr><th>項目</th><th>紀錄值</th><th>締造者</th></tr>${rows}</table></div>`;
}
/* ---------- 特殊事蹟：無安打／完全比賽 ---------- */
const NH_LABELS={no:"無安打比賽",perfect:"完全比賽"};
function boxHitsTeam(b,teamId){let t=0;for(const pid in b.bat){if(teamOfPlayer({id:pid})===teamId)t+=(b.bat[pid][1]||0);}return t;}
function boxWalksTeam(b,teamId){let t=0;for(const pid in b.bat){if(teamOfPlayer({id:pid})===teamId)t+=(b.bat[pid][4]||0);}return t;}
function boxPitcherNames(b,teamId){const a=[];for(const pid in b.pit){if(teamOfPlayer({id:pid})===teamId)a.push(recName(pid));}return a;}
function detectNoHitter(b){
  if(!b||b.a===b.h)return null;
  const winSide=b.a>b.h?"away":"home";
  const winTeam=winSide==="away"?b.aw:b.hm,loseTeam=winSide==="away"?b.hm:b.aw;
  const innings=Math.max(((b.line&&b.line.aw)||[]).length,((b.line&&b.line.hm)||[]).length);
  if(innings<9)return null;
  if(boxHitsTeam(b,loseTeam)!==0)return null;
  const errsWin=(b.e&&(winSide==="away"?b.e.away:b.e.home))||0;
  const kind=(boxWalksTeam(b,loseTeam)===0&&errsWin===0)?"perfect":"no";
  return {kind,team:winTeam,against:loseTeam,pitchers:boxPitcherNames(b,winTeam)};
}
function recordNoHitter(b,label){
  const d=detectNoHitter(b);if(!d)return null;
  const se=S.season;if(!se)return null;
  d.label=label||"";
  (se.noHitters||(se.noHitters=[])).push(d);
  (CAREER.noHitters||(CAREER.noHitters=[])).push(Object.assign({no:(CAREER.seasons||0)+1},d));
  return d;
}
function noHitterPanel(){
  const se=S.season,mine=(se&&se.noHitters)||[],all=CAREER.noHitters||[];
  const row=(d,withNo)=>`<tr><td class="name">${withNo?`第 ${d.no} 季 `:""}${d.label?esc(d.label):""}</td>
    <td class="name">${teamBadge(d.team)}</td><td class="name">${esc((d.pitchers||[]).join("、"))}</td>
    <td class="name">${NH_LABELS[d.kind]||d.kind}<span class="muted">　vs ${esc(getTeam(d.against).name)}</span></td></tr>`;
  const recent=all.slice(-8).reverse().map(d=>row(d,true)).join("");
  const cur=mine.map(d=>row(d,false)).join("");
  return `<div class="panel"><h2>特殊事蹟</h2>
    <p class="muted">無安打比賽／完全比賽（投手群整場未被擊出安打）。</p>
    <table class="grid"><tr><th>場合</th><th>球隊</th><th>投手</th><th>事蹟</th></tr>${cur||recent||'<tr><td colspan="4" class="muted">尚未出現。</td></tr>'}</table></div>`;
}
function recTabSeasonBest(){
  return `<div class="panel"><p class="muted">單季紀錄門檻（14 場制）：打擊率需 20 打席以上，其餘打擊獎需 30 打席以上；防禦率需 21 出局以上，其餘投手獎需 36 出局以上。</p></div>`
    +seasonBestTable("bat","單季打擊紀錄")+seasonBestTable("pit","單季投球紀錄")+noHitterPanel();
}
/* ---------- 生涯里程碑 ---------- */
/* 更有意義的門檻：避免太頻繁觸發，重大里程碑才通知 */
const MILESTONES=[
  {cat:"hr",steps:[25,50,100,200,300,400,500],label:"全壘打",pit:false},
  {cat:"h",steps:[100,200,500,1000,1500,2000,2500,3000],label:"安打",pit:false},
  {cat:"rbi",steps:[100,200,500,1000,1500],label:"打點",pit:false},
  {cat:"sb",steps:[50,100,200,300,400,500],label:"盜壘",pit:false},
  {cat:"avg",steps:[0.28,0.3,0.32],label:"打擊率",pit:false,minAB:200},
  {cat:"w",steps:[25,50,100,150,200,250,300],label:"勝投",pit:true},
  {cat:"k",steps:[100,250,500,1000,1500,2000,2500,3000],label:"三振",pit:true},
  {cat:"sv",steps:[25,50,100,150,200,300],label:"救援成功",pit:true}
];
function milestoneText(mile,pid){
  const v=mile.cat==="avg"?fmtAvg(mile.val):mile.val;
  return `${recName(pid)} 達成生涯${mile.cat==="avg"?"":"第 "}${v} ${mile.label}！`;
}
/* 檢查跨季里程碑；記錄全聯盟，回傳「玩家球隊」當日的達成清單（供提示） */
function checkMilestones(){
  const se=S.season;if(!se)return[];
  const me=se.playerTeam,merged=careerMerged();
  CAREER.milestones=CAREER.milestones||{};
  // 自清：已記錄門檻高於目前累計總數 → 必為選秀回收舊 pid 的殘留（累計只會成長，不可能倒退），清除該項
  const mileTotal=(pool,pid,def)=>{
    const s=(pool[pid]||{});
    if(def.cat==="avg")return (s.ab||0)>0?s.h/s.ab:0;
    return s[def.cat]||0;
  };
  for(const pid in CAREER.milestones){
    const ms=CAREER.milestones[pid];
    for(const cat in ms){
      const def=MILESTONES.find(d=>d.cat===cat);
      if(!def){delete ms[cat];continue;}
      const pool=def.pit?merged.pit:merged.bat;
      if(mileTotal(pool,pid,def)<ms[cat])delete ms[cat];
    }
    if(!Object.keys(ms).length)delete CAREER.milestones[pid];
  }
  const hit=[];
  const scan=(pool,isPit)=>{
    for(const pid in pool){
      const s=pool[pid]||{},ms=CAREER.milestones[pid]||(CAREER.milestones[pid]={});
      MILESTONES.forEach(def=>{
        if(def.pit!==isPit)return;
        if(def.cat==="avg"){
          const ab=s.ab||0;
          if(ab<(def.minAB||0))return;   // 打擊率需達規定打席
          const avg=s.h/ab;
          def.steps.forEach(step=>{
            if(avg>=step&&step>(ms.avg||0)){ms.avg=step;if(teamOfPlayer({id:pid})===me)hit.push({pid,cat:"avg",label:def.label,val:step});}
          });
          return;
        }
        const val=s[def.cat]||0;
        def.steps.forEach(step=>{
          const crossed=Math.floor(val/step)*step;
          if(crossed<=0)return;
          if(crossed>(ms[def.cat]||0)){ms[def.cat]=crossed;if(teamOfPlayer({id:pid})===me)hit.push({pid,cat:def.cat,label:def.label,val:crossed});}
        });
      });
    }
  };
  scan(merged.bat,false);scan(merged.pit,true);
  return hit;
}
function playerMilestones(pid){
  const ms=(CAREER.milestones||{})[pid]||{};
  const out=[];
  MILESTONES.forEach(def=>{
    if(ms[def.cat]>0)out.push(def.cat==="avg"?`生涯打擊率 ${fmtAvg(ms[def.cat])}（${HIST_MIN_AB} 打席以上）`:`生涯 ${ms[def.cat]} ${def.label}`);
  });
  return out;
}

/* ---------- 聯盟日報：每日頭條 ---------- */
function boxTeamSum(b,teamId,field,idx){
  let t=0;for(const pid in (b[field]||{})){if(teamOfPlayer({id:pid})===teamId)t+=(b[field][pid][idx]||0);}return t;
}
function gameHeadline(b,me){
  const awN=getTeam(b.aw).name,hmN=getTeam(b.hm).name;
  if(b.a===b.h)return {s:5,text:`${awN} ${b.a}:${b.h} ${hmN} 和局收場`};
  const awayWin=b.a>b.h;
  const wTeam=awayWin?b.aw:b.hm,lTeam=awayWin?b.hm:b.aw;
  const wN=awayWin?awN:hmN,lN=awayWin?hmN:awN;
  const ws=awayWin?b.a:b.h,ls=awayWin?b.h:b.a;
  const marg=ws-ls,tot=ws+ls;
  const line=b.line||{},la=line.aw||[],lh=line.hm||[];
  const n=Math.max(la.length,lh.length);
  let ca=0,ch=0,defAway=0,defHome=0;
  for(let i=0;i<n;i++){ca+=la[i]||0;ch+=lh[i]||0;defAway=Math.max(defAway,ch-ca);defHome=Math.max(defHome,ca-ch);}
  const deficit=awayWin?defAway:defHome;
  const lastInn=lh[lh.length-1]||0;
  const walkoff=!awayWin&&lastInn>0&&(b.h-lastInn)<=b.a;
  const shutout=ls===0;
  const c=[];
  if(walkoff)c.push({s:95,text:`再見！${wN} 在 ${lh[lh.length-1]||0} 局下逆轉／再見，${ws}:${ls} 擊退 ${lN}`});
  if(shutout)c.push({s:deficit>=3?85:70,text:`完封勝！${wN} 零封 ${lN}（${ws}:0）`});
  if(deficit>=3)c.push({s:80+deficit,text:`大逆轉！${wN} 克服 ${deficit} 分落後，終場 ${ws}:${ls} 逆轉 ${lN}`});
  if(marg>=9)c.push({s:55+marg,text:`一面倒！${wN} 以 ${ws}:${ls} 大勝 ${lN}`});
  if(marg>=5)c.push({s:48+marg,text:`壓倒性優勢！${wN} 以 ${marg} 分差擊敗 ${lN}`});
  if(tot>=16)c.push({s:60+tot,text:`打擊大戰！${awN} ${b.a}:${b.h} ${hmN}　雙方合計 ${tot} 分`});
  if(tot>=12)c.push({s:45+tot,text:`高比分對決！${awN} ${b.a}:${b.h} ${hmN}　合計 ${tot} 分`});
  const wk=boxTeamSum(b,wTeam,"pit",5),lhit=boxHitsTeam(b,lTeam);
  if(wk>=13&&lhit<=3)c.push({s:65+wk,text:`投手無敵！${wN} 三振 ${wk} 次，${lN} 僅 ${lhit} 安打`});
  if(wk>=10&&lhit<=5)c.push({s:55+wk,text:`壓制力十足！${wN} 奪 ${wk} 次三振，限制 ${lN} ${lhit} 安打`});
  if(!c.length)c.push({s:15,text:`${wN} ${ws}:${ls} 擊敗 ${lN}`});
  let best=c.sort((x,y)=>y.s-x.s)[0];
  if(me&&(b.aw===me||b.hm===me))best={s:best.s+18,text:best.text};
  return best;
}
function buildDayPaper(dayIdx){
  const se=S.season;if(!se)return null;
  const me=se.playerTeam;
  const boxes=(se.boxes&&se.boxes[dayIdx])||[];
  const items=boxes.map(b=>b&&gameHeadline(b,me)).filter(Boolean).sort((x,y)=>y.s-x.s);
  if(!items.length)return null;
  se.papers=se.papers||[];
  const top=items.slice(0,3).map(x=>x.text);
  se.papers.push({day:dayIdx+1,items:top});
  if(se.papers.length>10)se.papers.shift();
  return top;
}
function paperBlock(){
  const se=S.season,list=(se&&se.papers)||[];
  const specials=(se&&se.news||[]).filter(n=>n.special).slice(-5).reverse();
  let rows="";
  if(list.length){
    rows=list.slice().reverse().map(p=>`<div class="paper"><div class="pday">第 ${p.day} 日</div>
      <ul>${p.items.map((t,i)=>`<li class="${i===0?"top":""}">${esc(t)}</li>`).join("")}</ul></div>`).join("");
  }
  if(specials.length){
    rows+=specials.map(n=>`<div class="paper special"><div class="pday">第 ${n.day} 日 <span class="pill on">特殊</span></div>
      <ul><li class="top">${n.team?teamBadge(n.team)+" ":""}${esc(cleanNewsText(n.text))}</li></ul></div>`).join("");
  }
  if(!rows)return "";
  return `<h3>📰 聯盟日報 頭條</h3><p class="muted">每一天的精選頭條（依精采度排序）與特殊事蹟。</p>${rows}`;
}