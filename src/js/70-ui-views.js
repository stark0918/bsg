/* ----- 共用：確認框 ----- */
function confirmBoxHTML(){
  const c=S.confirm;if(!c)return"";
  return `<div class="confirmbox"><p>${esc(c.msg)}</p>
    <button class="btn red blk" data-act="confirmYes">確定</button>
    <button class="btn blk" data-act="confirmNo">取消</button></div>`;
}

/* ----- 標題 ----- */
function viewTitle(){
  let cont="";
  if(hasSave()){
    cont=`<button class="btn gold blk" data-act="continue">▷ 繼續上季球季（第 ${seasonNo()} 季）</button>`;
  }
  const lt=lastTeamId();
  const renew=(!hasSave()&&lt)?`<button class="btn gold blk" data-act="pickTeam" data-arg="${lt}">🔁 續任 ${teamBadge(lt)}（第 ${seasonNo()} 季）</button>`:"";
  const hasCareer=!!((CAREER.history&&CAREER.history.length)||(CAREER.awards&&CAREER.awards.length)||CAREER.seasons>0);
  const danger=S.confirm?confirmBoxHTML()
    :`${hasSave()?`<button class="btn blk" data-act="ask" data-arg="wipeSeason">✕ 刪除本季進度</button>`:""}
      ${hasCareer?`<button class="btn blk" data-act="ask" data-arg="wipeCareer">🗑 清除生涯成就</button>`:""}`;
  return `<div class="panel center">
    <h2 style="text-align:center">歡迎來到劇空間</h2>
    <p class="muted">這是一款向古早 CGI 棒球遊戲致敬的作品。<br>
    你將扮演球團監督，在九局對戰中以戰術決勝負，並帶領球隊打完整季。</p>
    <div class="hr"></div>
    <button class="btn green blk" data-act="newgame">⚾ 新球季開始（選擇球隊）</button>
    ${renew}
    ${cont}
    <button class="btn blk" data-act="help">？ 遊戲說明</button>
    <button class="btn blk" data-act="league">🏟 劇空間（聯盟日報）</button>
    ${(hasSave()||hasCareer)?`<button class="btn blk" data-act="history">📜 遊戲紀錄</button>`:""}
    <button class="btn blk" data-act="saveManager">💾 存檔管理</button>
    ${danger}
  </div>
  <div class="panel">
    <h2>收錄球團</h2>
    <div class="two">
      ${TEAM_DEFS.map(t=>`<div class="teamcard"><div><div class="nm">${teamBadge(t.id)}</div><div class="meta">主場：${t.stadium}</div></div><div class="pill off">${t.str>=0?"+"+t.str:t.str}</div></div>`).join("")}
    </div>
  </div>`;
}

/* ----- 存檔管理 ----- */
function viewSaveManager(){
  const cur=payloadMeta(exportPayload());
  let rows="";
  for(let n=1;n<=SAVE_SLOTS;n++){
    const s=readSlot(n),m=payloadMeta(s);
    rows+=`<div class="slotcard ${m?"":"empty"}">
      <div class="slotinfo">
        <div class="nm">槽 ${n}｜${m?esc(m.teamName):"（空）"}</div>
        <div class="meta">${m?`第 ${m.seasonNo} 季　第 ${m.day} 日　生涯 ${m.seasons} 季／獎項 ${m.awards}　<span class="muted">${fmtDate(m.at)}</span>`:"尚未使用"}</div>
      </div>
      <div class="slotbtns">
        <button class="btn sm" data-act="${m?"ask":"slotSave"}" data-arg="${m?"slotSave:"+n:n}">存入</button>
        ${m?`<button class="btn sm gold" data-act="ask" data-arg="slotLoad:${n}">讀取</button>
             <button class="btn sm red" data-act="ask" data-arg="slotDel:${n}">刪除</button>`:""}
      </div></div>`;
  }
  return `<div class="panel"><h2>💾 存檔管理</h2>
    <p class="muted">把進度存成檔案備份，或存到下面的槽位。若瀏覽器資料被清除，可用「匯入檔案」把進度救回來。</p>
    <div class="hr"></div>
    <h3>目前進度</h3>
    <div class="slotcard">
      <div class="slotinfo">
        <div class="nm">${cur.hasSeason?esc(cur.teamName):"（尚未開季）"}</div>
        <div class="meta">${cur.hasSeason?`第 ${cur.seasonNo} 季　第 ${cur.day} 日　`:""}生涯 ${cur.seasons} 季／獎項 ${cur.awards}</div>
      </div>
      <div class="slotbtns">
        <button class="btn sm green" data-act="exportSave">⬇ 匯出檔案</button>
        <button class="btn sm blue" data-act="pickImport">⬆ 匯入檔案</button>
      </div>
    </div>
    <input type="file" id="importFile" accept=".json,application/json" style="display:none">
    <div class="hr"></div>
    <h3>存檔槽（${SAVE_SLOTS} 格）</h3>
    ${rows}
    <div class="hr"></div>
    ${S.confirm?confirmBoxHTML():""}
    <button class="btn blk" data-act="backFromSave">← 返回</button>
  </div>`;
}

/* ----- 選隊 ----- */
function viewNewGame(){
  const lt=lastTeamId();
  const renew=lt?`<button class="btn gold blk" data-act="pickTeam" data-arg="${lt}">🔁 續任 ${teamBadge(lt)}（第 ${seasonNo()} 季）</button>
    <p class="muted center" style="margin:2px 0 6px">一鍵延續你上一季的球隊；想換個東家再往下挑選。</p>
    <div class="hr"></div>`:"";
  return `<div class="panel">
    <h2>選擇你要率領的球隊</h2>
    ${renew}
    <p class="muted">${TEAM_DEFS.length} 支球團各有優劣（＋為整體評價）。選定後展開 ${(TEAM_DEFS.length-1)*2} 場例行賽，爭取前四名晉級季後賽。</p>
    ${TEAM_DEFS.map(t=>{
      const tc=getTeam(t.id);
      const ov=Math.round(avg(tc.batters.slice(0,9).map(b=>b.meet*0.5+b.power*0.3+b.speed*0.2)));
      const pv=Math.round(avg(tc.pitchers.map(p=>p.velocity*0.35+p.control*0.35+p.breaking*0.3)));
      return `<div class="teamcard">
        <div style="flex:1">
          <div class="nm">${teamBadge(t.id)}</div>
          <div class="meta">主場：${t.stadium}　·　打線 ${ov}　·　投手陣 ${pv}</div>
        </div>
        <button class="btn green" data-act="pickTeam" data-arg="${t.id}">選擇</button>
      </div>`;
    }).join("")}
    <div class="hr"></div>
    <button class="btn blk" data-act="toTitle">← 返回</button>
    ${S.confirm?confirmBoxHTML():""}
  </div>`;
}

/* ----- 球季總部 ----- */
function viewHub(){
  const s=S.season;
  if(!s)return viewTitle();
  const g=nextPlayerGame();
  const team=getTeam(s.playerTeam);
  const st=standingsList();
  const myRank=st.findIndex(x=>x.id===s.playerTeam)+1;
  const myRec=s.records[s.playerTeam];
  let main="";
  if(!g){
    ensurePlayoff();
    playoffProgress();
    main=playoffHubMain(S.season.playoff);
    return hubFrame(team,st,myRank,myRec,main);
  }
  const oppId=g.away===s.playerTeam?g.home:g.away;
  const opp=getTeam(oppId);
  const isHome=g.home===s.playerTeam;
  // 檢查是否剛完成選秀（新球季開始時標記；draftLog 的 season 標記為「哪一季結束時的選秀」）
  let draftCompleteMsg="";
  if(s.draftJustCompleted && s.draftLog){
    const recentPicks=s.draftLog.filter(x=>x.season===seasonNo()-1);
    if(recentPicks.length){
      const names=recentPicks.map(x=>`${x.name}(${x.pos})`).join("、");
      draftCompleteMsg=`<div class="hr"></div><div class="panel" style="background:#1a3a2a;border-color:#4fd39a"><h3>✅ 選秀完成</h3><p>你的球團指名了：${recentPicks.map(x=>`${x.name}(${x.pos})`).join("、")}</p></div>`;
    }
    // 顯示完畢，清除標記，避免整季都顯示
    s.draftJustCompleted=false;
  }
  main=`<div class="panel">
    <h2>第 ${seasonNo()} 季　第 ${s.day+1} 日 / 共 ${s.schedule.length} 日</h2>
    <div class="teamcard"><div><div class="nm">${isHome?"🏠 主場":"🚌 客場"}</div>
      <div class="meta">vs ${esc(opp.name)}　·　${isHome?esc(team.stadium):esc(opp.stadium)}</div></div></div>
    <button class="btn green blk" data-act="play">⚾ 進行比賽（即時戰術）</button>
    <button class="btn gold blk" data-act="simPlay">⏩ 快速模擬本場</button>
    ${s.allstar && s.allstar.played ? `<div class="hr"></div><button class="btn gold blk" data-act="allstar">⭐ 明星賽結果（MVP：${esc(s.allstar.mvp.name)}）</button>` : (s.allstar && !s.allstar.played ? `<div class="hr"></div><button class="btn gold blk" data-act="allstar">⭐ 明星賽週到了！點擊進行表演賽</button>` : "")}
    ${s.draft && !s.drafted ? `<div class="hr"></div><div class="panel" style="background:#3a2a1a;border-color:#e6c877"><h3>⚠️ 選秀進行中</h3><p class="muted">你的球團在第 ${s.draft.idx+1} 位（共 ${s.draft.picks.length} 位）。請到「新人選秀」完成指名，或點「自動選最強」一鍵完成。</p><button class="btn gold blk" data-act="draft">➡ 前往選秀</button></div>` : ""}
    ${draftCompleteMsg}
    <div class="hr"></div>
    <div class="two">
      <button class="btn blk" data-act="roster">👥 陣容與成績</button>
      <button class="btn blk" data-act="abilities">🧮 選手能力</button>
      <button class="btn blk" data-act="lineup">🧢 打線／守位</button>
      <button class="btn blk" data-act="allstar">⭐ 明星賽</button>
      <button class="btn blk" data-act="seasonInfo">📋 球季資訊</button>
      <button class="btn blk" data-act="schedule">🗓 賽程表</button>
      <button class="btn blk" data-act="standings">📊 聯盟排名</button>
      <button class="btn blk" data-act="leaders">📈 球員排行</button>
      <button class="btn blk" data-act="records">📕 單場紀錄</button>
      <button class="btn blk" data-act="history">📜 遊戲紀錄</button>
      <button class="btn blk" data-act="league">🏟 劇空間日報</button>
    </div>
    <div class="hr"></div>
    <div class="two">
      <button class="btn blue blk" data-act="simToMid">⏭ 快進到季中（明星賽）</button>
      <button class="btn blue blk" data-act="simToEnd">⏭ 快進到季末</button>
    </div>
    ${(s.news&&s.news.length)?`<div class="hr"></div><div class="news">${s.news.map(n=>`<p>${esc(n.text)}</p>`).join("")}</div>`:""}
    <div class="hr"></div>
    <button class="btn sm blk" data-act="help">？ 遊戲說明</button>
    <div class="hr"></div>
    <button class="btn sm blk" data-act="saveNow">💾 手動存檔</button>
    <button class="btn sm blk" data-act="toTitle">回主選單（自動存檔）</button>
  </div>
  ${startersPanel()}`;
  return hubFrame(team,st,myRank,myRec,main);
}
function hubFrame(team,st,myRank,myRec,main){
  const rows=st.map((x,i)=>{
    const cls=x.id===S.season.playerTeam?"me":"";
    return `<tr class="${cls}"><td>${i+1}${i===0?' <span class="rank1">★</span>':i<4?' <span class="muted">(晉級)</span>':''}</td>
      <td class="name">${teamBadge(x.id)}${x.id===S.season.playerTeam?"　<span class=\"pill on\">你</span>":""}</td>
      <td class="num">${x.w}</td><td class="num">${x.l}</td><td class="num">${x.t}</td>
      <td class="num">${fmtAvg(x.pct)}</td><td class="num">${x.gb}</td></tr>`;
  }).join("");
  return `<div class="topbar"><div>監督：<b>${esc(team.name)}</b>　·　第 <b>${seasonNo()}</b> 季</div>
    <div>戰績 <b>${myRec.w}-${myRec.l}${myRec.t?"-"+myRec.t:""}</b>　排名 <b>${myRank}</b></div></div>
    ${main}
    <div class="panel">
      <h2>聯盟排名</h2>
      <table class="grid"><tr><th>#</th><th>球隊</th><th>勝</th><th>敗</th><th>和</th><th>勝率</th><th>勝差</th></tr>${rows}</table>
    </div>`;
}

