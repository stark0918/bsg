/* ---------- 季後賽 ---------- */
/* 例行賽前 4 名晉級：準決賽 3 戰 2 勝（1vs4、2vs3），冠軍戰 5 戰 3 勝。
   較高種子擁有較多主場（偶數戰＝高種子主場）。季後賽不列入例行賽排名。 */
function seriesNeed(best){return Math.ceil(best/2);}
function mkSeries(hi,lo,best){return {hi:hi,lo:lo,best:best,winsHi:0,winsLo:0,games:[],winner:null};}
function homeIsHi(gameNo){return gameNo%2===0;}
function seriesOver(s){return !!s.winner;}

/* 例行賽結束 → 建立季後賽籤表 */
function ensurePlayoff(){
  const se=S.season;
  if(!se||se.playoff)return;
  if((se.day||0)<(se.schedule||[]).length)return;   // 例行賽尚未結束
  // 安全網：若明星賽名單已產生卻從未開打（例如整季用快進跳過），在此自動補打，確保歷屆明星賽不缺季
  if(se.allstar&&!se.allstar.played){ try{ simAllstar(); }catch(e){} }
  const st=standingsList();
  const seeds=st.slice(0,4).map(x=>x.id);
  se.playoff={
    seeds:seeds,
    semi:[mkSeries(seeds[0],seeds[3],3),mkSeries(seeds[1],seeds[2],3)],
    final:null,
    stage:"semi",
    champion:null
  };
}

/* 目前玩家要打的季後賽是哪個系列賽的第幾戰（沒有則 null） */
function playoffNextGame(){
  const po=S.season.playoff;
  if(!po||po.stage==="done")return null;
  const me=S.season.playerTeam;
  const arr=po.stage==="semi"?po.semi:(po.final?[po.final]:[]);
  for(let i=0;i<arr.length;i++){
    const s=arr[i];
    if(s.winner)continue;
    if(s.hi===me||s.lo===me)return {series:s,si:i,gameNo:s.games.length};
  }
  return null;
}
function playoffGameCount(){
  const po=S.season.playoff;if(!po)return 0;
  let n=0;po.semi.forEach(s=>n+=s.games.length);
  if(po.final)n+=po.final.games.length;
  return n;
}

/* 快速模擬一個系列賽的一場 */
function simSeriesGame(s,label){
  const gameNo=s.games.length;
  const hiHost=homeIsHi(gameNo);
  const home=hiHost?s.hi:s.lo, away=hiHost?s.lo:s.hi;
  const r=quickSim(away,home);
  const awayScore=r.a, homeScore=r.b;
  const winnerId=homeScore>awayScore?home:away;
  const hiScore=home===s.hi?homeScore:awayScore;
  const loScore=home===s.hi?awayScore:homeScore;
  s.games.push({home:home,away:away,scoreHi:hiScore,scoreLo:loScore,winner:winnerId});
  logGame(null,label||"季後賽",away,home,awayScore,homeScore);
  const L=synthGameStats(away,home,awayScore,homeScore,false);
  const bx=boxFromSim(away,home,{a:awayScore,b:homeScore},L,label||"季後賽");
  (S.season.poBoxes||(S.season.poBoxes=[])).push(bx);
  recordNoHitter(bx,label||"季後賽");
  if(winnerId===s.hi)s.winsHi++;else s.winsLo++;
  if(s.winsHi>=seriesNeed(s.best)||s.winsLo>=seriesNeed(s.best))s.winner=winnerId;
}
function simSeriesToEnd(s,label){let g=0;while(!s.winner&&g++<20)simSeriesGame(s,label);}

