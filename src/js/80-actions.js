/* ---------- 事件分派 ---------- */
function confirmMsg(t,arg){
  if(t==="wipeCareer")return "「清除生涯成就」會刪除所有跨季紀錄（生涯戰績、歷屆榮譽、生涯紀錄榜、獲獎紀錄），且無法復原。確定嗎？";
  if(t==="wipeSeason")return "「刪除本季進度」會移除目前的球季存檔，但會保留你的生涯成就（歷史戰績、獎項、紀錄）。確定嗎？";
  if(t==="slotSave")return `槽 ${arg} 已有存檔，確定要用目前的進度覆蓋嗎？`;
  if(t==="slotLoad")return `讀取槽 ${arg} 會覆蓋你目前的進度（尚未存檔的變更會遺失）。確定嗎？`;
  if(t==="slotDel")return `確定要刪除槽 ${arg} 的存檔嗎？`;
  return "確定嗎？";
}
const ACT={
  newgame(){
    const d=S.season?.draft;
    if(d&&!d.done&&d.idx<d.picks.length){
      const remain = d.picks.length - d.idx;
      S.confirm={act:"autoDraftThenNewgame",arg:null,msg:`選秀尚未完成（剩 ${remain} 位）。點擊確定將自動完成剩餘選秀並開始新球季，或取消後前往選秀畫面手動指名。`};
      S.screen="newgame";render();return;
    }
    S.screen="newgame";render();
  },
  autoDraftThenNewgame(){
    const d=S.season.draft;
    const remain=d?(d.picks.length-d.idx):0;   // 先記下剩餘人數（draftAuto 後 draft 會被清掉）
    ACT.draftAuto();
    const drafted=remain?(S.season.draftLog||[]).slice(-remain):[];
    if(drafted.length){
      const names = drafted.map(x=>`${teamBadge(x.teamId)} ${x.name}(${x.pos})`).join("、");
      flash(`⚾ 選秀自動完成：${names}`);
    }
    S.screen="newgame";render();
  },
  toTitle(){S.screen="title";render();},
  pickTeam(id){
    // 若有未完成選秀，先自動完成並提示結果（須先於老化：否則新人會被多算一歲、且 draftLog 的 season 標記會不一致）
    const oldDraft = S.season?.draft;
    if(oldDraft && !oldDraft.done && oldDraft.idx < oldDraft.picks.length){
      ACT.draftAuto();
      const drafted = S.season.draftLog?.slice(-oldDraft.picks.length + oldDraft.idx) || [];
      if(drafted.length){
        const names = drafted.map(x=>`${teamBadge(x.teamId)} ${x.name}(${x.pos})`).join("、");
        flash(`⚾ 選秀自動完成：${names}`);
      }
    }
    if(CAREER.pending)advanceCareer();
    newSeason(id);
    S.screen="hub";render();
  },
  continue(){
    if(loadGame()){S.season&&(S.screen="hub");render();}
  },
  ask(a){
    const i=String(a).indexOf(":"),t=i<0?String(a):String(a).slice(0,i),arg=i<0?null:String(a).slice(i+1);
    S.confirm={act:t,arg,msg:confirmMsg(t,arg)};
    render();
  },
  confirmNo(){S.confirm=null;render();},
  confirmYes(){const c=S.confirm;S.confirm=null;if(c&&ACT[c.act])ACT[c.act](c.arg);else render();},
  wipeSeason(){
    try{localStorage.removeItem(SAVEKEY);}catch(e){}
    S.season=null;S.match=null;flash("已刪除本季進度（生涯成就保留）");render();
  },
  wipeCareer(){
    try{localStorage.removeItem(CAREERKEY);}catch(e){}
    CAREER={seasons:0,pending:false,ov:{},records:{},history:[],career:{bat:{},pit:{}},awards:[]};
    for(const k in teamCache)delete teamCache[k];
    flash("已清除生涯成就");render();
  },
  saveManager(){S.screen="save";S.confirm=null;render();},
  backFromSave(){S.screen=S.season?"hub":"title";S.confirm=null;render();},
  slotSave(a){const n=+a;if(writeSlot(n,exportPayload()))flash("已存入槽 "+n);render();},
  slotLoad(a){
    const n=+a,p=readSlot(n);
    if(!p){flash("槽位是空的");render();return;}
    applyPayload(p);saveCareer();flash("已讀取槽 "+n);render();
  },
  slotDel(a){const n=+a;deleteSlotStorage(n);flash("已刪除槽 "+n);render();},
  exportSave(){flash(exportSaveFile()?"已匯出存檔檔（請確認下載）":"匯出失敗");render();},
  pickImport(){const el=document.getElementById("importFile");if(el)el.click();},
  lineup(){S.screen="lineup";S.luSel=null;render();},
  luPick(i){S.luSel=(S.luSel===+i?null:+i);render();},
  luUp(i){
    const ids=buildLineup(getTeam(S.season.playerTeam)).map(b=>b.id);i=+i;
    if(i>0){[ids[i-1],ids[i]]=[ids[i],ids[i-1]];setPlayerLineup(ids);if(S.luSel===i)S.luSel=i-1;}
    render();
  },
  luDown(i){
    const ids=buildLineup(getTeam(S.season.playerTeam)).map(b=>b.id);i=+i;
    if(i<ids.length-1){[ids[i+1],ids[i]]=[ids[i],ids[i+1]];setPlayerLineup(ids);if(S.luSel===i)S.luSel=i+1;}
    render();
  },
  luSwap(pid){
    const ids=buildLineup(getTeam(S.season.playerTeam)).map(b=>b.id);
    let i=S.luSel==null?0:S.luSel;if(i<0||i>=ids.length)i=0;
    ids[i]=pid;setPlayerLineup(ids);S.luSel=null;
    flash("已把 "+recName(pid)+" 排入第 "+(i+1)+" 棒");render();
  },
  luReset(){
    if(S.season){if(CAREER.lineups)delete CAREER.lineups[S.season.playerTeam];saveCareer();}
    S.luSel=null;flash("已回復預設打線");render();
  },
  luAuto(){
    const team=getTeam(S.season.playerTeam);
    const lu=buildLineup(team),bench=buildBench(team);
    const all=[...lu,...bench];
    // 計算每人的綜合打擊分數（近似 OPS）：打擊+力量+選球*1.2+速度*0.5
    all.forEach(p=>{p._score=Math.round(p.meet*1.2+p.power*1.5+p.eye*1.2+p.speed*0.5);});
    // 先發9人：依分數排序，但前2棒優先高選球+高速度，3-5棒優先高力量
    all.sort((a,b)=>b._score-a._score);
    const top=all.slice(0,9).map(p=>p.id);
    setPlayerLineup(top);
    S.luSel=null;flash("已依綜合打擊能力自動排序（前2棒優先上壘、3-5棒優先長打）");render();
  },
  allstar(){S.screen="allstar";render();},
  allstarSim(){const a=simAllstar();render();},
  seasonInfo(){S.screen="season";render();},
  help(){S.screen="help";render();},
  backHub(){
    const d=S.season?.draft;
    if(d&&!d.done&&d.idx<d.picks.length){
      S.confirm={act:"forceLeaveDraft",arg:null,msg:"選秀尚未完成，確定要離開？未完成的選秀將自動由系統代選最強新人。"};render();return;
    }
    S.screen="hub";S.match=null;render();
  },
  roster(){S.screen="roster";render();},
  abilities(){S.screen="abilities";render();},
  abilTeam(id){S.abilTeam=id;render();},
  abilSortBat(k){S.abilBatSort=k;render();},
  abilSortPit(k){S.abilPitSort=k;render();},
  abilPos(p){S.abilPos=p;render();},
  abilRole(r){S.abilRole=r;render();},
  player(id){S.selPlayer=id;S.screen="player";render();},
  schedule(){S.screen="schedule";render();},
  standings(){S.screen="standings";render();},
  leaders(){S.screen="leaders";render();},
  leadCat(c){S.leadCat=c;render();},
  saveNow(){saveGame();flash("已存檔");render();},
  play(){startMatch();if(S.match)render();},
  simPlay(){
    startMatch();
    if(!S.match)return;
    submit(()=>{autoGame(S.match);});
  },
  backToHub(){S.screen="hub";S.match=null;render();},
  nextGame(){
    const se=S.season;
    if(se && se.allstar && !se.allstar.played && asReady()){
      S.match=null;
      const a=simAllstar();
      se.news=se.news||[];
      se.news.push({day:se.day+1,text:`⭐ 明星賽週已到！已自動進行明星賽（MVP：${a.mvp?.name||"－"}）`,special:true});
      if(se.news.length>15)se.news.shift();
      if(!S.flash) S.flash="⭐ 明星賽週到了！自動進行明星賽";
      S.screen="allstar";
      render();
      return;
    }
    if(se){
      const total=(se.schedule||[]).length;
      if(se.day >= total){ ensurePlayoff(); render(); return; }
      if(se.day === total-1){ if(!S.flash) S.flash=`⚠️ 下一場就是最後一日（第 ${total} 日）例行賽！`; }
      if(se.playoff){
        const pg=playoffNextGame();
        if(pg){
          const s=pg.series, gameNo=pg.gameNo;
          const hiHost=homeIsHi(gameNo);
          const home=hiHost?s.hi:s.lo, away=hiHost?s.lo:s.hi;
          const isHome=home===se.playerTeam;
          startMatch();
          if(S.match)render();
          else S.screen="hub";
        }else{
          S.screen="hub"; render();
        }
        return;
      }
    }
    S.match=null;
    startMatch();
    if(S.match)render();
    else{S.screen="hub";render();}
  },
  simPlayoff(){playoffSimAll();render();},
  autoInning(){const m=S.match;if(!m||m.over)return;submit(()=>{autoHalf(m);if(!m.over&&m.outs>=3)endHalf(m);playSnd(m);});},
  simGame(){const m=S.match;if(!m||m.over)return;submit(()=>{autoGame(m);if(m.walkoff)setTimeout(()=>SFX.cheer(),250);});},
  bat(t){const m=S.match;if(!m||m.over||!playerIsOffense(m))return;submit(()=>{resolveTurn(t,aiDefense(m));playSnd(m);});},
  pitch(t){const m=S.match;if(!m||m.over||playerIsOffense(m))return;submit(()=>{resolveTurn(aiOffense(m),t);playSnd(m);});},
  steal(){const m=S.match;if(!m||m.over||!playerIsOffense(m))return;submit(()=>{doSteal(m);});},
  pinchhit(){const m=S.match;if(!m||m.over||!playerIsOffense(m))return;submit(()=>{doPinchHit(m);});},
  changePit(pid){const m=S.match;if(!m||m.over||playerIsOffense(m))return;submit(()=>{doChangePitcher(m,pid);});},
  records(){S.screen="records";render();},
  history(){S.screen="history";S.histTab=S.histTab||"games";render();},
  histTab(t){S.histTab=t;render();},
  histCat(c){S.histCat=c;render();},
  recTab(c){S.recTab=c;render();},
  exportCsv(){downloadCSV();render();},
  league(){S.screen="league";render();},
  gameDetail(a){
    if(!a)return;
    const from=(S.screen==="schedule"||S.screen==="player")?S.screen:"league";
    if(a.charAt(0)==="p")S.gameDetail={po:+a.slice(1),from};
    else{const p=a.split(",");S.gameDetail={day:+p[0],i:+p[1],from};}
    S.screen="gameDetail";render();
  },
  gameDetailBack(){S.screen=(S.gameDetail&&S.gameDetail.from)||"league";render();},
  awards(){S.awardsStep=0;S.screen="awards";render();},
  awardStep(){S.awardsStep=Math.min(AWARD_MAX,(S.awardsStep||0)+1);if(S.awardsStep>=AWARD_MAX)SFX.champ();else SFX.wink();render();},
  awardAll(){S.awardsStep=AWARD_MAX;SFX.champ();render();},
  awardsReplay(){S.awardsStep=0;render();},
  draft(){S.screen="draft";render();},
  draftNext(){const d=S.season.draft;if(d&&d.idx<d.picks.length&&d.picks[d.idx].teamId!==S.season.playerTeam){
    const pick=d.picks[d.idx];const cs=draftCandidates(pick);
    applyDraftRookie(pick,cs[draftBest(cs)]);d.idx++;d.cands=null;}
    draftJudge();render();},
  draftPick(ci){const d=S.season.draft;if(d&&d.idx<d.picks.length&&d.picks[d.idx].teamId===S.season.playerTeam){
    const pick=d.picks[d.idx];const cs=draftCandidates(pick);
    const ii=(ci!=null&&cs[+ci])?+ci:draftBest(cs);
    applyDraftRookie(pick,cs[ii]);d.idx++;d.cands=null;SFX.wink();}
    draftJudge();render();},
  draftAuto(){const d=S.season.draft;if(!d)return;
    while(d.idx<d.picks.length){const pick=d.picks[d.idx];const cs=draftCandidates(pick);
      applyDraftRookie(pick,cs[draftBest(cs)]);d.idx++;}
    draftJudge();render();},
  confirmLeaveDraft(){S.confirm={act:"forceLeaveDraft",arg:null,msg:"選秀尚未完成，確定要離開？未完成的選秀將自動由系統代選最強新人。"};render();},
  forceLeaveDraft(){const d=S.season.draft;if(d){ACT.draftAuto();}S.confirm=null;render();}
};
let flashTimer=null;
function flash(msg){S.flash=msg;clearTimeout(flashTimer);}
document.addEventListener("click",e=>{
  const el=e.target.closest("[data-act]");
  if(!el||busy)return;
  const a=el.dataset.act,arg=el.dataset.arg;
  if(ACT[a])ACT[a](arg);
});
document.addEventListener("change",e=>{
  const el=e.target;
  if(el&&el.id==="importFile"&&el.files&&el.files[0])importSaveFile(el.files[0]);
});
