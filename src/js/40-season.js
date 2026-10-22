/* ---------- 球季 ---------- */
function roundRobin(ids){
  const n=ids.length,rounds=[];
  let arr=ids.slice();
  for(let r=0;r<n-1;r++){
    const pairs=[];
    for(let i=0;i<n/2;i++)pairs.push([arr[i],arr[n-1-i]]);
    rounds.push(pairs);
    const fixed=arr[0],rest=arr.slice(1);rest.unshift(rest.pop());arr=[fixed].concat(rest);
  }
  return rounds;
}
/* 球季長度：每隊對戰幾輪（8 隊主客場各一輪 = 7 天，×3 = 21 天）
   輪次越多，樣本越大，評比（獎項／排行榜／王座）才不會被小樣本噪音左右。
   管理者可在「管理者專用」調整輪數（2=14天、3=21天、4=28天）。 */
const SEASON_ROUNDS=3;
function makeSchedule(){
  const ids=TEAM_DEFS.map(t=>t.id);
  const first=roundRobin(ids);
  const days=[];
  const rounds=Math.max(1,Number(cfg('seasonRounds'))||SEASON_ROUNDS);
  for(let pass=0;pass<rounds;pass++){
    first.forEach((round,r)=>{
      // 每輪把主客對調，讓同一組對戰在多輪之間主場次數接近（3 輪時為 2:1）
      const swap=((pass+r)%2===1);
      days.push(round.map(p=>swap?{away:p[0],home:p[1],played:false,score:null}:{away:p[1],home:p[0],played:false,score:null}));
    });
  }
  return days;
}
function teamStrength(id){
  const t=getTeam(id);
  const off=avg(t.batters.slice(0,9).map(b=>b.meet*0.6+b.power*0.4));
  const def=avg(t.pitchers.map(p=>p.control*0.4+p.breaking*0.3+p.velocity*0.3));
  return {off,def};
}
function quickSim(aId,bId){
  const a=teamStrength(aId),b=teamStrength(bId);
  const exp=cfg('runExp');
  const lamA=clamp(exp*Math.pow(a.off/b.def,0.6)*rf(0.8,1.2),0.6,12);
  const lamB=clamp(exp*Math.pow(b.off/a.def,0.6)*rf(0.8,1.2),0.6,12);
  let sa=poisson(lamA),sb=poisson(lamB),x=0;
  while(sa===sb&&x<6){if(chance(0.5))sa++;else sb++;x++;}
  return {a:sa,b:sb};
}
function gameScore(g){const s=g&&g.score;if(!s)return {a:0,h:0};return {a:s.a||0,h:(s.h!=null?s.h:(s.b!=null?s.b:0))};}
function applyRecord(awayId,homeId,ra,rh){
  const r=S.season.records;
  [awayId,homeId].forEach(id=>{if(!r[id])r[id]={w:0,l:0,t:0,rs:0,ra:0};});
  r[awayId].rs+=ra;r[awayId].ra+=rh;r[homeId].rs+=rh;r[homeId].ra+=ra;
  if(ra>rh){r[awayId].w++;r[homeId].l++;}
  else if(rh>ra){r[homeId].w++;r[awayId].l++;}
  else{r[awayId].t++;r[homeId].t++;}
}
function synthBatting(teamId,runs){
  const t=getTeam(teamId);
  const form=rollForm();                                   // beta D3a：當日手感（全隊共通）影響安打產出
  const fm=form==="good"?1.10:form==="bad"?0.90:1;
  // 先發 9 人，並隨機讓 0~2 名替補代打上場（讓替補在模擬比賽也有上場機會）
  const roster=t.batters.slice(0,9).slice();
  const bench=t.batters.filter(x=>x.bench);
  const subN=bench.length?ri(0,2):0;
  for(let i=0;i<subN&&bench.length;i++)roster.push(bench.splice(ri(0,bench.length-1),1)[0]);
  const ps=roster.map(p=>({pid:p.id,ab:p.bench?ri(1,2):ri(3,5),h:0,hr:0,rbi:0,bb:0,k:0,r:0,sb:0}));
  const totalAB=ps.reduce((a,x)=>a+x.ab,0);
  const H=clamp(Math.round((runs*cfg('hitRatio')+4.6+rf(-1.5,1.5))*fm),runs,Math.min(15,totalAB));
  const powW=roster.map(p=>Math.pow(Math.max(1,p.power-30),2));
  let hr=clamp(Math.round(runs*rf(0.12,0.45)),0,runs);
  hr=Math.min(hr,H);
  for(let i=0;i<hr;i++){let idx=weightedIndex(powW),tries=0;while(ps[idx].h>=ps[idx].ab&&tries<9){idx=weightedIndex(powW);tries++;}ps[idx].hr++;ps[idx].h++;}
  const w=roster.map(p=>0.8+Math.max(0,p.meet-40)*0.008+Math.max(0,p.power-40)*0.003+Math.max(0,(p.mentality||50)-55)*0.004);   // 膽識高的打者整體產出略好（beta D3c）
  const add=splitInt(H-hr,w);
  let extra=0;
  ps.forEach((x,i)=>{const room=Math.max(0,x.ab-x.h);const give=Math.min(add[i],room);x.h+=give;extra+=add[i]-give;});
  while(extra>0){const i=weightedIndex(w);if(ps[i].h<ps[i].ab){ps[i].h++;extra--;}else break;}
  const rw=roster.map(p=>0.8+Math.max(0,p.meet-40)*0.006+Math.max(0,p.speed-40)*0.004);
  const rs=splitInt(runs,rw);ps.forEach((x,i)=>x.r+=rs[i]);
  const wr=roster.map(p=>0.8+Math.max(0,p.power-40)*0.01+Math.max(0,p.meet-40)*0.004);
  const rbi=splitInt(runs,wr);ps.forEach((x,i)=>x.rbi+=rbi[i]);
  const bbT=ri(1,5);for(let i=0;i<bbT;i++)ps[weightedIndex(roster.map(p=>p.eye))].bb++;
  const kT=ri(4,11);for(let i=0;i<kT;i++)ps[weightedIndex(roster.map(p=>Math.max(1,110-p.meet)))].k++;
  const sbT=ri(0,3);for(let i=0;i<sbT;i++)ps[weightedIndex(roster.map(p=>Math.max(1,p.speed-48)))].sb++;
  /* 指定打擊：DH 不守備，整場都留在打線上，所以這一場的數字就是他的 DH 數字 */
  const dhIdx=dhSlotOf(teamId);
  if(dhIdx>=0&&dhIdx<ps.length){
    const x=ps[dhIdx];
    x.dh=(x.ab||0)+(x.bb||0);
    x.dhAb=x.ab||0;x.dhH=x.h||0;x.dhHr=x.hr||0;x.dhRbi=x.rbi||0;x.dhBb=x.bb||0;
  }
  return ps;
}
function synthPitching(teamId,runsAllowed,oppHits,won,close){
  const t=getTeam(teamId);
  const sp=t.pitchers.filter(p=>p.starter),rp=t.pitchers.filter(p=>!p.starter);
  const starter=sp[ri(0,sp.length-1)];
  const outs=Math.min(27,ri(Math.max(3,cfg('pitOutsMin')),Math.max(cfg('pitOutsMin')+1,cfg('pitOutsMax'))));
  const rest=27-outs;
  const starterLine={pid:starter.id,outs:outs,h:Math.round(oppHits*0.68),r:Math.round(runsAllowed*0.72),er:Math.round(runsAllowed*0.68),bb:ri(0,4),k:ri(3,9),pp:outs*ri(3,4),w:0,l:0,sv:0};
  const list=[starterLine];
  let relLine=null;
  if(rest>0){
    const rel=rp.length?rp[ri(0,rp.length-1)]:starter;
    relLine={pid:rel.id,outs:rest,h:Math.max(0,oppHits-starterLine.h),r:Math.max(0,runsAllowed-starterLine.r),er:Math.max(0,runsAllowed-starterLine.er),bb:ri(0,2),k:ri(1,4),pp:rest*ri(3,4),w:0,l:0,sv:0};
    list.push(relLine);
  }
  const last=list[list.length-1];
  /* 勝投：先發投滿 5 局（15 出局）且球隊贏球時，勝投記在先發身上（真實棒球規則）；
     沒投滿 5 局才記給最後一位投手。
     舊版一律記給後援，導致 AI 球隊的先發投手整季拿不到勝投，勝場加權的獎項（最佳投手）失真。 */
  if(won){
    if(starterLine.outs>=15) starterLine.w=1;
    else last.w=1;
    if(close&&relLine&&relLine.outs>=3&&relLine.outs<9) relLine.sv=1;
  }
  else starterLine.l=1;
  return list;
}
function synthGameStats(awayId,homeId,ra,rh,merge){
  const margin=Math.abs(ra-rh);
  const awayBat=synthBatting(awayId,ra), homeBat=synthBatting(homeId,rh);
  const awayPit=synthPitching(awayId,rh,homeBat.reduce((a,x)=>a+x.h,0),rh<ra,margin<=3);
  const homePit=synthPitching(homeId,ra,awayBat.reduce((a,x)=>a+x.h,0),ra<rh,margin<=3);
  if(merge!==false){
    awayBat.forEach(s=>mergeBatLine(s.pid,s));
    homeBat.forEach(s=>mergeBatLine(s.pid,s));
    awayPit.forEach(s=>mergePitLine(s.pid,s));
    homePit.forEach(s=>mergePitLine(s.pid,s));
  }
  return {away:{bat:awayBat,pit:awayPit},home:{bat:homeBat,pit:homePit}};
}
/* ---------- 逐場 box（精簡數字陣列，節省存取空間） ---------- */
const BOX_BAT=["ab","h","hr","rbi","bb","k","r","sb"];
const BOX_PIT=["outs","h","r","er","bb","k","pp","w","l","sv"];
function packBat(s){return BOX_BAT.map(k=>s[k]||0);}
function packPit(s){return BOX_PIT.map(k=>s[k]||0);}
/* 模擬比賽的該隊逐局得分分布（產生後即存入，不需可重現） */
function synthInnings(runs){
  const line=new Array(9).fill(0);
  if(runs<=0)return line;
  const n=Math.max(1,Math.min(runs,ri(1,2)+(runs>3?1:0)+(runs>6?1:0)));
  const pool=[0,1,2,3,4,5,6,7,8],picks=[];
  for(let i=0;i<n&&pool.length;i++)picks.push(pool.splice(ri(0,pool.length-1),1)[0]);
  let left=runs;
  while(left>0){line[picks[ri(0,picks.length-1)]]++;left--;}
  return line;
}
/* 玩家實際比賽 → box */
function boxFromMatch(m){
  const cBat={},cPit={};
  for(const pid in m.stats)cBat[pid]=packBat(m.stats[pid]);
  for(const pid in m.pstats)cPit[pid]=packPit(m.pstats[pid]);
  if(m.winner){
    const wId=m.starters[m.winner].id;
    const lId=m.starters[m.winner==="home"?"away":"home"].id;
    const wl=cPit[wId]||(cPit[wId]=packPit({}));
    wl[7]=1;
    const ll=cPit[lId]||(cPit[lId]=packPit({}));
    ll[8]=1;
  }
  return {
    st:m.po?(m.po.stage==="semi"?"準決賽":"冠軍戰"):"",
    aw:m.awayId,hm:m.homeId,a:m.score.away,h:m.score.home,
    line:{aw:m.line.away.slice(0,12),hm:m.line.home.slice(0,12)},
    e:{aw:m.errs.away,hm:m.errs.home},
    bat:cBat,pit:cPit,win:m.winner,
    sp:{away:m.starters.away.id,home:m.starters.home.id}
  };
}
/* 模擬比賽 → box（L 為 synthGameStats 的回傳，st 為季後賽標籤） */
function boxFromSim(awayId,homeId,r,L,st){
  const cBat={},cPit={};
  L.away.bat.forEach(s=>cBat[s.pid]=packBat(s));
  L.home.bat.forEach(s=>cBat[s.pid]=packBat(s));
  L.away.pit.forEach(s=>cPit[s.pid]=packPit(s));
  L.home.pit.forEach(s=>cPit[s.pid]=packPit(s));
  return {
    st:st||"",
    aw:awayId,hm:homeId,a:r.a,h:r.b,
    line:{aw:synthInnings(r.a),hm:synthInnings(r.b)},
    e:{aw:ri(0,2),hm:ri(0,2)},
    bat:cBat,pit:cPit,win:r.a>r.b?"away":r.b>r.a?"home":null,
    sp:{away:(L.away.pit[0]&&L.away.pit[0].pid)||"",home:(L.home.pit[0]&&L.home.pit[0].pid)||""}
  };
}
function mergePlayerStats(m,tgt){
  if(!S.season.playerStats)S.season.playerStats={bat:{},pit:{}};
  const ps=tgt||S.season.playerStats;
  for(const pid in m.stats)mergeBatLine(pid,m.stats[pid],ps);
  for(const pid in m.pstats)mergePitLine(pid,m.pstats[pid],ps);
  /* 勝敗投手／救援成功（照真實棒球規則）
     ① 勝投：先發投滿 5 局（15 出局）且退場時領先 → 勝投記在先發身上；
             否則記給投手對（最後投到完場的那位）。
     ② 救援成功：獲勝方最後一位是後援、而且他「不是」勝投投手（同一場不能兩者兼得），
        且至少抓下 1 個出局數，並符合：
          情境A：上場時領先 1~3 分並守到終場
          情境C：有效投球滿 3 局（9 出局）以上
          情境B（近似）：9 局以後平手／落後上場而球隊獲勝 */
  if(m.winner){
    const wSide=m.winner,lSide=wSide==="home"?"away":"home";
    const pp=ps.pit;
    const curOf=side=>((m.pitchers&&m.pitchers[side]&&m.pitchers[side].obj)||m.starters[side]);
    // ① 勝投
    const wStarter=m.starters[wSide];
    const sw=(m.swapInfo&&m.swapInfo[wSide])||null;
    const wId=(sw&&sw.outs>=15&&sw.lead>0)?wStarter.id:curOf(wSide).id;
    if(pp[wId])pp[wId].w=(pp[wId].w||0)+1;
    const lId=curOf(lSide).id;
    if(pp[lId])pp[lId].l=(pp[lId].l||0)+1;
    // ② 救援成功（和勝投互斥）
    const wc=curOf(wSide);
    if(wc&&!wc.starter&&wc.id!==wId&&pp[wc.id]){
      const outs=(m.pstats[wc.id]&&m.pstats[wc.id].outs)||0;
      const lead=(m.pitchers[wSide].cameInLead||0);
      const inn=(m.pitchers[wSide].cameInInn||0);
      const svOK=outs>=1&&((lead>=1&&lead<=3)||outs>=9||(lead<=0&&inn>=9));
      if(svOK)pp[wc.id].sv=(pp[wc.id].sv||0)+1;
    }
  }
}
/* 季後賽球員成績：獨立累計，不寫入例行賽 playerStats／排行榜 */
function mergePoStats(m){
  const se=S.season;
  if(!se.poPlayerStats)se.poPlayerStats={bat:{},pit:{}};
  mergePlayerStats(m,se.poPlayerStats);
}
function processGameEnd(m){
  if(m._processed)return;m._processed=true;
  if(m.po){recordPlayoffResult(m);return;}   // 季後賽：只更新籤表，不動例行賽排名
  m.hero=gameHero(m);
  const day=S.season.schedule[m.dayIndex];
  const g=day.find(x=>x.away===m.awayId&&x.home===m.homeId);
  if(g){g.played=true;g.score={a:m.score.away,h:m.score.home};}
  applyRecord(m.awayId,m.homeId,m.score.away,m.score.home);
  mergePlayerStats(m);
  const when="第"+(m.dayIndex+1)+"日";
  checkMatchRecords(m,when);
  logGame(m.dayIndex+1,"",m.awayId,m.homeId,m.score.away,m.score.home);
  const boxes=S.season.boxes||(S.season.boxes=[]);
  boxes[m.dayIndex]=boxes[m.dayIndex]||[];
  if(g)boxes[m.dayIndex][day.indexOf(g)]=boxFromMatch(m);
  day.forEach((x,i)=>{
    if(x.played)return;
    const r=quickSim(x.away,x.home);
    x.played=true;x.score={a:r.a,h:r.b};
    applyRecord(x.away,x.home,r.a,r.b);
    logGame(m.dayIndex+1,"",x.away,x.home,r.a,r.b);
    const L=synthGameStats(x.away,x.home,r.a,r.b);
    boxes[m.dayIndex][i]=boxFromSim(x.away,x.home,r,L,"");
    checkLineRecords(L.away,x.away,when);
    checkLineRecords(L.home,x.home,when);
    checkSimTeamRecords(x.away,x.home,r.a,r.b,when);
  });
  checkInningRecords(m.dayIndex,when);   // 單局團隊得分（當日全部 box 含實戰場）
  recordPitchLoad(m.dayIndex,(S.season.boxes||[])[m.dayIndex]);   // beta D2b：記錄本日用球數供明日連投判定
  /* 特殊事蹟與生涯里程碑（本日全部打完後結算） */
  let special="";
  (boxes[m.dayIndex]||[]).forEach(b=>{
    const d=b&&recordNoHitter(b,"第"+(m.dayIndex+1)+"日");
    if(d&&d.team===S.season.playerTeam)special="★ "+NH_LABELS[d.kind]+"！"+getTeam(d.team).name+" 投手群寫下紀錄";
  });
  const miles=checkMilestones();
  if(!special&&miles.length)special="★ "+milestoneText(miles[0],miles[0].pid)+(miles.length>1?"　（本日共 "+miles.length+" 項）":"");
  if(special){
    const se=S.season;se.news=se.news||[];
    se.news.push({day:m.dayIndex+1,text:special,special:true});
    if(se.news.length>5)se.news.shift();
    if(!S.flash)S.flash=special;
  }
  buildDayPaper(m.dayIndex);
  S.season.day++;
  updateStreakBest();   // 每日更新隊史最長連勝／連敗
  leagueNews(m.dayIndex);
  if(S.season.day>=Math.floor(S.season.schedule.length/2)&&!S.season.asNotified){
    S.season.asNotified=true;
    if(cfg('allStar')!==0){
      if(!S.flash)S.flash="★ 明星賽週到了！紅藍名單已自動生成";
      ensureAllstarRoster();  // 自動生成明星賽名單
    }
  }
  if(S.season.day>=S.season.schedule.length)ensurePlayoff();  // 例行賽結束 → 建立季後賽籤表
  saveGame();
}
/* 每日聯盟快報：首位攻防與你的排名變動 */
function leagueNews(dayIdx){
  const se=S.season;
  const st=standingsList();
  const top=st[0],second=st[1];
  const my=se.playerTeam;
  const myRank=st.findIndex(x=>x.id===my)+1;
  const prev=se.prevMyRank;
  let line="";
  if(prev!==undefined&&prev<9){
    if(myRank<prev)line=`◎ 你的${getTeam(my).name}升至第 ${myRank} 名！`;
    else if(myRank>prev)line=`◎ 你的${getTeam(my).name}滑落至第 ${myRank} 名…`;
  }
  if(!line&&myRank===1)line=`◎ 你的${getTeam(my).name}攻佔/續保首位！`;
  if(!line&&second){
    const gap=Number(second.gb);
    if(gap!=null&&gap<=1.0)line=`◎ ${dayIdx+1}日終了：首位 ${getTeam(top.id).name}，第2名 ${getTeam(second.id).name} 僅差 ${gap} 場！`;
    else line=`◎ ${dayIdx+1}日終了：首位 ${getTeam(top.id).name}（${top.w}勝）`;
  }
  if(!line)line=`◎ ${dayIdx+1}日終了：首位 ${getTeam(top.id).name}（${top.w}勝）`;
  se.news=se.news||[];se.news.push({day:dayIdx+1,text:line});
  if(se.news.length>5)se.news.shift();
  se.prevMyRank=myRank;
  if(!S.flash)S.flash=line;
}