/* 自動推進與玩家無關的系列賽；必要時產生冠軍戰、產生總冠軍 */
function playoffProgress(){
  const po=S.season.playoff;
  if(!po)return;
  const me=S.season.playerTeam;
  let guard=0;
  while(guard++<60){
    if(po.stage==="semi"){
      po.semi.forEach(s=>{if(!s.winner&&s.hi!==me&&s.lo!==me)simSeriesToEnd(s,"準決賽");});
      if(po.semi.every(s=>!!s.winner)){
        po.final=mkSeries(seriesWinnerOf(po.semi[0]),seriesWinnerOf(po.semi[1]),5);
        const rank=id=>po.seeds.indexOf(id);
        if(rank(po.final.lo)<rank(po.final.hi)){const t=po.final.hi;po.final.hi=po.final.lo;po.final.lo=t;}
        po.stage="final";
        continue;
      }
      break;
    }
    if(po.stage==="final"){
      const f=po.final;
      if(f&&!f.winner&&f.hi!==me&&f.lo!==me)simSeriesToEnd(f,"冠軍戰");
      if(f&&f.winner){
        po.champion=f.winner;po.stage="done";
        const won = po.champion===me;
        const se=S.season;
        // 季後賽冠軍／晉級日報
        se.news=se.news||[];
        se.news.push({day:se.schedule.length+1,text:`★ 季後賽結束：總冠軍 ${getTeam(po.champion).name}${won?"（你率領奪冠！）":""}`,special:true});
        if(won) se.news.push({day:se.schedule.length+1,text:`🏆 恭喜！你率領 ${getTeam(me).name} 奪得本季總冠軍！`,special:true});
        if(se.news.length>10)se.news.shift();
        computeAwards();                      // 季後頒獎
        finalizeSeason();                     // 累計生涯、寫入跨季紀錄
        prepareDraft();                       // 新人選秀（有退休缺口才展開）
        CAREER.pending=true;saveCareer();saveGame();
        if(won){S.flash=S.flash||`🏆 總冠軍 ${getTeam(me).name}！恭喜奪冠！`; setTimeout(()=>SFX.champ(),220);} else {S.flash=S.flash||`季後賽結束：總冠軍 ${getTeam(po.champion).name}`;}
    // 提示晉級冠軍（對玩家而言）
    if(won) S.flash = S.flash || `🏆 你率領 ${getTeam(me).name} 奪得總冠軍！`;
      }
      break;
    }
    break;
  }
}
function seriesWinnerOf(s){return s.winner;}

/* 玩家打完一場季後賽：寫入系列賽結果 */
function recordPlayoffResult(m){
  const po=S.season.playoff;
  if(!po){saveGame();return;}
  const s=(m.po.stage==="semi")?po.semi[m.po.si]:po.final;
  if(s&&!s.winner){
    const awayScore=m.score.away, homeScore=m.score.home;
    const winnerId=homeScore>awayScore?m.homeId:m.awayId;
    const hiScore=m.homeId===s.hi?homeScore:awayScore;
    const loScore=m.homeId===s.hi?awayScore:homeScore;
    s.games.push({home:m.homeId,away:m.awayId,scoreHi:hiScore,scoreLo:loScore,winner:winnerId});
    if(winnerId===s.hi)s.winsHi++;else s.winsLo++;
    if(s.winsHi>=seriesNeed(s.best)||s.winsLo>=seriesNeed(s.best))s.winner=winnerId;
  }
  mergePoStats(m);   // 季後賽成績獨立累計，不寫入例行賽排行榜
  m.hero=gameHero(m);
  const stName=m.po.stage==="semi"?"準決賽":"冠軍戰";
  logGame(null,stName,m.awayId,m.homeId,m.score.away,m.score.home);
  const bx=boxFromMatch(m);
  (S.season.poBoxes||(S.season.poBoxes=[])).push(bx);
  const nh=recordNoHitter(bx,stName+"·第"+(m.po.gameNo+1)+"戰");
  const miles=checkMilestones();
  if(!S.flash&&nh&&nh.team===S.season.playerTeam)S.flash="★ "+NH_LABELS[nh.kind]+"！"+getTeam(nh.team).name;
  if(!S.flash&&miles.length)S.flash="★ "+milestoneText(miles[0],miles[0].pid);
  // 晉級／淘汰提示（玩家系列賽剛分出勝負時）
  const me=S.season.playerTeam;
  if(s&&s.winner){
    if(s.winner===me){
      S.flash = m.po.stage==="semi"
        ? `🎉 晉級冠軍戰！${getTeam(me).name} 以 ${Math.max(s.winsHi,s.winsLo)} 勝拿下準決賽！`
        : `🏆 總冠軍！${getTeam(me).name} 奪下本季王座！`;
    }else if(s.hi===me||s.lo===me){
      S.flash=`😢 ${stName}落敗…${getTeam(me).name} 本季止步（${Math.max(s.winsHi,s.winsLo)}-${Math.min(s.winsHi,s.winsLo)}）。`;
    }
  }
  // 季後賽場次日報（純文字＋勝隊 id；徽章由顯示層依 team 欄位繪製，避免 HTML 被跳脫）
  const se=S.season; se.news=se.news||[];
  const winTeam = m.score.home>m.score.away?m.homeId:m.awayId;
  const loseTeam = m.score.home>m.score.away?m.awayId:m.homeId;
  const poDay = (se.poBoxes?se.poBoxes.length:0);
  const poTxt = `${stName}·第${m.po.gameNo+1}戰：${getTeam(winTeam).name} ${m.score.away>m.score.home?m.score.away:m.score.home}:${m.score.away>m.score.home?m.score.home:m.score.away} ${getTeam(loseTeam).name}`;
  se.news.push({day:se.schedule.length, text:poTxt, special:true, team:winTeam});
  if(se.news.length>15)se.news.shift();
  saveGame();
}