/* 今日先發名單（球季總部用） */
function startersPanel(){
  const s=S.season,day=s.day,g=nextPlayerGame();
  if(!g)return "";
  const me=s.playerTeam,myHome=g.home===me;
  const my=getTeam(me),lu=buildLineup(my),sp=starterOf(my,day);
  const oppId=myHome?g.away:g.home,opp=getTeam(oppId),osp=starterOf(opp,day);
  const rows=lu.map((b,i)=>`<tr><td class="num">${i+1}</td><td class="name">${esc(b.name)}</td><td>${esc(b.posLabel)}</td></tr>`).join("");
  return `<div class="panel">
    <h2>今日先發</h2>
    <div class="two">
      <div><h3>${teamBadge(me)} <span class="pill">${myHome?"主場":"客場"}</span></h3>
        <table class="grid lineup"><tr><th>棒</th><th>球員</th><th>守位</th></tr>${rows}</table>
        <p class="muted" style="font-size:12px;margin-top:6px">先發投手：<b>${esc(sp.name)}</b></p>
        <button class="btn sm blk" data-act="lineup">🧢 編輯打線／守位</button></div>
      <div><h3>${teamBadge(oppId)}</h3>
        <p class="muted">對手先發投手：<b>${esc(osp.name)}</b></p>
        <p class="muted" style="font-size:12px">開打後可在比賽畫面查看雙方完整打線、板凳與牛棚。</p></div>
    </div>
  </div>`;
}

/* ----- 球季資訊 ----- */
function viewSeasonInfo(){
  const se=S.season;
  if(!se)return viewTitle();
  const team=getTeam(se.playerTeam),st=standingsList();
  const myRank=st.findIndex(x=>x.id===se.playerTeam)+1;
  const rec=se.records[se.playerTeam]||{w:0,l:0,t:0};
  const total=(se.schedule||[]).length,day=Math.min(se.day,total),left=Math.max(0,total-se.day);
  const po=se.playoff;
  let poTxt="尚未開始";
  if(po)poTxt=po.champion?("已結束（總冠軍："+getTeam(po.champion).name+"）"):(po.stage==="semi"?"準決賽進行中":"冠軍戰進行中");
  const titles=(CAREER.history||[]).filter(x=>x.isChamp).length;
  const histRows=(CAREER.history||[]).slice().reverse().slice(0,8).map(x=>`<tr class="${x.isChamp?"me":""}"><td class="num">第 ${x.no} 季</td><td class="name">${teamBadge(x.team)}</td><td class="num">${x.w}-${x.l}${x.t?"-"+x.t:""}</td><td class="num">第 ${x.rank} 名</td><td class="name">${x.champ?teamBadge(x.champ)+(x.isChamp?" 🏆":""):"<span class=\"muted\">－</span>"}</td></tr>`).join("");
  return `<div class="panel"><h2>📋 球季資訊</h2>
    <div class="slotcard"><div class="slotinfo"><div class="nm">第 ${seasonNo()} 季</div>
      <div class="meta">${teamBadge(se.playerTeam)}　主場：${esc(team.stadium)}</div></div></div>
    <div class="hr"></div><h3>本季進度</h3>
    <table class="grid">
      <tr><th>例行賽</th><td class="num">第 ${day} / ${total} 日（剩 ${left} 日）</td></tr>
      <tr><th>目前戰績</th><td class="num">${rec.w}-${rec.l}${rec.t?"-"+rec.t:""}　（第 ${myRank} 名）</td></tr>
      <tr><th>季後賽</th><td class="name">${esc(poTxt)}</td></tr>
    </table>
    <div class="hr"></div><h3>生涯</h3>
    <table class="grid">
      <tr><th>已完成球季</th><td class="num">${CAREER.seasons||0} 季</td></tr>
      <tr><th>總冠軍</th><td class="num">${titles} 次</td></tr>
      <tr><th>明星賽</th><td class="num">${(CAREER.allstars||[]).length} 屆</td></tr>
    </table>
    ${histRows?`<div class="hr"></div><h3>近年球季</h3><table class="grid"><tr><th>球季</th><th>你的球隊</th><th>戰績</th><th>名次</th><th>總冠軍</th></tr>${histRows}</table>`:""}
    <div class="hr"></div>
    <div class="two">
      <button class="btn blk" data-act="history">📜 遊戲紀錄</button>
      <button class="btn blk" data-act="backHub">← 回球季總部</button>
    </div></div>`;
}

/* ----- 打線／守位編輯 ----- */
function luStatLine(b){
  const s=S.season&&S.season.playerStats&&S.season.playerStats.bat[b.id];
  const ab=s?s.ab:0,h=s?s.h:0,hr=s?s.hr:0,rbi=s?s.rbi:0,bb=s?s.bb:0;
  const obp=ab+bb>0?((h+bb)/(ab+bb)):0;
  return `<div class="lustats">打 <b>${b.meet}</b>　力 <b>${b.power}</b>　選 <b>${b.eye}</b>　走 <b>${b.speed}</b>　守 <b>${b.defense}</b></div>
    <div class="lustats2">本季 ${ab?fmtAvg(h/ab):"－"}　<span class="lusthr">HR <b>${hr}</b></span>　<span class="lustrbi">RBI <b>${rbi}</b></span>　<span class="lustobp">OBP ${obp>0?fmtAvg(obp):"－"}</span></div>`;
}
function viewLineup(){
  const se=S.season,team=getTeam(se.playerTeam);
  const lu=buildLineup(team),bench=buildBench(team);
  const sel=S.luSel==null?-1:S.luSel;
  const rows=lu.map((b,i)=>`<div class="lurow ${i===sel?"sel":""}" data-act="luPick" data-arg="${i}">
      <span class="luord">${i+1}</span>
      <div class="lumain">
        <div class="luname">${esc(b.name)} ${gradeBadge(b)}${b.bench?' <span class="pill off">板凳</span>':""}</div>
        ${luStatLine(b)}
      </div>
      <span class="lups">${esc(b.posLabel||"")}</span>
      <span class="lubtns">
        <button class="btn sm" data-act="luUp" data-arg="${i}" ${i===0?"disabled":""}>▲</button>
        <button class="btn sm" data-act="luDown" data-arg="${i}" ${i===lu.length-1?"disabled":""}>▼</button>
      </span>
    </div>`).join("");
  const brows=bench.length?bench.map(b=>`<div class="lurow benchrow">
      <span class="luord">–</span>
      <div class="lumain">
        <div class="luname">${esc(b.name)} ${gradeBadge(b)}</div>
        ${luStatLine(b)}
      </div>
      <span class="lups">${esc(b.posLabel||"")}</span>
      <button class="btn sm gold" data-act="luSwap" data-arg="${b.id}">⇄ 換入${sel>=0?"第 "+(sel+1)+" 棒":""}</button>
    </div>`).join(""):`<p class="muted">沒有可替換的球員。</p>`;
  return `<div class="panel"><h2>🧢 打線／守位編輯</h2>
    <p class="muted">調整打線：▲▼ 移動棒次；先點一位先發（反白），再按板凳的「換入」把他排進該棒次。守位依球員本身位置顯示，變更後立即套用到下一場比賽。</p>
    <p class="muted" style="font-size:11px">數值：<b>打</b>＝打擊　<b>力</b>＝力量　<b>選</b>＝選球　<b>走</b>＝速度　<b>守</b>＝守備；後方為本季打率（安打／打數）。</p>
    <div class="hr"></div><h3>先發打線</h3>
    <div class="lulist">${rows}</div>
    <div class="hr"></div><h3>板凳</h3>
    <div class="lulist">${brows}</div>
    <div class="hr"></div>
    <div class="two">
      <button class="btn blk" data-act="luAuto">🤖 自動排序打線</button>
      <button class="btn blk" data-act="luReset">↺ 回復預設打線</button>
      <button class="btn blk" data-act="backHub">← 回球季總部</button>
    </div></div>`;
}

