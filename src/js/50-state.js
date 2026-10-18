/* ---------- 存檔 ---------- */
const SAVEKEY="clubstory_save_v1",OLD_SAVEKEY="gekikuukan_baseball_save_v1";   // 改名前舊 key 自動遷移讀取
function saveGame(){
  if(!S.season)return;
  try{localStorage.setItem(SAVEKEY,JSON.stringify({season:S.season,at:Date.now()}));localStorage.removeItem(OLD_SAVEKEY);}catch(e){}
}
function loadGame(){
  try{
    const raw=localStorage.getItem(SAVEKEY)||localStorage.getItem(OLD_SAVEKEY);
    if(!raw)return false;const d=JSON.parse(raw);S.season=d.season;return true;
  }catch(e){return false;}
}
function hasSave(){try{return !!(localStorage.getItem(SAVEKEY)||localStorage.getItem(OLD_SAVEKEY));}catch(e){return false;}}

/* ---------- 存檔槽與匯出／匯入 ---------- */
const SAVE_SLOTS=3;
const SLOTPREFIX="clubstory_slot_v1_",OLD_SLOTPREFIX="gekikuukan_slot_v1_";
const slotKey=n=>SLOTPREFIX+n;
const oldSlotKey=n=>OLD_SLOTPREFIX+n;
function exportPayload(){return {v:1,at:Date.now(),season:S.season||null,career:CAREER};}
function payloadMeta(p){
  if(!p)return null;
  const se=p.season,c=p.career||{},team=se?getTeam(se.playerTeam):null;
  return {at:p.at||0,team:se?se.playerTeam:null,teamName:team?team.name:"（無球季）",
    seasonNo:(c.seasons||0)+(se?1:0),day:se?(se.day||0):0,
    seasons:(c.history||[]).length,awards:(c.awards||[]).length,hasSeason:!!se};
}
function readSlot(n){try{const r=localStorage.getItem(slotKey(n))||localStorage.getItem(oldSlotKey(n));return r?JSON.parse(r):null;}catch(e){return null;}}
function writeSlot(n,p){try{localStorage.setItem(slotKey(n),JSON.stringify(p));return true;}catch(e){return false;}}
function deleteSlotStorage(n){try{localStorage.removeItem(slotKey(n));localStorage.removeItem(oldSlotKey(n));}catch(e){}}
function applyPayload(p){
  CAREER=normalizeCareer(p.career);
  migrateRetirements();   // 匯入的舊存檔同樣補上 rid 與可救回的成績
  S.season=p.season||null;S.match=null;S.confirm=null;
  try{
    if(S.season)localStorage.setItem(SAVEKEY,JSON.stringify({season:S.season,at:p.at||Date.now()}));
    else localStorage.removeItem(SAVEKEY);
    localStorage.setItem(CAREERKEY,JSON.stringify(CAREER));
  }catch(e){}
  for(const k in teamCache)delete teamCache[k];
}
function exportSaveFile(){
  try{
    const p=exportPayload(),meta=payloadMeta(p);
    const blob=new Blob([JSON.stringify(p)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="球團物語_存檔_"+meta.teamName+"_第"+meta.seasonNo+"季.json";
    document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
    return true;
  }catch(e){return false;}
}
function importSaveText(text){
  try{
    const p=JSON.parse(text);
    if(!p||typeof p!=="object"||(!p.season&&!p.career))throw new Error("bad");
    applyPayload(p);saveCareer();return payloadMeta(p);
  }catch(e){return null;}
}
function importSaveFile(file){
  const rd=new FileReader();
  rd.onload=()=>{
    const m=importSaveText(rd.result);
    flash(m?"已匯入存檔："+(m.hasSeason?m.teamName:"生涯紀錄"):"匯入失敗：檔案格式不符");
    S.screen=S.season?"hub":"title";render();
  };
  rd.onerror=()=>{flash("匯入失敗：讀取錯誤");render();};
  rd.readAsText(file);
}

/* ---------- 遊戲狀態 ---------- */
const S={screen:"title",season:null,match:null,flash:"",leadCat:"avg"};

function newSeason(playerTeam){
  const oldDraft = S.season?.draft;
  const oldDraftLog = S.season?.draftLog;
  const wasDrafted = S.season?.drafted;   // 上季選秀是否已完成
  S.season={
    playerTeam,
    day:0,
    schedule:makeSchedule(),
    boxes:[],        // 逐場 box（數字陣列精簡格式），依 dayIndex 分組
    poBoxes:[],      // 季後賽逐場 box
    records:{},
    playerStats:{bat:{},pit:{}},
    statSchema:2,
    started:Date.now()
  };
  // 保留未完成的選秀到新球季
  if(oldDraft && !oldDraft.done && oldDraft.idx < oldDraft.picks.length){
    S.season.draft = oldDraft;
  }
  // 保留選秀記錄（用於顯示選秀結果）
  if(oldDraftLog && oldDraftLog.length){
    S.season.draftLog = oldDraftLog;
  }
  // 標記上季選秀已完成：總部首頁顯示「✅ 選秀完成」面板（不設 drafted，避免影響下季 prepareDraft）
  if(wasDrafted)S.season.draftJustCompleted=true;
  TEAM_DEFS.forEach(t=>S.season.records[t.id]={w:0,l:0,t:0,rs:0,ra:0});
  CAREER.lastTeam=playerTeam;saveCareer();
  saveGame();
}
/* 讓舊存檔也能顯示全聯盟球員排行：補齊欄位，並為已完成但當時未記錄的比賽補生成個人成績 */
function migrateSeasonStats(){
  const se=S.season;
  if(!se||se.statSchema===2)return;
  const ps=se.playerStats||(se.playerStats={bat:{},pit:{}}); ps.bat=ps.bat||{}; ps.pit=ps.pit||{};
  const hasPlayerBat=Object.keys(ps.bat).some(k=>k.indexOf(se.playerTeam+"b")===0);
  const bf=["g","ab","h","hr","rbi","bb","k","r","sb"];
  const pf=["g","outs","h","r","er","bb","k","pp","w","l","sv"];
  for(const pid in ps.bat){const d=ps.bat[pid];bf.forEach(k=>{if(typeof d[k]!=="number")d[k]=Number(d[k])||0;});}
  for(const pid in ps.pit){const d=ps.pit[pid];pf.forEach(k=>{if(typeof d[k]!=="number")d[k]=Number(d[k])||0;});}
  const playedDays=Math.min(se.day||0,(se.schedule||[]).length);
  for(let i=0;i<playedDays;i++){
    (se.schedule[i]||[]).forEach(g=>{
      if(!g.played||!g.score)return;
      const sc=gameScore(g),ra=sc.a,rh=sc.h;
      const invA=g.away===se.playerTeam,invH=g.home===se.playerTeam;
      if((!invA&&!invH)||!hasPlayerBat){
        synthGameStats(g.away,g.home,ra,rh);
      }else{
        const oppId=invA?g.home:g.away;
        const oppRuns=invA?rh:ra,myRuns=invA?ra:rh;
        const ob=synthBatting(oppId,oppRuns);
        const op=synthPitching(oppId,myRuns,ob.reduce((a,x)=>a+x.h,0),oppRuns>myRuns,Math.abs(myRuns-oppRuns)<=3);
        ob.forEach(s=>mergeBatLine(s.pid,s));
        op.forEach(s=>mergePitLine(s.pid,s));
        const sp=starterOf(getTeam(se.playerTeam),i);
        const line=ps.pit[sp.id]||(ps.pit[sp.id]={g:0,outs:0,h:0,r:0,er:0,bb:0,k:0,pp:0,w:0,l:0,sv:0});
        if(myRuns>oppRuns)line.w=(line.w||0)+1;else if(myRuns<oppRuns)line.l=(line.l||0)+1;
      }
    });
  }
  se.statSchema=2;
  saveGame();
}
function nextPlayerGame(){
  const day=S.season.schedule[S.season.day];
  if(!day)return null;
  const g=day.find(x=>x.away===S.season.playerTeam||x.home===S.season.playerTeam);
  return g||null;
}
function startMatch(){
  const g=nextPlayerGame();
  if(!g){ ensurePlayoff(); startPlayoffMatch(); return; }  // 例行賽結束 → 季後賽
  const dayIdx=S.season.day;
  const away=getTeam(g.away),home=getTeam(g.home);
  S.match=newMatch(g.home,g.away,dayIdx,starterOf(home,dayIdx),starterOf(away,dayIdx));
  S.match.playerSide=playerTeamSide(S.match);
  S.screen="game";
  S.ballFlash=Date.now();
  setTimeout(()=>{if(S.ballFlash)S.ballFlash=0;},1500);
  SFX.charge();
}
function startPlayoffMatch(){
  const po=S.season.playoff;
  if(!po)return false;
  const pg=playoffNextGame();
  if(!pg)return false;
  const s=pg.series, gameNo=pg.gameNo;
  const hiHost=homeIsHi(gameNo);
  const home=hiHost?s.hi:s.lo, away=hiHost?s.lo:s.hi;
  const dayIdx=S.season.schedule.length+1+playoffGameCount();
  const m=newMatch(home,away,dayIdx,starterOf(getTeam(home),dayIdx),starterOf(getTeam(away),dayIdx));
  m.noTie=true;                                  // 季後賽不可和局
  m.po={stage:po.stage,si:pg.si,gameNo:gameNo};
  m.playerSide=playerTeamSide(m);
  S.match=m;S.screen="game";
  S.ballFlash=Date.now();
  setTimeout(()=>{if(S.ballFlash)S.ballFlash=0;},1500);
  SFX.charge();
  return true;
}
function playerTeamSide(m){
  return m.awayId===S.season.playerTeam?"away":"home";
}

/* ---------- 排名 ---------- */
function standingsList(){
  const r=S.season.records;
  const streaks=teamStreaks();
  const rows=TEAM_DEFS.map(t=>{
    const d=r[t.id]||{w:0,l:0,t:0,rs:0,ra:0};
    const pct=(d.w+d.l)?d.w/(d.w+d.l):0;
    return {id:t.id,name:t.name,w:d.w,l:d.l,t:d.t,pct,gb:0,rs:d.rs,ra:d.ra,streak:streaks[t.id]||{type:null,n:0}};
  });
  rows.sort((a,b)=>b.pct-a.pct||b.w-a.w);
  let top=rows[0];
  rows.forEach(x=>{
    if(x===top)x.gb="-";
    else x.gb=(((top.w-x.w)+(x.l-top.l))/2).toFixed(1);
  });
  return rows;
}