/* 全部季後賽快速模擬完畢（用於玩家未參與時） */
function playoffSimAll(){
  const po=S.season.playoff;
  if(!po)return;
  let guard=0;
  while(po.stage!=="done"&&guard++<60){
    const arr=po.stage==="semi"?po.semi:(po.final?[po.final]:[]);
    const label=po.stage==="semi"?"準決賽":"冠軍戰";
    arr.forEach(s=>{if(!s.winner)simSeriesToEnd(s,label);});
    playoffProgress();
  }
  saveGame();
}

/* ---------- 季後賽畫面輔助 ---------- */
function seriesScoreLine(s){
  const win=id=>s.winner===id;
  const line=(id,w)=>`<div style="display:flex;justify-content:space-between;padding:3px 8px;${win(id)?"background:#3a3320;font-weight:700;":""}"><span>${teamBadge(id)}</span><span>${w} 勝</span></div>`;
  const st=s.winner?`${teamBadge(s.winner)} 晉級`:`（${s.best} 戰 ${seriesNeed(s.best)} 勝制）`;
  return `<div style="border:1px solid var(--line);border-radius:4px;margin:4px 0;background:#0d0d0a;overflow:hidden">
    ${line(s.hi,s.winsHi)}${line(s.lo,s.winsLo)}
    <div class="muted" style="padding:3px 8px;font-size:11px;border-top:1px dotted var(--line)">${st}</div></div>`;
}
function bracketHTML(po){
  return `<div class="panel"><h2>季後賽籤表</h2>
    <h3>準決賽（3 戰 2 勝）</h3>
    ${po.semi.map(s=>seriesScoreLine(s)).join("")}
    <h3>冠軍戰（5 戰 3 勝）</h3>
    ${po.final?seriesScoreLine(po.final):'<p class="muted">待準決賽結果產生</p>'}
    ${po.champion?`<p class="center" style="margin-top:8px">🏆 總冠軍：<b>${teamBadge(po.champion)}</b></p>`:""}
  </div>`;
}
function seriesHomeLine(s){
  const me=S.season.playerTeam,a=[];
  for(let i=0;i<s.best;i++){const home=homeIsHi(i)?s.hi:s.lo;a.push(home===me?"主":"客");}
  return a.join("-");
}
/* 季後賽期間的總部導覽按鈕（補上球員排行／單場紀錄等） */
function poNav(){
  return `<div class="two">
      <button class="btn blk" data-act="roster">👥 陣容與成績</button>
      <button class="btn blk" data-act="abilities">🧮 選手能力</button>
      <button class="btn blk" data-act="schedule">🗓 賽程表</button>
      <button class="btn blk" data-act="standings">📊 聯盟排名</button>
      <button class="btn blk" data-act="leaders">📈 球員排行</button>
      <button class="btn blk" data-act="records">📕 單場紀錄</button>
      <button class="btn blk" data-act="history">📜 遊戲紀錄</button>
      <button class="btn blk" data-act="league">🏟 球團日報</button>
    </div>
    <button class="btn sm blk" data-act="help">？ 遊戲說明</button>
    <button class="btn sm blk" data-act="commissioner">🛠 管理者專用</button>`;
}
function confetti(){
  let s="";
  const cols=["#f4c542","#e85c3f","#5aa9e6","#8ee65a","#e66ad4","#f0f0f0"];
  for(let i=0;i<30;i++)s+=`<i style="left:${(i*37+13)%100}%;animation-delay:${(i%7)*0.22}s;background:${cols[i%cols.length]}"></i>`;
  return `<div class="confetti">${s}</div>`;
}
/* 季後賽期間的總部主面板 */
function playoffHubMain(po){
  const me=S.season.playerTeam;
  const bracket=bracketHTML(po);
  if(po.champion){
    const won=po.champion===me;
    if(won&&!S.season._champSfx){S.season._champSfx=true;}
    const draftBtn=(S.season.draft&&!S.season.drafted)
      ?`<button class="btn gold blk" data-act="draft">⭐ 新人選秀開始！</button>`:"";
    const draftReminder = (S.season.draft && !S.season.drafted && S.season.draft.idx < S.season.draft.picks.length)
      ? `<div class="hr"></div><div class="panel" style="background:#3a2a1a;border-color:#e6c877"><h3>⚠️ 選秀進行中</h3><p class="muted">你的球團在第 ${S.season.draft.idx+1} 位（共 ${S.season.draft.picks.length} 位）。請到「新人選秀」完成指名，或點「自動選最強」一鍵完成。</p><button class="btn gold blk" data-act="draft">➡ 前往選秀</button></div>` : "";
    return `<div class="panel">${won?confetti():""}<h2 style="font-size:22px">${won?"🏆 恭喜奪冠！":"🏆 季後賽結束"}</h2>
      <p class="center" style="font-size:16px">第 ${seasonNo()} 季　本季總冠軍：<b style="font-size:18px">${teamBadge(po.champion)}</b></p>
      <p class="muted center">${won?"你率領的球隊登上本季王座，太神了！":"你的球季到此結束，明年再來。"}</p>
      <div class="hr"></div>
      <button class="btn red blk" data-act="newgame">開始新球季</button>
      ${draftBtn}
      <button class="btn gold blk" data-act="awards">🏆 季後頒獎典禮</button>
      <div class="hr"></div>
      ${poNav()}
      <div class="hr"></div>
      <button class="btn blk" data-act="backHub">← 回球季總部</button>
      <button class="btn sm blk" data-act="toTitle">回主選單</button></div>
      ${bracket}${draftReminder}`;
  }
  const pg=playoffNextGame();
  if(pg){
    const s=pg.series, gameNo=pg.gameNo;
    const hiHost=homeIsHi(gameNo);
    const home=hiHost?s.hi:s.lo, away=hiHost?s.lo:s.hi;
    const isHome=home===me;
    const oppId=isHome?away:home;
    const stageName=po.stage==="semi"?"準決賽":"冠軍戰";
    return `<div class="panel"><h2>第 ${seasonNo()} 季　${stageName}　第 ${gameNo+1} 戰</h2>
      <div class="teamcard"><div><div class="nm">${isHome?"🏠 主場":"🚌 客場"}</div>
        <div class="meta">${stageName} vs ${esc(getTeam(oppId).name)}　·　${esc(getTeam(isHome?home:away).stadium)}</div></div>
        <div class="pill on">${s.winsHi}-${s.winsLo}</div></div>
      <p class="muted" style="font-size:12px">系列賽 ${s.best} 戰 ${seriesNeed(s.best)} 勝制；你的主客場順序（依序）：<b>${seriesHomeLine(s)}</b></p>
      <button class="btn green blk" data-act="play">⚾ 進行${stageName}（即時戰術）</button>
      <button class="btn gold blk" data-act="simPlay">⏩ 快速模擬本場</button>
      <div class="hr"></div>
      ${poNav()}
      <div class="hr"></div>
      <button class="btn sm blk" data-act="saveNow">💾 手動存檔</button>
      <button class="btn sm blk" data-act="toTitle">回主選單（自動存檔）</button></div>
      ${bracket}`;
  }
  return `<div class="panel"><h2>季後賽</h2>
    <p class="center muted">你的球隊未參與目前的季後賽賽事。</p>
    <div class="hr"></div>
    <button class="btn gold blk" data-act="simPlayoff">⏩ 模擬剩餘季後賽</button>
    <div class="hr"></div>
    ${poNav()}
    <div class="hr"></div>
    <button class="btn sm blk" data-act="toTitle">回主選單</button></div>
    ${bracket}`;
}
