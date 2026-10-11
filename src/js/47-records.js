/* ---------- 單場紀錄簿（本季＋生涯） ---------- */
function newRecBook(){
  return {bat:{h:null,hr:null,rbi:null,r:null,sb:null,bb:null,k:null},
          pit:{k:null,ip:null},
          team:{r:null,margin:null,innings:null}};
}
function recUp(book,cat,key,val,name,team,when){
  if(!book||!book[cat])return;
  const cur=book[cat][key];
  if(!cur||val>cur.val)book[cat][key]={val:val,name:name,team:team,when:when};
}
function recUpBoth(cat,key,val,name,team,when){
  if(S.season&&!S.season.recs)S.season.recs=newRecBook();
  recUp(S.season.recs,cat,key,val,name,team,when);
  const c=CAREER.records||(CAREER.records={});
  if(!c.bat)c.bat={};if(!c.pit)c.pit={};if(!c.team)c.team={};
  recUp(c,cat,key,val,name,team,when);
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
/* ---------- 紀錄殿堂畫面 ---------- */
const REC_LABELS={
  bat:{h:"單場安打",hr:"單場全壘打",rbi:"單場打點",r:"單場得分",sb:"單場盜壘",bb:"單場四壞",k:"單場三振"},
  pit:{k:"單場奪三振",ip:"單場投球局數"},
  team:{r:"單場團隊得分",margin:"最大勝差分",innings:"最長比賽局數"}
};
function recRow(book,cat,key){
  const r=book&&book[cat]&&book[cat][key];
  if(!r)return `<tr><td>${REC_LABELS[cat][key]}</td><td class="num muted">－</td><td></td></tr>`;
  return `<tr><td>${REC_LABELS[cat][key]}</td><td class="num"><b>${r.val}</b></td>
    <td class="name">${r.team?teamBadge(r.team):""} ${esc(r.name)}<br><span class="muted" style="font-size:11px">${esc(r.when||"")}</span></td></tr>`;
}
function recPanel(book,title){
  let rows="";
  for(const cat in REC_LABELS)for(const key in REC_LABELS[cat])rows+=recRow(book,cat,key);
  return `<div class="panel"><h2>${title}</h2>
    <table class="grid"><tr><th>項目</th><th>紀錄值</th><th>締造者</th></tr>${rows}</table></div>`;
}
const REC_TABS=[["single","🏅 單場"],["season","📊 本季團隊"],["career","🏛 生涯榜"]];
function viewRecords(){
  const tab=S.recTab||"single";
  const tabbar=`<div class="tabbar">${REC_TABS.map(([k,l])=>`<button class="tab ${tab===k?"on":""}" data-act="recTab" data-arg="${k}">${l}</button>`).join("")}</div>`;
  const body=tab==="single"?recTabSingle():tab==="season"?recTabSeason():recTabCareer();
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
    <div class="panel"><h2>本季王座（暫列）</h2>
    <table class="grid"><tr><th>獎項</th><th>球員</th><th>球隊</th><th>成績</th></tr>${ks||'<tr><td colspan="4" class="muted">尚無資料</td></tr>'}</table></div>`;
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
  ["生涯打擊率",s=>s.ab?Math.round(s.h/s.ab*1000):null,fmtAvg,120,true],
  ["生涯全壘打",s=>s.hr||0,Number,5,true],
  ["生涯打點",s=>s.rbi||0,Number,10,true],
  ["生涯安打",s=>s.h||0,Number,30,true],
  ["生涯盜壘",s=>s.sb||0,Number,3,true]
];
const CAREER_PIT_REC=[
  ["生涯防禦率",s=>s.outs?(s.er/s.outs)*27:null,s=>(s.er!=null&&s.outs)?fmtERA(s.er,s.outs):"-.--",90,false],
  ["生涯勝投",s=>s.w||0,Number,4,true],
  ["生涯三振",s=>s.k||0,Number,40,true],
  ["生涯救援",s=>s.sv||0,Number,3,true]
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
  return careerAxis()+awardsAxis()+
    `<div class="panel"><h2>生涯紀錄榜（跨季累計）</h2>
    <div class="two"><div>${batP}</div><div>${pitP}</div></div></div>`;
}
/* 歷屆榮譽（總冠軍＋三大獎） */
function awardsAxis(){
  const A=CAREER.awards||[];
  if(!A.length)return "";
  const rows=A.slice().reverse().map(a=>`<tr><td class="num">第 ${a.no} 季</td>
    <td class="name">${a.champ?teamBadge(a.champ):"－"}</td>
    <td class="name">${a.mvp?esc(a.mvp.name)+" "+teamBadge(a.mvp.team):"－"}</td>
    <td class="name">${a.cy?esc(a.cy.name)+" "+teamBadge(a.cy.team):"－"}</td>
    <td class="name">${a.rookie?esc(a.rookie.name)+" "+teamBadge(a.rookie.team):"－"}</td></tr>`).join("");
  return `<div class="panel"><h2>歷屆榮譽</h2>
    <table class="grid"><tr><th>球季</th><th>總冠軍</th><th>MVP</th><th>最佳投手</th><th>新人王</th></tr>${rows}</table></div>`;
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