/* ----- 比賽畫面 ----- */
function viewGame(){
  const m=S.match;
  if(!m)return viewHub();
  const off=playerIsOffense(m);
  const myTurn=!m.over;
  const innLabel=(m.half==="top"?"上":"下");
  const offSide=offenseSide(m),defSide=defenseSide(m);
  const batter=currentBatter(m);
  const myOrder=(m.batterIdx[offSide]%m.lineups[offSide].length)+1;
  const P=m.pitchers[defSide];
  const eff=pitcherEffective(P.obj,P.pitches);
  const team=esc(getTeam(S.season.playerTeam).name);

  // 記分板：只顯示已進行到的局數，未開打的半局留白（避免誤看成 0 分）
  const cols=Math.max(1,m.inning);
  const cellPlayed=(side,i)=>{   // i 為 0 起算的局
    if(i+1>m.inning)return false;
    if(i+1<m.inning)return true;
    return m.half==="top"?side==="away":true;
  };
  let head="<tr><th>球隊</th>";
  for(let i=1;i<=cols;i++)head+=`<th>${i}</th>`;
  head+="<th>R</th><th>H</th><th>E</th></tr>";
  const row=(id,key)=>{
    const isP=id===S.season.playerTeam;
    let r=`<tr class="${isP?"player":""}"><td class="team">${esc(getTeam(id).short)} ${esc(getTeam(id).name)}${isP?"＊":""}</td>`;
    for(let i=0;i<cols;i++)r+=`<td>${cellPlayed(key,i)?(m.line[key][i]||0):""}</td>`;
    r+=`<td class="rhe">${m.score[key]}</td><td class="rhe">${m.hits[key]}</td><td class="rhe">${m.errs[key]}</td></tr>`;
    return r;
  };
  const scoreboard=`<div class="scoreboard"><table>${head}${row(m.awayId,"away")}${row(m.homeId,"home")}</table></div>`;

  // 壘包圖
  const field=fieldSVG(m.bases);
  const count=`<div class="countbox">
    <div class="countrow"><span class="lbl">B</span><span class="leds">${[0,1,2,3].map(i=>`<span class="led b ${i<m.balls?"on":""}"></span>`).join("")}</span>
      <span class="lbl">S</span><span class="leds">${[0,1,2].map(i=>`<span class="led s ${i<m.strikes?"on":""}"></span>`).join("")}</span>
      <span class="lbl">O</span><span class="leds">${[0,1,2].map(i=>`<span class="led o ${i<m.outs?"on":""}"></span>`).join("")}</span></div>
    <div class="countrow" style="margin-top:6px"><span class="lbl">局面</span><b style="color:#ffe07a">${m.inning}局${innLabel}</b>　<span class="lbl">壘上</span>${batterDesc(m)}</div>
  </div>`;

  const matchup=`<div class="matchup">
    <div style="margin-bottom:6px"><span class="who">🧑 ${esc(batter.name)}</span><span class="pos">${esc(batter.posLabel)}</span><span class="pill on">第 ${myOrder} 棒</span>
      <span class="muted" style="font-size:12px">　打率 ${batAvg(m,batter.id)}</span></div>
    ${rbar("打擊",batter.meet)}${rbar("長打",batter.power)}${rbar("選球",batter.eye)}${rbar("走壘",batter.speed)}
    <div class="hr"></div>
    <div style="margin-bottom:6px"><span class="who">🔥 ${esc(P.obj.name)}</span><span class="pos">${esc(P.obj.role)}</span>
      <span class="muted" style="font-size:12px">　投球數 ${P.pitches}${eff.fatigue<0.95?' <span class="pill off">疲勞</span>':' <span class="pill on">狀態佳</span>'}　<span class="speed">⚡ ${m.pitchSpeed||"-"} km/h</span></span></div>
    ${rbar("球速",P.obj.velocity)}${rbar("控球",P.obj.control)}${rbar("變化",P.obj.breaking)}${rbar("體力",P.obj.stamina)}
  </div>`;

  // 日誌
  const log=`<div class="log" id="log">${m.log.map(l=>{
    if(typeof l==="string")return `<p>${esc(l)}</p>`;
    return `<p class="${l.c||""}">${esc(l.t)}</p>`;
  }).join("")}</div>`;

  // 動作
  let actions="";
  if(!m.over){
    if(off){
      actions=`<div class="actgroup"><span class="gtitle">打擊戰術</span><br>
        <button class="btn red" data-act="bat" data-arg="normal">正常揮擊</button>
        <button class="btn red" data-act="bat" data-arg="power">強力揮擊</button>
        <button class="btn red" data-act="bat" data-arg="take">耐心等球</button>
        ${m.bases[0]!==null||m.bases[1]!==null?`<button class="btn" data-act="bat" data-arg="bunt">犧牲短打</button>`:""}
        ${m.bases[0]||m.bases[1]?`<button class="btn" data-act="bat" data-arg="hitrun">打帶跑</button>`:""}
      </div>
      <div class="actgroup"><span class="gtitle">跑壘／調度</span><br>
        ${m.bases[0]||m.bases[1]?`<button class="btn blue" data-act="steal">盜壘</button>`:""}
        ${m.bench[offSide].length?`<button class="btn blue" data-act="pinchhit">代打</button>`:""}
      </div>`;
    }else{
      actions=`<div class="actgroup"><span class="gtitle">配球策略</span><br>
        <button class="btn gold" data-act="pitch" data-arg="power">全力投球</button>
        <button class="btn gold" data-act="pitch" data-arg="control">控球至上</button>
        <button class="btn gold" data-act="pitch" data-arg="corner">邊邊角角</button>
        <button class="btn gold" data-act="pitch" data-arg="chase">引誘球</button>
        <button class="btn" data-act="pitch" data-arg="ibb">故意四壞</button>
      </div>
      <div class="actgroup"><span class="gtitle">投手調度</span><br>
        ${bullpenButtons(m)}
      </div>`;
    }
    actions+=`<div class="actgroup" style="border-top:1px dotted var(--line);padding-top:6px">
      <button class="btn green" data-act="autoInning">⏩ 自動完成本局</button>
      <button class="btn green" data-act="simGame">⏭ 快速模擬全場</button>
    </div>`;
  }

  let result="";
  if(m.over){
    const win=m.winner;
    const title=m.walkoff?"🎉 再見安打！勝利！":
      win===null?"和局收場":`比賽結束　${esc(getTeam(win==="home"?m.homeId:m.awayId).name)} 獲勝`;
    const hasReg=!!nextPlayerGame(),hasPo=!!playoffNextGame();
    const nextBtn=(hasReg||hasPo)?`<button class="btn green blk" data-act="nextGame">⏭ ${hasReg?"繼續下一場":"繼續季後賽"}</button>`:"";
    const poInfo = (S.season&&S.season.playoff)?`<p class="center muted" style="font-size:12px">季後賽狀態：${S.season.playoff.champion?"已結束（總冠軍 ${teamBadge(S.season.playoff.champion)}）":(S.season.playoff.stage==="final"?"冠軍戰進行中":"準決賽進行中")}　${S.season.playoff.seeds&&S.season.playoff.seeds.indexOf(S.season.playerTeam)>=0?"（你已晉級）":""}</p>`:"";
    result=`<div class="panel" id="gameresult"><h2>${title}</h2>
      <p class="center">最終比數　<b class="bignum">${esc(getTeam(m.awayId).name)} ${m.score.away} － ${m.score.home} ${esc(getTeam(m.homeId).name)}</b></p>
      ${m.hero?`<p class="center" style="margin-top:8px">◆ Player of the Game：${teamBadge(teamOfPlayer({id:m.hero.pid}))}　<b>${esc(m.hero.name)}</b>　${m.hero.isPit?`<span class="pill on">三振 ${m.hero.s.k} 次</span>`:`<span class="pill on">安打 ${m.hero.s.h}／打點 ${m.hero.s.rbi}</span>`}</p>`:""}
      ${poInfo}
      ${boxScore(m)}
      <div class="hr"></div>
      ${nextBtn}
      <button class="btn ${nextBtn?"":"green"} blk" data-act="backToHub">▶ 回到球季總部</button>
    </div>`;
  }

  return `<div class="panel">
    ${S.ballFlash?`<div class="playball">⚾ PLAY BALL！</div>`:""}
    <div class="topbar"><div>你的球隊：<b>${team}</b></div><div class="turn">${m.over?"比賽結束":(off?"▶ 你的進攻（下達打擊戰術）":"▶ 你的守備（下達配球）")}</div></div>
    ${scoreboard}
    ${m.splash?`<div class="splash ${m.splash.c}">${esc(m.splash.t)}</div>`:""}
    <div class="fieldwrap" style="margin-top:10px">
      ${field}
      <div class="cond">${count}${matchup}</div>
    </div>
  </div>
  <div class="panel">
    <h2>實況轉播</h2>
    ${log}
    <div class="actions">${actions}</div>
  </div>
  <div class="panel">
    <h2>打線與板凳</h2>
    <div class="two">${lineupBox(m,"away")}${lineupBox(m,"home")}</div>
  </div>
  ${result}`;
}
function batterDesc(m){
  const b=[];if(m.bases[2])b.push("三壘");if(m.bases[1])b.push("二壘");if(m.bases[0])b.push("一壘");
  return b.length?b.join("、")+"有跑者":"壘上無人";
}
function batAvg(m,pid){
  const s=m.stats[pid];
  if(!s||!s.ab)return ".000";
  return fmtAvg(s.h/s.ab);
}
function lineupBox(m,side){
  const lu=m.lineups[side];
  const isOff=!m.over&&side===offenseSide(m);
  const cur=isOff?lu[m.batterIdx[side]%lu.length]:null;
  const onBase=new Set();m.bases.forEach(x=>{if(x)onBase.add(x.id);});
  const orig=(m.originals&&m.originals[side])||[];
  const tid=side===m.awayId?m.awayId:m.homeId;
  const rows=lu.map((b,i)=>{
    const cls=[];
    if(onBase.has(b.id))cls.push("onbase");
    if(cur&&b.id===cur.id)cls.push("batting");
    const o=orig[i];
    const subNote=(o&&o.id!==b.id)?` <span class="muted" style="font-size:11px">（原 ${esc(o.name)}・${esc(o.posLabel)}）</span>`:"";
    const mark=onBase.has(b.id)?' <span class="pill on">壘</span>':"";
    return `<tr class="${cls.join(" ")}"><td class="num">${i+1}</td><td class="name">${cur&&b.id===cur.id?"▶ ":""}${esc(b.name)}${mark}${subNote}</td><td>${esc(b.posLabel)}</td></tr>`;
  }).join("");
  const bench=m.bench[side].map(b=>`${esc(b.name)}<span class="muted">（${esc(b.posLabel)}）</span>`).join("、");
  const bp=m.bullpen[side].map(p=>`${esc(p.name)}<span class="muted">（${esc(p.role)}）</span>`).join("、");
  const P=m.pitchers[side].obj;
  return `<div>
    <h3>${teamBadge(tid)}${isOff?' <span class="pill on">進攻中</span>':""}</h3>
    <table class="grid lineup"><tr><th>棒</th><th>球員</th><th>守位</th></tr>${rows}</table>
    <p class="muted" style="font-size:12px;margin:6px 0 2px">投手：${esc(P.name)}（${esc(P.role)}）</p>
    <p class="muted" style="font-size:12px;margin:2px 0">板凳：${bench||"－"}</p>
    <p class="muted" style="font-size:12px;margin:2px 0">牛棚：${bp||"－"}</p>
  </div>`;
}
function bullpenButtons(m){
  const defSide=defenseSide(m);
  const bp=m.bullpen[defSide];
  if(!bp.length)return `<span class="muted">牛棚已無可用投手</span>`;
  return bp.map(p=>`<button class="btn sm blue" data-act="changePit" data-arg="${p.id}">換上 ${esc(p.name)}（${p.role}）</button>`).join("");
}
function boxScore(m){
  const mk=(id,key)=>{
    const lu=m.lineups[key];
    const orig=(m.originals&&m.originals[key])||[];
    let rows=lu.map((b,i)=>{
      const s=m.stats[b.id]||{ab:0,h:0,hr:0,rbi:0,bb:0,k:0,r:0};
      const o=orig[i];
      const subNote=(o&&o.id!==b.id)?` <span class="muted" style="font-size:11px">（原 ${esc(o.name)}・${esc(o.posLabel)}）</span>`:"";
      return `<tr><td class="name">${esc(b.name)}${subNote}</td><td>${esc(b.posLabel)}</td>
        <td class="num">${s.ab}</td><td class="num">${s.h}</td><td class="num">${s.hr}</td>
        <td class="num">${s.rbi}</td><td class="num">${s.bb}</td><td class="num">${s.k}</td></tr>`;
    }).join("");
    const cur=m.pitchers[key].obj.id;
    const ids=(m.usedPitchers[key]||[]).concat(cur).filter((v,i,a)=>a.indexOf(v)===i);
    const pitRows=ids.map(pid=>{
      const p=playerById(pid);
      const ps=m.pstats[pid]||{outs:0,h:0,r:0,er:0,bb:0,k:0,pp:0};
      return `<tr><td class="name">${esc(p?p.name:pid)}${pid===cur?' <span class="pill on">現任</span>':''}</td>
        <td class="num">${fmtIP(ps.outs)}</td><td class="num">${ps.h}</td><td class="num">${ps.r}</td><td class="num">${ps.er}</td>
        <td class="num">${ps.bb}</td><td class="num">${ps.k}</td><td class="num">${ps.pp}</td></tr>`;
    }).join("");
    return `<h3>${esc(getTeam(id).name)}</h3>
      <table class="grid"><tr><th>打者</th><th>守位</th><th>打數</th><th>安打</th><th>全壘</th><th>打點</th><th>四壞</th><th>三振</th></tr>${rows}</table>
      <table class="grid" style="margin-top:6px"><tr><th>投手</th><th>局數</th><th>被安</th><th>失分</th><th>責失</th><th>四壞</th><th>三振</th><th>球數</th></tr>${pitRows}</table>`;
  };
  return `<div class="two">${mk(m.awayId,"away")}${mk(m.homeId,"home")}</div>`;
}
function fieldSVG(bases){
  const occ=[!!bases[0],!!bases[1],!!bases[2]];
  const base=(x,y,on,label)=>`<g><rect x="${x-14}" y="${y-14}" width="28" height="28" rx="4" transform="rotate(45 ${x} ${y})" fill="${on?"#7fd6ea":"#0d1e30"}" stroke="${on?"#eaf6ff":"#35597a"}" stroke-width="2"${on?' filter="url(#hglow)"':""}/>${on?`<text x="${x}" y="${y+5}" text-anchor="middle" font-size="15" fill="#06202b" font-weight="700">${label}</text>`:""}</g>`;
  return `<svg viewBox="0 0 220 210" class="field-svg" preserveAspectRatio="xMidYMid meet">
    <defs><filter id="hglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="220" height="210" fill="#0d1a2a"/>
    <path d="M110 196 L201 105 L110 14 L19 105 Z" fill="#122c45" stroke="#57c8e6" stroke-width="2"/>
    <path d="M110 196 L110 130 L188 105 Z" fill="#1b3f60" opacity="0.6"/>
    <text x="110" y="66" text-anchor="middle" font-size="11" fill="#8fb0cc">2B</text>
    <text x="46" y="112" text-anchor="middle" font-size="11" fill="#8fb0cc">3B</text>
    <text x="176" y="112" text-anchor="middle" font-size="11" fill="#8fb0cc">1B</text>
    ${base(19,105,occ[2],3)}
    ${base(110,14,occ[1],2)}
    ${base(201,105,occ[0],1)}
    <rect x="96" y="182" width="28" height="16" rx="3" transform="rotate(45 110 190)" fill="#0d1e30" stroke="#35597a" stroke-width="2"/>
    <text x="110" y="205" text-anchor="middle" font-size="10" fill="#8fb0cc">本壘</text>
  </svg>`;
}

