/* ---------- 事件分派 ---------- */
function confirmMsg(t,arg){
  if(t==="wipeCareer")return "「清除生涯成就」會刪除所有跨季紀錄（生涯戰績、歷屆榮譽、生涯紀錄榜、獲獎紀錄），且無法復原。確定嗎？";
  if(t==="wipeSeason")return "「刪除本季進度」會移除目前的球季存檔，但會保留你的生涯成就（歷史戰績、獎項、紀錄）。確定嗎？";
  if(t==="slotSave")return `槽 ${arg} 已有存檔，確定要用目前的進度覆蓋嗎？`;
  if(t==="slotLoad")return `讀取槽 ${arg} 會覆蓋你目前的進度（尚未存檔的變更會遺失）。確定嗎？`;
  if(t==="slotDel")return `確定要刪除槽 ${arg} 的存檔嗎？`;
  if(t==="adminWipeRecs")return "確定要清除「本季單場紀錄」嗎？（生涯歷史紀錄不受影響）";
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
      const names = drafted.map(x=>`${getTeam(x.teamId).name}${x.teamId===S.season.playerTeam?"（你的球團）":""}${x.name}(${x.pos})`).join("、");
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
        const names = drafted.map(x=>`${getTeam(x.teamId).name}${x.teamId===S.season.playerTeam?"（你的球團）":""}${x.name}(${x.pos})`).join("、");
        flash(`⚾ 選秀自動完成：${names}`);
      }
    }
    if(CAREER.pending)advanceCareer();
    newSeason(id);
    // 本季過渡期引退快訊（選秀覆蓋＋開季老化，取剛結束那季的記錄）
    const retired=(CAREER.retirements||[]).filter(x=>x.no===(CAREER.seasons||0));
    if(retired.length){
      const names=retired.map(x=>`${getTeam(x.team).name}${x.name}(${x.pos||""}${x.age!=null?x.age+"歲":""})`).join("、");
      flash(`🌅 引退：${names} 高掛球鞋（共 ${retired.length} 人，名單請看歷史→引退名單）`);
    }
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
    try{localStorage.removeItem(SAVEKEY);localStorage.removeItem(OLD_SAVEKEY);}catch(e){}
    S.season=null;S.match=null;flash("已刪除本季進度（生涯成就保留）");render();
  },
  wipeCareer(){
    try{localStorage.removeItem(CAREERKEY);localStorage.removeItem(OLD_CAREERKEY);}catch(e){}
    CAREER=normalizeCareer(null);   // 走同一套預設欄位，避免清掉後缺 career/milestones 等
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
    if(S.season){
      if(CAREER.lineups)delete CAREER.lineups[S.season.playerTeam];
      if(CAREER.dhSlot)delete CAREER.dhSlot[S.season.playerTeam];   // DH 棒次一併回復自動
      saveCareer();
    }
    S.luSel=null;flash("已回復預設打線");render();
  },
  /* 指定打擊（DH）棒次：任何球員都能當 DH，不限守位 */
  luDH(i){
    if(!S.season)return;
    i=+i;
    const lu=buildLineup(getTeam(S.season.playerTeam));
    if(i<0||i>=lu.length)return;
    setDHSlot(S.season.playerTeam,i);
    flash("已指定 "+recName(lu[i].id)+" 擔任指定打擊（DH）");
    render();
  },
  luDHAuto(){
    if(!S.season)return;
    setDHSlot(S.season.playerTeam,null);
    const lu=buildLineup(getTeam(S.season.playerTeam));
    const idx=dhSlotOf(S.season.playerTeam);
    flash("DH 改回自動：預設第 9 棒"+(lu[idx]?"（"+recName(lu[idx].id)+"）":""));
    render();
  },
  luAuto(){
    const team=getTeam(S.season.playerTeam);
    const r=autoLineup(team);
    setPlayerLineup(r.ids);
    setDHSlot(S.season.playerTeam,r.dhIdx>=0?r.dhIdx:null);
    S.luSel=null;
    flash("已自動排出守位與打線：8 個守位各一人，DH："+(r.dhPid?recName(r.dhPid):"－")+"（第 "+(r.dhIdx+1)+" 棒）");
    render();
  },
  allstar(){S.screen="allstar";render();},
  allstarSim(){const a=simAllstar();render();},
  seasonInfo(){S.screen="season";render();},
  commissioner(){S.screen="admin";if(!S.adminTeam&&S.season)S.adminTeam=S.season.playerTeam;render();},
  adminTeam(id){S.adminTeam=id;S.adminPid=null;render();},
  adminPlayer(pid){S.adminPid=pid;render();},
  adminStat(arg){
    const [k,d]=String(arg||"").split(",");
    const p=S.adminPid?playerById(S.adminPid):null;
    if(!p||!k)return;
    const o=CAREER.ov[p.id]||(CAREER.ov[p.id]={});
    o[k]=clamp(Math.round((p[k]||50)+Number(d)),20,99);
    for(const ck in teamCache)delete teamCache[ck];
    saveCareer();saveGame();flash(`${p.name} ${k} → ${o[k]}`);render();
  },
  adminAge(arg){
    const p=S.adminPid?playerById(S.adminPid):null;
    if(!p)return;
    const o=CAREER.ov[p.id]||(CAREER.ov[p.id]={});
    o.age=clamp((p.age||26)+Number(arg),19,45);
    for(const ck in teamCache)delete teamCache[ck];
    saveCareer();saveGame();flash(`${p.name} 年齡 → ${o.age}`);render();
  },
  adminWipeRecs(){
    if(S.season){S.season.recs=newRecBook();saveGame();}
    S.confirm=null;flash("已清除本季單場紀錄");render();
  },
  /* 遊戲設定（管理者專用） */
  cfgSet(arg){
    const [k,d]=String(arg||"").split(",");
    const step=Number(d);
    if(!k||!step||!(k in CONFIG_DEF))return;
    let v=Number(CFG[k])||0;
    // 各參數有自己的合理範圍，避免調到離譜的值
    const lim=CFG_LIMITS[k]||[cfgMin(k),cfgMax(k)];
    CFG[k]=Math.round(Math.max(lim[0],Math.min(lim[1],v+step))*1000)/1000;
    saveConfig();
    // 名單是快取的：清掉才會用新設定重新產生（亂數種子固定，產生的人還是同一批）
    for(const ck in teamCache)delete teamCache[ck];
    flash(`設定已更新：${k} → ${CFG[k]}`);
    render();
  },
  cfgTog(k){
    if(!(k in CONFIG_DEF))return;
    CFG[k]=CFG[k]?0:1;
    saveConfig();
    for(const ck in teamCache)delete teamCache[ck];
    flash(`設定已切換：${k} → ${CFG[k]?"開":"關"}`);
    render();
  },
  cfgReset(){
    resetConfig();
    for(const ck in teamCache)delete teamCache[ck];
    flash("已還原所有設定為預設值");
    render();
  },
  /* 依新規則重算本季的勝投／敗投／救援成功／完投（修正舊存檔用錯規則算出來的數字） */
  adminRecalcDecisions(){
    if(!S.season){flash("尚未開始球季");render();return;}
    const n=recomputeSeasonDecisions();
    flash(n?"已依新規則重算本季的勝負／救援／完投":"沒有可重算的資料");
    render();
  },
  /* 快速模擬到季中/季末 */
  simToMid(){
    const se=S.season;
    if(!se)return;
    const mid=Math.floor((se.schedule||[]).length/2);
    // 如果明星賽已經進行過或已通知過且已經過了季中日，直接回總部並提示
    if(se.allstar && se.allstar.played){
      flash("⭐ 明星賽已經結束");
      render();
      return;
    }
    let guard=0;
    // guard 只防死迴圈，不當球季長度用（球季加長時這裡也要跟著放大）
    while(se.day < mid && guard++<300){
      startMatch();   // 每輪開新比賽（舊 match 已結算，不可重用）
      if(!S.match) break;
      if(!S.match.over){ autoGame(S.match); }
      processGameEnd(S.match);
      S.match=null;
      if(S.screen!=="hub" && S.screen!=="game") break;
    }
    S.match=null;S.screen="hub";
    render();
  },
  simToEnd(){
    const se=S.season;
    if(!se)return;
    let guard=0;
    while(se.day < (se.schedule||[]).length && guard++<300){
      startMatch();   // 每輪開新比賽（舊 match 已結算，不可重用）
      if(!S.match) break;
      if(!S.match.over){ autoGame(S.match); }
      processGameEnd(S.match);
      S.match=null;
      if(S.screen!=="hub" && S.screen!=="game") break;
    }
    S.match=null;S.screen="hub";
    render();
  },
  help(){S.screen="help";render();},
  backHub(){
    // 選秀未完成也不擋路：總部（例行賽／季後賽面板）本來就有「選秀進行中」提醒＋前往選秀鈕，
    // 且選秀進度會保留（開新季也會帶過去），直接回去即可，避免季後賽結束後哪裡都回不去。
    S.confirm=null;
    S.screen="hub";S.match=null;render();
  },
  roster(){S.screen="roster";render();},
  abilities(){S.screen="abilities";render();},
  abilTeam(id){S.abilTeam=id;render();},
  abilSortBat(k){S.abilBatSort=k;render();},
  abilSortPit(k){S.abilPitSort=k;render();},
  abilPos(p){S.abilPos=p;render();},
  abilRole(r){S.abilRole=r;render();},
  player(id){S.playerFrom=screenCtx();S.selPlayer=id;S.screen="player";render();},
  retiree(i){S.playerFrom=screenCtx();S.selRetire=+i;S.screen="retiree";render();},
  backFromPlayer(){const f=S.playerFrom;S.playerFrom=null;if(f){PLAYER_CTX.forEach(k=>{if(f[k]!==undefined)S[k]=f[k];});}else S.screen="hub";render();},
  backFromRetiree(){ACT.backFromPlayer();},
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
    if(se && se.allstar && !se.allstar.played && GK.asReady()){
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
      // 季後賽已建立：優先處理季後賽流程
      if(se.playoff){
        const pg=playoffNextGame();
        if(pg){
          startMatch();
          if(S.match)render();
          else S.screen="hub";
        }else{
          if(!S.flash){
            const po=se.playoff, me=se.playerTeam;
            if(po.stage==="done")S.flash=`🏆 季後賽結束：總冠軍 ${getTeam(po.champion).name}`;
            else S.flash="季後賽進行中：你的球隊本輪無賽事，請回總部模擬剩餘季後賽。";
          }
          S.screen="hub"; render();
        }
        return;
      }
      if(se.day >= total){
        ensurePlayoff();
        // 建立季後賽後，若玩家還有下一場季後賽要打，直接開始
        if(se.playoff){
          const pg=playoffNextGame();
          if(pg){
            startMatch();
            if(S.match)render();
            else S.screen="hub";
            return;
          }
        }
        render();
        return;
      }
      if(se.day === total-1){
        if(!S.flash) S.flash=`⚠️ 下一場就是最後一日（第 ${total} 日）例行賽！`;
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
