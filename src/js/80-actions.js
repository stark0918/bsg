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
  newgame(){S.screen="newgame";render();},
  toTitle(){S.screen="title";render();},
  pickTeam(id){
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
  help(){S.screen="help";render();},
  backHub(){S.screen="hub";S.match=null;render();},
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
    draftJudge();render();}
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