/* ----- 陣容與成績 ----- */
function viewRoster(){
  const tid=S.season.playerTeam,t=getTeam(tid),ps=S.season.playerStats;
  const batRows=t.batters.map(b=>{
    const s=ps.bat[b.id];
    const ab=s?s.ab:0,h=s?s.h:0;
    return `<tr><td class="name">${playerAvatar(b,20)}<span class="plink" data-act="player" data-arg="${b.id}">${esc(b.name)}</span>${b.bench?' <span class="pill off">替</span>':''}</td>
      <td>${esc(b.posLabel)}</td><td class="num">${gradeBadge(b)}</td><td class="num">${s?s.g:0}</td><td class="num">${ab}</td><td class="num">${h}</td>
      <td class="num">${fmtAvg(ab?h/ab:0)}</td><td class="num">${s?s.hr:0}</td><td class="num">${s?s.rbi:0}</td>
      <td class="num">${s?s.bb:0}</td><td class="num">${s?s.k:0}</td><td class="num">${s?s.r:0}</td><td class="num">${s?s.sb:0}</td></tr>`;
  }).join("");
  const pitRows=t.pitchers.map(p=>{
    const s=ps.pit[p.id];
    return `<tr><td class="name">${playerAvatar(p,20)}<span class="plink" data-act="player" data-arg="${p.id}">${esc(p.name)}</span></td><td>${esc(p.role)}</td><td class="num">${gradeBadge(p)}</td><td class="num">${s?s.g:0}</td>
      <td class="num">${s?fmtIP(s.outs):"0.0"}</td><td class="num">${s?fmtERA(s.er,s.outs):"-.-"}</td>
      <td class="num">${s?s.w:0}</td><td class="num">${s?s.l:0}</td><td class="num">${s?s.sv:0}</td>
      <td class="num">${s?s.h:0}</td><td class="num">${s?s.bb:0}</td><td class="num">${s?s.k:0}</td></tr>`;
  }).join("");
  return `<div class="panel">
    <h2>${esc(t.name)}　陣容與本季成績</h2>
    <div class="abilnote">💡 點<b>球員名字</b>可看完整能力數值與本季成績；「綜合」為能力評級（S/A/B/C/D）。</div>
    <h3>野手</h3>
    <table class="grid"><tr><th>球員</th><th>守位</th><th>綜合</th><th>出賽</th><th>打數</th><th>安打</th><th>打率</th><th>全壘</th><th>打點</th><th>四壞</th><th>三振</th><th>得分</th><th>盜壘</th></tr>${batRows}</table>
    <h3>投手</h3>
    <table class="grid"><tr><th>球員</th><th>角色</th><th>綜合</th><th>出賽</th><th>局數</th><th>防禦率</th><th>勝</th><th>敗</th><th>救援</th><th>被安</th><th>四壞</th><th>三振</th></tr>${pitRows}</table>
    <div class="hr"></div>
    <button class="btn blk" data-act="abilities">🧮 選手能力數值一覽</button>
    <button class="btn blk" data-act="backHub">← 回球季總部</button>
  </div>`;
}

