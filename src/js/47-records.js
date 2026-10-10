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
/* ---------- 紀錄簿畫面 ---------- */
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
function viewRecords(){
  const b=S.season.recs||newRecBook();
  return `<div class="panel"><h2>📕 單場紀錄簿</h2>
    <p class="muted">記錄本季與聯盟史上（含季後賽）的單場最高紀錄。</p>
    <div class="hr"></div></div>
    ${recPanel(b,"本季紀錄")}
    ${recPanel(CAREER.records,"聯盟歷史紀錄")}
    <div class="panel"><div class="hr"></div><button class="btn blk" data-act="backHub">← 回球季總部</button></div>`;
}