/* ----- 選手能力數值 ----- */
function viewAbilities(){
  const teamIds=TEAM_DEFS.map(t=>t.id);
  const valid=teamIds.concat(["__all"]);
  const sel=valid.indexOf(S.abilTeam)>=0?S.abilTeam:S.season.playerTeam;
  const isAll=sel==="__all";
  const tabs=valid.map(id=>{
    const lab=id==="__all"?"🌐 全聯盟":esc(getTeam(id).short||getTeam(id).name);
    return `<button class="btn sm ${id===sel?"gold":""}" data-act="abilTeam" data-arg="${id}">${lab}</button>`;
  }).join("");
  let bats=[],pits=[];
  if(isAll){
    teamIds.forEach(id=>{const tt=getTeam(id);tt.batters.forEach(b=>bats.push({p:b,tid:id}));tt.pitchers.forEach(p=>pits.push({p,tid:id}));});
  }else{
    const tt=getTeam(sel);tt.batters.forEach(b=>bats.push({p:b,tid:sel}));tt.pitchers.forEach(p=>pits.push({p,tid:sel}));
  }
  // 守位清單（依傳統順序）
  const POS_ORDER=["捕手","一壘手","二壘手","三壘手","游擊手","左外野","中外野","右外野","指定打擊"];
  const posSet=[];
  bats.forEach(x=>{if(posSet.indexOf(x.p.posLabel)<0)posSet.push(x.p.posLabel);});
  posSet.sort((a,b)=>{const ia=POS_ORDER.indexOf(a),ib=POS_ORDER.indexOf(b);return (ia<0?99:ia)-(ib<0?99:ib);});
  const pos=S.abilPos||"all", role=S.abilRole||"all";
  // 野手：篩選 + 排序
  let batsF=(pos==="all")?bats.slice():bats.filter(x=>x.p.posLabel===pos);
  if(role==="start")batsF=batsF.filter(x=>!x.p.bench);
  else if(role==="bench")batsF=batsF.filter(x=>x.p.bench);
  const bkeys={overall:p=>playerOverall(p),meet:p=>p.meet,power:p=>p.power,eye:p=>p.eye,speed:p=>p.speed,defense:p=>p.defense};
  if(S.abilBatSort==="age")batsF.sort((a,b)=>a.p.age-b.p.age);
  else if(S.abilBatSort!=="orig"&&bkeys[S.abilBatSort]){const f=bkeys[S.abilBatSort];batsF.sort((a,b)=>f(b.p)-f(a.p));}
  // 投手：篩選 + 排序
  let pitsF=pits.slice();
  if(role==="start")pitsF=pitsF.filter(x=>x.p.starter);
  else if(role==="bench")pitsF=pitsF.filter(x=>!x.p.starter);
  const pkeys={overall:p=>playerOverall(p),velocity:p=>p.velocity,control:p=>p.control,breaking:p=>p.breaking,stamina:p=>p.stamina};
  if(S.abilPitSort==="age")pitsF.sort((a,b)=>a.p.age-b.p.age);
  else if(S.abilPitSort!=="orig"&&pkeys[S.abilPitSort]){const f=pkeys[S.abilPitSort];pitsF.sort((a,b)=>f(b.p)-f(a.p));}
  const teamCell=x=>isAll?`<td class="name"><span class="swatch" style="background:${getTeam(x.tid).c1}"></span>${esc(getTeam(x.tid).short)}</td>`:"";
  const batRows=batsF.map(x=>{const b=x.p;return `<tr><td class="name">${playerAvatar(b,18)}<span class="plink" data-act="player" data-arg="${b.id}">${esc(b.name)}</span>${b.bench?' <span class="pill off">替</span>':''}</td>${teamCell(x)}<td>${esc(b.posLabel)}</td><td class="num">${b.age}${ageNote(b.age)}</td><td class="num">${gradeBadge(b)}</td><td class="num">${b.meet}</td><td class="num">${b.power}</td><td class="num">${b.eye}</td><td class="num">${b.speed}</td><td class="num">${b.defense}</td></tr>`;}).join("");
  const pitRows=pitsF.map(x=>{const p=x.p;return `<tr><td class="name">${playerAvatar(p,18)}<span class="plink" data-act="player" data-arg="${p.id}">${esc(p.name)}</span></td>${teamCell(x)}<td>${esc(p.role)}</td><td class="num">${p.age}${ageNote(p.age)}</td><td class="num">${gradeBadge(p)}</td><td class="num">${p.velocity}</td><td class="num">${p.control}</td><td class="num">${p.breaking}</td><td class="num">${p.stamina}</td></tr>`;}).join("");
  const teamCol=isAll?"<th>球隊</th>":"";
  const btSort=S.abilBatSort||"overall", ptSort=S.abilPitSort||"overall";
  const bsortBtns=[["overall","綜合"],["meet","打擊"],["power","力量"],["eye","選球"],["speed","速度"],["defense","守備"],["age","年齡"],["orig","原本"]]
    .map(([k,l])=>`<button class="btn sm ${btSort===k?"blue":""}" data-act="abilSortBat" data-arg="${k}">${l}</button>`).join("");
  const psortBtns=[["overall","綜合"],["velocity","球速"],["control","控球"],["breaking","變化"],["stamina","體力"],["age","年齡"],["orig","原本"]]
    .map(([k,l])=>`<button class="btn sm ${ptSort===k?"blue":""}" data-act="abilSortPit" data-arg="${k}">${l}</button>`).join("");
  const posBtns=[["all","全部"]].concat(posSet.map(pp=>[pp,pp]))
    .map(([k,l])=>`<button class="btn sm ${pos===k?"gold":""}" data-act="abilPos" data-arg="${k}">${l}</button>`).join("");
  const roleBtns=[["all","全部"],["start","先發"],["bench","替補"]]
    .map(([k,l])=>`<button class="btn sm ${role===k?"gold":""}" data-act="abilRole" data-arg="${k}">${l}</button>`).join("");
  const label=isAll?"▸ 全聯盟":(sel===S.season.playerTeam?"▸ 你的球隊":"▸ 偵察敵隊");
  const sub=isAll?"":`　<span class="swatch" style="background:${getTeam(sel).c1}"></span>${esc(getTeam(sel).name)}`;
  return `<div class="panel"><h2>選手能力數值</h2>
    <div class="actions">${tabs}</div>
    <div class="muted" style="font-size:12px;margin:4px 0 6px">第 ${CAREER.seasons+1} 季　${label}${sub}</div>
    <div class="actgroup"><span class="gtitle">野手排序</span><br>${bsortBtns}</div>
    <div class="actgroup"><span class="gtitle">守位篩選</span><br>${posBtns}</div>
    <div class="actgroup"><span class="gtitle">先發／替補</span><br>${roleBtns}</div>
    <h3>野手</h3>
    <table class="grid"><tr><th>球員</th>${teamCol}<th>守位</th><th>年齡</th><th>綜合</th><th>打擊</th><th>力量</th><th>選球</th><th>速度</th><th>守備</th></tr>${batRows||`<tr><td colspan="${isAll?10:9}" class="muted">沒有符合的球員</td></tr>`}</table>
    <div class="actgroup"><span class="gtitle">投手排序</span><br>${psortBtns}</div>
    <h3>投手</h3>
    <table class="grid"><tr><th>球員</th>${teamCol}<th>角色</th><th>年齡</th><th>綜合</th><th>球速</th><th>控球</th><th>變化</th><th>體力</th></tr>${pitRows||`<tr><td colspan="${isAll?9:8}" class="muted">沒有符合的球員</td></tr>`}</table>
    <div class="abilnote">箭頭表示年齡趨勢：<span style="color:#1f8f4a">▲</span>成長期　<span style="color:#6b6455">–</span>巔峰　<span style="color:#b5533a">▼</span>衰退期。每打完一季、開始新球季時，全聯盟球員會+1 歲並成長／老化（39 歲退休換新人）。</div>
    <div class="hr"></div>
    <button class="btn blk" data-act="backHub">← 回球季總部</button></div>`;
}

/* ----- 球員資料卡 ----- */
function viewPlayer(){
  const pid=S.selPlayer,p=pid?playerById(pid):null;
  if(!p)return `<div class="panel"><h2>球員資料</h2><div class="muted">找不到球員資料。</div><div class="hr"></div><button class="btn blk" data-act="backHub">← 回球季總部</button></div>`;
  const tid=pid.replace(/[bp]\d+$/,""),team=getTeam(tid),isPit=(p.role!==undefined);
  const ps=S.season&&S.season.playerStats;
  let bars,statsTable,roleLabel;
  if(isPit){
    roleLabel=p.role;
    bars=rbar("球速",p.velocity)+rbar("控球",p.control)+rbar("變化",p.breaking)+rbar("體力",p.stamina);
    const s=ps&&ps.pit[pid];
    statsTable=`<table class="grid"><tr><th>出賽</th><th>局數</th><th>防禦率</th><th>勝</th><th>敗</th><th>救援</th><th>被安</th><th>四壞</th><th>三振</th></tr>
      <tr><td class="num">${s?s.g:0}</td><td class="num">${s?fmtIP(s.outs):"0.0"}</td><td class="num">${s?fmtERA(s.er,s.outs):"-.-"}</td><td class="num">${s?s.w:0}</td><td class="num">${s?s.l:0}</td><td class="num">${s?s.sv:0}</td><td class="num">${s?s.h:0}</td><td class="num">${s?s.bb:0}</td><td class="num">${s?s.k:0}</td></tr></table>`;
  }else{
    roleLabel=p.posLabel;
    bars=rbar("打擊",p.meet)+rbar("力量",p.power)+rbar("選球",p.eye)+rbar("速度",p.speed)+rbar("守備",p.defense);
    const s=ps&&ps.bat[pid],ab=s?s.ab:0,h=s?s.h:0;
    statsTable=`<table class="grid"><tr><th>出賽</th><th>打數</th><th>安打</th><th>打率</th><th>全壘</th><th>打點</th><th>四壞</th><th>三振</th><th>得分</th><th>盜壘</th></tr>
      <tr><td class="num">${s?s.g:0}</td><td class="num">${ab}</td><td class="num">${h}</td><td class="num">${fmtAvg(ab?h/ab:0)}</td><td class="num">${s?s.hr:0}</td><td class="num">${s?s.rbi:0}</td><td class="num">${s?s.bb:0}</td><td class="num">${s?s.k:0}</td><td class="num">${s?s.r:0}</td><td class="num">${s?s.sb:0}</td></tr></table>`;
  }
  const overall=playerOverall(p);
  const care=CAREER.career||{};
  const cs=isPit?(care.pit||{})[pid]:(care.bat||{})[pid];
  let careerTable;
  if(isPit){
    careerTable=cs?`<table class="grid"><tr><th>出賽</th><th>局數</th><th>防禦率</th><th>勝</th><th>敗</th><th>救援</th><th>三振</th></tr>
      <tr><td class="num">${cs.g||0}</td><td class="num">${fmtIP(cs.outs||0)}</td><td class="num">${fmtERA(cs.er||0,cs.outs||0)}</td><td class="num">${cs.w||0}</td><td class="num">${cs.l||0}</td><td class="num">${cs.sv||0}</td><td class="num">${cs.k||0}</td></tr></table>`
      :`<p class="muted">尚無跨季累計（完成一整季後開始累計）。</p>`;
  }else{
    const cab=cs?cs.ab:0,ch=cs?cs.h:0;
    careerTable=cs?`<table class="grid"><tr><th>出賽</th><th>打數</th><th>安打</th><th>打率</th><th>全壘</th><th>打點</th><th>盜壘</th></tr>
      <tr><td class="num">${cs.g||0}</td><td class="num">${cab}</td><td class="num">${ch}</td><td class="num">${fmtAvg(cab?ch/cab:0)}</td><td class="num">${cs.hr||0}</td><td class="num">${cs.rbi||0}</td><td class="num">${cs.sb||0}</td></tr></table>`
      :`<p class="muted">尚無跨季累計（完成一整季後開始累計）。</p>`;
  }
  const best=playerBestGame(pid,isPit);
  const bestHTML=best?`<p>${best.text}</p>
    <button class="btn sm" data-act="gameDetail" data-arg="${best.d},${best.gi}">查看該場明細 ▸</button>`
    :`<p class="muted">本季尚無出賽紀錄。</p>`;
  const aws=playerAwards(pid);
  const awardHTML=aws.length?`<ul class="awardlist">${aws.map(x=>`<li>🏆 ${esc(x)}</li>`).join("")}</ul>`
    :`<p class="muted">尚無獲獎紀錄。</p>`;
  const miles=playerMilestones(pid);
  const mileHTML=miles.length?`<ul class="awardlist">${miles.map(x=>`<li>🎖 ${esc(x)}</li>`).join("")}</ul>`
    :`<p class="muted">尚未達成生涯里程碑（跨季累計）。</p>`;
  const allMiles=(CAREER.milestones||{})[pid]||{};
  const milestoneSummary=Object.keys(allMiles).length?`<p class="muted" style="font-size:12px">累計達成 ${Object.keys(allMiles).length} 項里程碑</p>`:"";
  return `<div class="panel"><h2>球員資料</h2>
    <div class="matchup">
      ${playerAvatar(p,56)}
      <div style="margin-bottom:6px"><span class="who">${esc(p.name)}</span><span class="pos">${esc(roleLabel)}</span>
        <span class="muted" style="font-size:12px">　${teamBadge(tid)}${p.bench?' <span class="pill off">替補</span>':''}　<span class="age">${p.age} 歲${ageNote(p.age)}</span></span>
        <span style="float:right">綜合 <span class="grade g-${gradeOf(overall)}">${gradeOf(overall)}</span> <b style="font-family:Consolas,monospace">${overall}</b></span></div>
      ${bars}
    </div>
    <h3>本季成績（第 ${CAREER.seasons+1} 季）</h3>${statsTable}
    <h3>生涯累計（跨季）</h3>${careerTable}
    <h3>本季亮眼</h3>${bestHTML}
    <h3>生涯里程碑</h3>${milestoneSummary}${mileHTML}
    <h3>獲獎紀錄</h3>${awardHTML}
    <div class="abilnote">${isPit?"先發投手體力較高、後援球速與變化較突出。":"替補球員（藍色「替」標籤）可在比賽中用代打上場。"}</div>
    <div class="hr"></div>
    <button class="btn" data-act="roster">← 回陣容</button>
    <button class="btn" data-act="abilities">選手能力一覽</button>
    <button class="btn" data-act="backHub">回球季總部</button>
  </div>`;
}
/* 從本季逐場 box 找出該球員最亮眼的一場 */
function playerBestGame(pid,isPit){
  const se=S.season;if(!se)return null;
  let best=null;
  (se.boxes||[]).forEach((arr,d)=>(arr||[]).forEach((b,gi)=>{
    const f=isPit?b.pit[pid]:b.bat[pid];
    if(!f)return;
    const myTeam=pid.replace(/[bp]\d+$/,"");
    const oppId=(b.aw===myTeam)?b.hm:(b.hm===myTeam)?b.aw:null;
    if(!oppId)return;
    const opp=getTeam(oppId).name;
    if(isPit){
      const score=(f[0]||0)*10+(f[5]||0)*3-f[2]*2+(f[7]?20:0);
      if(!best||score>best.score){
        best={d,gi,score,text:`第 ${d+1} 日 vs ${esc(opp)}：${fmtIP(f[0])} 局、${f[5]} 次三振、失 ${f[2]} 分${f[7]?"（勝投）":f[9]?"（救援）":""}`};
      }
    }else{
      const score=(f[1]||0)*2+(f[2]||0)*4+(f[3]||0)*2+(f[5]||0);
      if(!best||score>best.score){
        const hr=f[2]?"、"+f[2]+" 發全壘打":"";
        const rbi=f[3]?"、"+f[3]+" 打點":"";
        best={d,gi,score,text:`第 ${d+1} 日 vs ${esc(opp)}：${f[0]} 打數 ${f[1]} 安打${hr}${rbi}`};
      }
    }
  }));
  return best;
}
/* 該球員的歷屆獲獎紀錄（跨季，綁定頒獎典禮） */
function playerAwards(pid){
  const out=[];
  (CAREER.awards||[]).forEach(a=>{
    if(a.mvp&&a.mvp.pid===pid)out.push(`第 ${a.no} 季 最有價值球員（MVP）`);
    if(a.cy&&a.cy.pid===pid)out.push(`第 ${a.no} 季 最佳投手`);
    if(a.rookie&&a.rookie.pid===pid)out.push(`第 ${a.no} 季 新人王`);
    (a.kings||[]).forEach(k=>{if(k.pid===pid)out.push(`第 ${a.no} 季 ${k.title}${k.val!=null?"（"+k.val+"）":""}`);});
  });
  return out;
}

/* ----- 劇空間首頁：聯盟日報 ----- */
function viewLeague(){
  const se=S.season;
  if(!se)return `<div class="panel"><h2>🏟 劇空間</h2><p class="muted">尚未開始球季，先到主選單展開新球季吧。</p>
    <button class="btn blk" data-act="toTitle">← 回主選單</button></div>`;
  const st=standingsList();
  const srows=st.map((x,i)=>`<tr class="${x.id===se.playerTeam?"me":""}"><td class="num">${i+1}${i===0?' <span class="rank1">★</span>':i<4?' <span class="muted">(晉級)</span>':''}</td>
    <td class="name">${teamBadge(x.id)}${x.id===se.playerTeam?"　<span class=\"pill on\">你</span>":""}</td>
    <td class="num">${x.w}-${x.l}${x.t?"-"+x.t:""}</td><td class="num">${fmtAvg(x.pct)}</td><td class="num">${x.gb}</td></tr>`).join("");
  const days=[];
  for(let i=0;i<Math.min(se.day,se.schedule.length);i++)days.push(i);
  const recent=days.slice(-4);
  let games="";
  recent.forEach(di=>{
    const day=se.schedule[di];
    games+=`<h3>第 ${di+1} 日</h3>`+day.map((g,gi)=>g.played?leagueGameCard(di,gi):"").join("");
  });
  if(!games)games='<p class="muted">例行賽尚未開打。</p>';
  const poB=se.poBoxes||[];
  if(poB.length)games+=`<h3>季後賽</h3>`+poB.map((b,i)=>leagueGameCard(-1,i,true)).join("");
  const nav=`<div class="two">
    <button class="btn blk" data-act="schedule">🗓 完整賽程</button>
    <button class="btn blk" data-act="standings">📊 聯盟排名</button>
    <button class="btn blk" data-act="leaders">📈 球員排行</button>
    <button class="btn blk" data-act="records">📕 單場紀錄</button>
    <button class="btn blk" data-act="history">📜 遊戲紀錄</button>
    <button class="btn blk" data-act="exportCsv">⬇ 匯出逐場 CSV</button>
  </div>`;
  return `<div class="panel"><h2>🏟 劇空間　<span class="muted" style="font-size:13px">第 ${seasonNo()} 季</span></h2>
    <p class="muted">第 ${seasonNo()} 季　例行賽第 ${Math.min(se.day+1,se.schedule.length)} / ${se.schedule.length} 日。聯盟即時動態：每一天的每一場比賽都留存了內容，點開就能看。</p>
    <div class="hr"></div><h3>聯盟排名</h3>
    <table class="grid"><tr><th>#</th><th>球隊</th><th>戰績</th><th>勝率</th><th>勝差</th></tr>${srows}</table>
    ${paperBlock()}
    <div class="hr"></div><h3>最近賽事</h3>${games}
    <div class="hr"></div>${nav}
    <div class="hr"></div><button class="btn sm blk" data-act="backHub">← 回球季總部</button></div>`;
}
function leagueGameCard(di,gi,isPo){
  const b=isPo?((S.season.poBoxes||[])[gi]):((S.season.boxes||[])[di]||[])[gi];
  if(!b)return "";
  const me=S.season.playerTeam;
  const mine=b.aw===me||b.hm===me;
  const aw=getTeam(b.aw),hm=getTeam(b.hm);
  const winLabel=b.win?(b.win==="home"?hm.name:aw.name)+" 勝":"和局";
  const when=isPo?(b.st||"季後賽"):("第 "+(di+1)+" 日");
  return `<button class="gline ${mine?"me":""}" data-act="gameDetail" data-arg="${isPo?"p"+gi:di+","+gi}">
    <span class="gbadge">${teamBadge(b.aw)}</span><b class="sc">${b.a}</b><span class="muted">－</span><b class="sc">${b.h}</b><span class="gbadge">${teamBadge(b.hm)}</span>
    <span class="gmeta">${when} · ${winLabel}</span><span class="gmore">明細 ▸</span>
  </button>`;
}
/* ----- 單場明細 ----- */
function viewGameDetail(){
  const gd=S.gameDetail;
  if(!gd)return viewLeague();
  const box=gd.po!=null?((S.season.poBoxes||[])[gd.po]):((S.season.boxes||[])[gd.day]||[])[gd.i];
  const back=`<div class="panel"><button class="btn blk" data-act="gameDetailBack">← 返回</button></div>`;
  if(!box)return `<div class="panel"><h2>比賽明細</h2><p class="muted">此場比賽尚未留存內容（更新前已打完的場次）。</p></div>${back}`;
  return boxDetailHTML(box,gd)+back;
}
function teamHitsBy(box,tid){let n=0;for(const pid in (box.bat||{}))if(pid.indexOf(tid+"b")===0)n+=(box.bat[pid][1]||0);return n;}
function boxDetailHTML(box,gd){
  const aw=getTeam(box.aw),hm=getTeam(box.hm);
  const stage=box.st||"第 "+(gd.day+1)+" 日";
  const win=box.win==="home"?hm:box.win==="away"?aw:null;
  const head=`<div class="panel">
    <h2>${esc(stage)}　${teamBadge(box.aw)} ＠ ${teamBadge(box.hm)}</h2>
    <p class="center"><b class="bignum">${esc(aw.name)} ${box.a} － ${box.h} ${esc(hm.name)}</b></p>
    <p class="center">${win?`<b>${teamBadge(box.win==="home"?box.hm:box.aw)} ${esc(win.name)} 獲勝</b>`:'<span class="muted">和局收場</span>'}　·　<span class="muted">安打 ${teamHitsBy(box,box.aw)}：${teamHitsBy(box,box.hm)}</span></p>
    <div class="hr"></div>
    ${inningLineTable(box)}
  </div>`;
  const batPanel=`<div class="panel"><h2>打者成績</h2><div class="two">${boxBatTable(box,"aw")}${boxBatTable(box,"hm")}</div></div>`;
  const pitPanel=`<div class="panel"><h2>投手成績</h2><div class="two">${boxPitTable(box,"aw")}${boxPitTable(box,"hm")}</div></div>`;
  const dig=gameDigest(box);
  return head+batPanel+pitPanel+(dig?`<div class="panel"><h2>攻勢重點</h2>${dig}</div>`:"");
}
function inningLineTable(box){
  const a=box.line.aw||[],h=box.line.hm||[];
  const N=Math.max(a.length,h.length,1);
  let head="<tr><th></th>";
  for(let i=1;i<=N;i++)head+=`<th>${i}</th>`;
  head+="<th>R</th></tr>";
  const mk=(arr,score,tid)=>`<tr><td class="name">${teamBadge(tid)}</td>`+arr.slice(0,N).map(v=>`<td class="num">${v!=null?v:0}</td>`).join("")+`<td class="num"><b>${score}</b></td></tr>`;
  return `<table class="grid">${head}${mk(a,box.a,box.aw)}${mk(h,box.h,box.hm)}</table>`;
}
function boxBatTable(box,side){
  const tid=side==="aw"?box.aw:box.hm;
  const rows=Object.keys(box.bat).filter(pid=>pid.indexOf(tid+"b")===0).map(pid=>{
    const f=box.bat[pid],p=playerById(pid);
    return `<tr><td class="name">${esc(p?p.name:pid)}</td><td class="num">${f[0]}</td><td class="num">${f[1]}</td><td class="num">${f[2]}</td><td class="num">${f[3]}</td><td class="num">${f[4]}</td><td class="num">${f[5]}</td><td class="num">${f[6]}</td></tr>`;
  }).join("");
  return `<div><h3>${esc(getTeam(tid).name)}</h3><table class="grid"><tr><th>打者</th><th>打數</th><th>安打</th><th>全壘</th><th>打點</th><th>四壞</th><th>三振</th><th>得分</th></tr>${rows||`<tr><td colspan="8" class="muted">－</td></tr>`}</table></div>`;
}
function boxPitTable(box,side){
  const tid=side==="aw"?box.aw:box.hm;
  const rows=Object.keys(box.pit).filter(pid=>pid.indexOf(tid+"p")===0).map(pid=>{
    const f=box.pit[pid],p=playerById(pid);
    const cur=f[7]?' <span class="pill on">勝</span>':f[8]?' <span class="pill off">敗</span>':f[9]?' <span class="pill on">救</span>':"";
    return `<tr><td class="name">${esc(p?p.name:pid)}${cur}</td><td class="num">${fmtIP(f[0])}</td><td class="num">${f[1]}</td><td class="num">${f[2]}</td><td class="num">${f[3]}</td><td class="num">${f[4]}</td><td class="num">${f[5]}</td><td class="num">${f[6]}</td></tr>`;
  }).join("");
  return `<div><h3>${esc(getTeam(tid).name)}</h3><table class="grid"><tr><th>投手</th><th>局數</th><th>被安</th><th>失分</th><th>責失</th><th>四壞</th><th>三振</th><th>球數</th></tr>${rows||`<tr><td colspan="8" class="muted">－</td></tr>`}</table></div>`;
}
function gameDigest(box){
  const parts=[];
  const runsLine=side=>{
    const xs=[];
    (box.line[side]||[]).forEach((v,i)=>{if(v)xs.push(`${i+1}${side==="aw"?"上":"下"}+${v}`);});
    return xs;
  };
  const aRuns=runsLine("aw"),hRuns=runsLine("hm");
  if(aRuns.length||hRuns.length){
    const L=[];
    if(aRuns.length)L.push(`${esc(getTeam(box.aw).name)} ${aRuns.join("、")}`);
    if(hRuns.length)L.push(`${esc(getTeam(box.hm).name)} ${hRuns.join("、")}`);
    parts.push(`<p><span class="dlbl">得分過程</span>　${L.join("　／　")}</p>`);
  }
  const hrList=side=>Object.keys(box.bat).filter(pid=>pid.indexOf(box[side==="aw"?"aw":"hm"]+"b")===0).filter(pid=>box.bat[pid][2]>0).map(pid=>{const p=playerById(pid);return `${esc(p?p.name:pid)} ${box.bat[pid][2]}轟`;});
  const hr=[...hrList("aw"),...hrList("hm")];
  if(hr.length)parts.push(`<p><span class="dlbl">全壘打</span>　${hr.join("、")}</p>`);
  const pitOf=side=>{
    const tid=box[side==="aw"?"aw":"hm"];
    const ps=Object.keys(box.pit).filter(pid=>pid.indexOf(tid+"p")===0);
    const nm=pid=>{const p=playerById(pid);return p?esc(p.name):pid;};
    const w=ps.find(pid=>box.pit[pid][7]>0),l=ps.find(pid=>box.pit[pid][8]>0),sv=ps.find(pid=>box.pit[pid][9]>0);
    return [(w?"勝投 "+nm(w):""),(l?"敗投 "+nm(l):""),(sv?"救援 "+nm(sv):"")].filter(Boolean).join("　");
  };
  const pi=[pitOf("aw"),pitOf("hm")].filter(Boolean).join("　");
  if(pi)parts.push(`<p><span class="dlbl">勝敗</span>　${pi}</p>`);
  return parts.join("");
}

/* ----- 賽程 ----- */
function viewSchedule(){
  const s=S.season;
  const days=s.schedule.map((day,i)=>{
    const games=day.map((g,gi)=>{
      const isMine=g.away===s.playerTeam||g.home===s.playerTeam;
      let sc="－ vs －";
      if(g.played){const cs=gameScore(g);sc=`${cs.a} : ${cs.h}`;}
      return `<tr class="${isMine?"me":""}${g.played?" clickable":""}" ${g.played?`data-act="gameDetail" data-arg="${i},${gi}" title="查看比賽明細"`:""}><td class="name">${teamBadge(g.away)}</td>
        <td class="num">@</td><td class="name">${teamBadge(g.home)}</td>
        <td class="num">${g.played?sc:"未開打"}${g.played?' <span class="muted">▸</span>':""}</td></tr>`;
    }).join("");
    const state=i<s.day?"結束":i===s.day?"今日":"未定";
    return `<h3>第 ${i+1} 日 <span class="pill ${i===s.day?"on":"off"}">${state}</span></h3>
      <table class="grid"><tr><th>客隊</th><th></th><th>主隊</th><th>比數</th></tr>${games}</table>`;
  }).join("");
  return `<div class="panel"><h2>賽程表</h2>${days}
    <div class="hr"></div><button class="btn blk" data-act="backHub">← 回球季總部</button></div>`;
}

/* ----- 排名 ----- */
function viewStandings(){
  const st=standingsList();
  const rows=st.map((x,i)=>{
    const cls=x.id===S.season.playerTeam?"me":"";
    return `<tr class="${cls}"><td>${i+1}${i===0?' <span class="rank1">★</span>':""}</td>
      <td class="name">${teamBadge(x.id)}</td><td class="num">${x.w}</td><td class="num">${x.l}</td>
      <td class="num">${x.t}</td><td class="num">${fmtAvg(x.pct)}</td><td class="num">${x.rs}</td><td class="num">${x.ra}</td></tr>`;
  }).join("");
  return `<div class="panel"><h2>聯盟排名</h2>
    <table class="grid"><tr><th>#</th><th>球隊</th><th>勝</th><th>敗</th><th>和</th><th>勝率</th><th>得分</th><th>失分</th></tr>${rows}</table>
    <div class="hr"></div><button class="btn blk" data-act="backHub">← 回球季總部</button></div>`;
}

/* ----- 球員排行 ----- */
/* 入榜門檻：依本季已賽場數動態調整，避免小樣本刷榜 */
function leadersQualify(){
  const gp=Math.min((S.season&&S.season.day)||0,(S.season.schedule||[]).length);
  return {
    gp,
    bat: Math.max(3,Math.ceil(gp*0.8)),          // 野手：須達到約 80% 出賽場次
    pit: Math.max(3,gp>=10?5:3),                 // 投手：明顯提升門檻，避免打沒幾場就領獎
    eraOuts: Math.min(40,Math.max(12,gp*3))      // 防禦率：較高局數門檻
  };
}
function leadersList(kind){
  const ps=S.season.playerStats;
  const q=leadersQualify();
  if(kind==="era"||kind==="w"||kind==="k"||kind==="sv"){
    const arr=[];
    for(const pid in ps.pit){const s=ps.pit[pid],p=playerById(pid);if(p&&(s.g||0)>=q.pit)arr.push({p,pid,s});}
    if(kind==="era")return arr.filter(x=>(x.s.outs||0)>=q.eraOuts).sort((a,b)=>(a.s.er*27/a.s.outs)-(b.s.er*27/b.s.outs)).map(x=>({...x,val:fmtERA(x.s.er,x.s.outs)}));
    if(kind==="w") return arr.sort((a,b)=>b.s.w-a.s.w||b.s.k-a.s.k).map(x=>({...x,val:x.s.w+" 勝"}));
    if(kind==="k") return arr.sort((a,b)=>b.s.k-a.s.k).map(x=>({...x,val:x.s.k}));
    return arr.sort((a,b)=>b.s.sv-a.s.sv).map(x=>({...x,val:x.s.sv}));
  }
  const arr=[];
  for(const pid in ps.bat){const s=ps.bat[pid],p=playerById(pid);if(p&&(s.g||0)>=q.bat)arr.push({p,pid,s});}
  const minAB=5;
  switch(kind){
    case "hr": return arr.sort((a,b)=>b.s.hr-a.s.hr).map(x=>({...x,val:x.s.hr}));
    case "rbi":return arr.sort((a,b)=>b.s.rbi-a.s.rbi).map(x=>({...x,val:x.s.rbi}));
    case "h":  return arr.sort((a,b)=>b.s.h-a.s.h).map(x=>({...x,val:x.s.h}));
    case "sb": return arr.sort((a,b)=>b.s.sb-a.s.sb).map(x=>({...x,val:x.s.sb}));
    case "r":  return arr.sort((a,b)=>b.s.r-a.s.r).map(x=>({...x,val:x.s.r}));
    default:   return arr.filter(x=>x.s.ab>=minAB).sort((a,b)=>(b.s.h/b.s.ab)-(a.s.h/a.s.ab)).map(x=>({...x,val:fmtAvg(x.s.h/x.s.ab)}));
  }
}
function viewLeaders(){
  const cat=S.leadCat||"avg";
  const cats=[["avg","打擊率"],["hr","全壘打"],["rbi","打點"],["h","安打"],["sb","盜壘"],["r","得分"],["era","防禦率"],["w","勝投"],["k","三振"],["sv","救援"]];
  const q=leadersQualify();
  const list=leadersList(cat).slice(0,15);
  const rows=list.map((x,i)=>{
    const tid=x.pid.replace(/[bp]\d+$/,"");
    const team=getTeam(tid);
    const isMine=tid===S.season.playerTeam;
    return `<tr class="${isMine?"me":""}"><td>${i+1}</td><td class="name">${esc(x.p.name)}</td>
      <td class="name"><span class="swatch" style="background:${team.c1}"></span>${esc(team.short)}</td>
      <td>${esc(x.p.posLabel||x.p.role)}</td><td class="num">${x.s.g||0}</td><td class="num" style="font-weight:700">${x.val}</td></tr>`;
  }).join("");
  const tabs=cats.map(c=>`<button class="btn sm ${c[0]===cat?"gold":""}" data-act="leadCat" data-arg="${c[0]}">${c[1]}</button>`).join("");
  const isPitCat=(cat==="era"||cat==="w"||cat==="k"||cat==="sv");
  const qualifyNote=isPitCat
    ? `投手需出賽滿 <b>${q.pit}</b> 場${cat==="era"?`、且投滿 <b>${fmtIP(q.eraOuts)}</b> 局`:""}`
    : `野手需出賽滿 <b>${q.bat}</b> 場${cat==="avg"?"、且滿 5 打數":""}`;
  const empty=`<tr><td colspan="6" class="muted">尚無符合資格的資料（本季已賽 ${q.gp} 場）。請先打完更多比賽。</td></tr>`;
  return `<div class="panel"><h2>球員排行</h2>
    <div class="actions">${tabs}</div>
    <table class="grid"><tr><th>#</th><th>球員</th><th>球隊</th><th>位置</th><th>出賽</th><th>成績</th></tr>${rows||empty}</table>
    <div class="muted" style="font-size:11px;margin-top:6px">入榜門檻隨賽程調整：${qualifyNote}。本季已賽 ${q.gp} 場；黃底為你的球員。</div>
    <div class="hr"></div>
    <button class="btn blk" data-act="backHub">← 回球季總部</button></div>`;
}

/* ----- 說明 ----- */
function viewHelp(){
  return `<div class="panel help">
    <h2>遊戲說明</h2>
    <dl>
      <dt>■ 玩法概要</dt>
      <dd>你率領一支球團打 ${(TEAM_DEFS.length-1)*2} 場例行賽（共 ${TEAM_DEFS.length} 隊）。每場比賽為經典 9 局（例行賽延長至 12 局，仍平手則和局；季後賽則延長至分出勝負）。你在自己的進攻與守備回合下達戰術，電腦對手也會見招拆招。得點、全壘打與三振會有熱血的字幕演出與音效，投手球速也會即時顯示。</dd>
      <dt>■ 打擊戰術</dt>
      <dd><b>正常揮擊</b>：穩定。<b>強力揮擊</b>：長打與全壘打大增，但三振也變多。<b>耐心等球</b>：拉高保送，安打率略降。<b>犧牲短打</b>：護送跑者推進，打者多數出局。<b>打帶跑</b>：跑者提前起跑，靠安打多搶壘，但打者揮空時跑者可能被觸殺。</dd>
      <dt>■ 守備／配球</dt>
      <dd><b>全力投球</b>：三振率高，但保送、全壘打風險與體力消耗都增加。<b>控球至上</b>：壓低保送。<b>邊邊角角</b>：製造滾地球。<b>引誘球</b>：增加三振也增加保送。<b>故意四壞</b>：直接保送，避免硬拚強打。</dd>
      <dt>■ 跑壘與調度</dt>
      <dd><b>盜壘</b>：以跑者速度挑戰捕手。<b>代打</b>：換上替補野手。<b>換投手</b>：從牛棚派上後援投手。</dd>
      <dt>■ 加速遊玩</dt>
      <dd>不想每一球都下指令時，可用「自動完成本局」或「快速模擬全場」。</dd>
      <dt>■ 選手能力</dt>
      <dd>主選單的「🧮 選手能力」可看全聯盟各隊球員的能力數值（打者：打擊、力量、選球、速度、守備；投手：球速、控球、變化、體力），也能切換球隊偵察對手，或切到「🌐 全聯盟」跨隊比較。可用按鈕<b>依能力或年齡排序</b>、<b>依守位篩選</b>，以及<b>只顯示先發／替補</b>。比賽畫面中，目前打者與投手的數值也會即時以長條圖顯示。點球員名字可開啟個人資料卡。</dd>
      <dt>■ 年齡與成長</dt>
      <dd>每位球員都有年齡。欄位中的箭頭是年齡趨勢：<b style="color:#1f8f4a">▲ 成長期</b>（22 歲以下，能力易上升）、<b>– 巔峰</b>、<b style="color:#b5533a">▼ 衰退期</b>（34 歲以上，能力易下滑）。每當你打完一季並<b>開始新球季</b>，全聯盟球員會 +1 歲並成長／老化；39 歲以上退休，缺口由<b>新人選秀</b>補上。成長結果會自動保存在瀏覽器，跨球季累積。</dd>
      <dt>■ 成績與排行</dt>
      <dd>「陣容與成績」看你的球員逐人累計；「球員排行」看全聯盟的打擊率、全壘打、打點、安打、盜壘、得分、防禦率、勝投、三振、救援前十五名，榜上會顯示<b>出賽場數</b>。<b>季後賽期間</b>同樣可從總部開啟這些排行與名冊。「單場紀錄」則保存本季與史上（含季後賽）的單場最高紀錄，如單場全壘打、打點、奪三振與最長比賽。為避免小樣本刷榜，入榜需達<b>出賽門檻</b>（隨賽程調整：野手約需半數出賽、投手需 1～2 場，打擊率另需 5 打數、防禦率另需最多 5 局）。其他球團的比賽以快速模擬進行，也會產生個人成績。</dd>
      <dt>■ 單場英雄</dt>
      <dd>每場比賽結束會選出「Player of the Game」，頒給此役表現最亮眼的球員，並顯示於賽後結果畫面。</dd>
      <dt>■ 遊戲紀錄</dt>
      <dd>從標題畫面或球季總部的「📜 遊戲紀錄」可回顧三種紀錄：<b>逐場賽果</b>（本季每場比賽的對戰與比數）、<b>跨季生涯</b>（每一季的戰績、名次與總冠軍）與<b>生涯里程碑</b>（跨季累計的全壘打、安打、三振、勝投等前 10 名）。</dd>
      <dt>■ 個人獎項</dt>
      <dd>整個球季（含季後賽）結束後，會舉行<b>頒獎典禮</b>：最優秀選手（MVP）、最佳投手、新人王，以及打擊王／全壘打王／打點王／盜壘王／得分王、防禦率王／勝投王／三振王／救援王。可從總部開啟「🏆 頒獎典禮」查看。</dd>
      <dt>■ 新人選秀</dt>
      <dd>球季結束、有球員退休（39 歲以上）時，會展開<b>新人選秀</b>：依例行賽戰績由差到佳決定指名順序，輪到你的球團時可從 4 名候補中指名 1 人補強，其他球團會自動挑選。選進的新人會成為下一季的戰力。</dd>
      <dt>■ 季後賽</dt>
      <dd>例行賽結束後，由<b>前四名</b>晉級季後賽。先打<b>準決賽（1 對 4、2 對 3，3 戰 2 勝）</b>，勝隊再打<b>冠軍戰（5 戰 3 勝）</b>。較高種子擁有較多主場（依系列賽的第 1、3、5 戰在高種子主場）。你的球隊的系列賽可用即時戰術或快速模擬進行；其他對戰會自動模擬。季後賽戰績<b>不列入例行賽排名</b>，打完總冠軍後頒獎並展開新人選秀，接著才結算年齡成長。</dd>
      <dt>■ 存檔</dt>
      <dd>每場比賽結束會自動存入瀏覽器（localStorage）。主選單可「繼續球季」。</dd>
    </dl>
    <div class="hr"></div>
    <button class="btn blk" data-act="${S.season?"backHub":"toTitle"}">← 返回</button>
  </div>`;
}
