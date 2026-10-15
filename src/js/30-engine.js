/* ---------- 投打數據模型 ---------- */
const OFF_MODS={
  normal:{k:1,hr:1,xbh:1,hit:1,bb:1},
  power:{k:1.35,hr:1.85,xbh:1.35,hit:0.90,bb:0.90},
  take:{k:1.22,hr:0.80,xbh:0.85,hit:0.88,bb:1.55},
  hitrun:{k:1.15,hr:1.05,xbh:1.05,hit:1.06,bb:0.85}
};
const DEF_MODS={
  power:{k:1.24,hr:1.25,hit:0.90,bb:1.28,hbp:1.15,fat:1.7},
  control:{k:0.85,hr:1.05,hit:1.10,bb:0.55,hbp:0.9,fat:1.0},
  corner:{k:1.05,hr:0.90,hit:0.90,bb:1.12,hbp:1.0,fat:1.2,ground:1.3},
  chase:{k:1.18,hr:0.82,hit:1.00,bb:1.30,hbp:1.0,fat:1.15}
};
const OFF_NAME={normal:"正常揮擊",power:"強力揮擊",take:"耐心等球",bunt:"犧牲短打",hitrun:"打帶跑"};
const DEF_NAME={power:"全力投球",control:"控球至上",corner:"邊邊角角",chase:"引誘球",ibb:"故意四壞"};

function pitcherEffective(p,pitches,cond){
  const thr=42+p.stamina*0.62;
  let f=1;
  if(pitches>thr) f=clamp(1-(pitches-thr)*0.0032,0.70,1);
  const cm=cond==="good"?1.06:cond==="bad"?0.94:1;   // 調子：beta 新增
  return {velocity:p.velocity*f*cm,control:p.control*(0.86+0.14*f)*cm,breaking:p.breaking*f*cm,fatigue:f,cond:cond||"normal"};
}
/* 當日調子：好調 20%／普通 60%／不調 20% */
function rollCond(){const r=Math.random();return r<0.2?"good":r<0.8?"normal":"bad";}
const COND_LABEL={good:'<b style="color:#4fd39a">▲好調</b>',normal:'<span class="muted">－普通</span>',bad:'<b style="color:#e06782">▼不調</b>'};
/* 取守備方有效投球狀態（含調子） */
function effOf(m,side){const P=m.pitchers[side];return pitcherEffective(P.obj,P.pitches,P.cond||"normal");}
const m_=(v,ref,k)=>Math.exp((v-ref)*k);
const inv=(v,ref,k)=>1/m_(v,ref,k);
function paOutcome(batter,eff,offT,defT){
  const om=OFF_MODS[offT]||OFF_MODS.normal, dm=DEF_MODS[defT]||DEF_MODS.control;
  const kAb=eff.velocity*0.45+eff.breaking*0.55;
  const supp=eff.breaking*0.6+eff.velocity*0.4;
  const ctl=eff.control;
  let pK =0.178*m_(kAb,60,1/60)*inv(batter.meet,60,1/55)*om.k*dm.k;
  let pBB=0.090*m_(batter.eye,60,1/70)*inv(ctl,60,1/60)*om.bb*dm.bb;
  let pHBP=0.010*(dm.hbp||1);
  let pHR=0.032*m_(batter.power,60,1/55)*inv(supp,60,1/55)*om.hr*dm.hr;
  let p3B=0.007*m_(batter.speed,60,1/80)*om.xbh*dm.hit;
  let p2B=0.058*m_(batter.power,58,1/70)*inv(supp,60,1/64)*om.xbh*dm.hit;
  let p1B=0.172*m_(batter.meet,60,1/70)*inv(supp,60,1/60)*om.hit*dm.hit;
  let sum=pK+pBB+pHBP+pHR+p3B+p2B+p1B;
  if(sum>0.985){const s=0.985/sum;pK*=s;pBB*=s;pHBP*=s;pHR*=s;p3B*=s;p2B*=s;p1B*=s;sum=0.985;}
  const pOut=1-sum;
  return weightedPick([["K",pK],["BB",pBB],["HBP",pHBP],["HR",pHR],["3B",p3B],["2B",p2B],["1B",p1B],["OUT",pOut]]);
}

/* ---------- 壘上推進 ---------- */
function hitAdvance(bases,batter,kind,hitrun){
  let runs=0;const nb=[null,null,null];const scored=[];
  const r1=bases[0],r2=bases[1],r3=bases[2];
  const sp=x=>x?x.speed:0;
  if(kind==="HR"){
    if(r1){runs++;scored.push(r1);}if(r2){runs++;scored.push(r2);}if(r3){runs++;scored.push(r3);}
    runs++;scored.push(batter);
    return{runs,bases:nb,scored};
  }
  if(kind==="3B"){
    if(r1){runs++;scored.push(r1);}if(r2){runs++;scored.push(r2);}if(r3){runs++;scored.push(r3);}
    nb[2]=batter;return{runs,bases:nb,scored};
  }
  if(kind==="2B"){
    if(r3){runs++;scored.push(r3);}
    if(r2){runs++;scored.push(r2);}
    if(r1){if(hitrun||sp(r1)>=62||chance(0.42)){runs++;scored.push(r1);}else nb[2]=r1;}
    nb[1]=batter;return{runs,bases:nb,scored};
  }
  // 一壘安打
  if(r3){runs++;scored.push(r3);}
  if(r2){if(hitrun||sp(r2)>=58||chance(0.62)){runs++;scored.push(r2);}else nb[2]=r2;}
  if(r1){if(hitrun){if(!nb[2])nb[2]=r1;}else nb[1]=r1;}
  nb[0]=batter;return{runs,bases:nb,scored};
}
function advanceOnWalk(bases,batter){
  const nb=[bases[0],bases[1],bases[2]];let runs=0;const scored=[];
  if(bases[0]&&bases[1]&&bases[2]){runs++;scored.push(bases[2]);nb[2]=bases[1];nb[1]=bases[0];nb[0]=batter;}
  else if(bases[0]&&bases[1]){nb[2]=bases[1];nb[1]=bases[0];nb[0]=batter;}
  else if(bases[0]){nb[1]=bases[0];nb[0]=batter;}
  else{nb[0]=batter;}
  return {runs,bases:nb,scored};
}
function resolveOut(bases,batter,outs,groundBias){
  const r1=bases[0],r2=bases[1],r3=bases[2];
  const w=[["ground",0.42*(groundBias||1)],["fly",0.36],["line",0.12],["pop",0.10*(groundBias?0.8:1)]];
  let subtype=weightedPick(w);
  let nb=[r1,r2,r3],runs=0,outsAdded=1,reached=false,error=false,desc="";
  if(subtype==="ground"&&r1&&outs<2){
    const roll=Math.random();
    if(roll<0.32*(groundBias||1)){ // 雙殺
      outsAdded=2;nb[0]=null;desc="精湛的雙殺守備";
    }else if(roll<0.32*(groundBias||1)+0.30){ // 野手選擇
      nb[0]=batter;reached=true;
      if(r3&&chance(0.35)){runs++;nb[2]=null;}
      desc="野手選擇，跑者被封殺在二壘";
    }else{ nb[0]=null; desc="滾地球遭到刺殺"; }
  }else if(subtype==="fly"&&r3&&outs<2&&chance(0.5)){
    runs++;nb[2]=null;desc="高飛犧牲打，三壘跑者奔回本壘";
  }else if(subtype==="line"&&r1&&outs<2&&chance(0.12)){
    outsAdded=2;nb[0]=null;desc="平飛球被接殺，跑者回壘不及造成雙殺";
  }else{
    desc=({ground:"滾地球遭到刺殺",fly:"高飛球被接殺",line:"平飛球被沒收",pop:"內野小飛球被接殺"})[subtype];
  }
  return {bases:nb,runs,outsAdded,reached,error:false,subtype,desc};
}

/* ---------- 比賽狀態 ---------- */
function sideName(m,side){return getTeam(side==="home"?m.homeId:m.awayId).name;}
function currentBatter(m){const lu=m.lineups[offenseSide(m)];return lu[m.batterIdx[offenseSide(m)]%lu.length];}
function defenseSide(m){return m.half==="top"?"home":"away";}
function offenseSide(m){return m.half==="top"?"away":"home";}
function playerIsOffense(m){const s=S.season.playerTeam;return m.half==="top"?m.awayId===s:m.homeId===s;}
function getBat(m,pid){if(!m.stats[pid])m.stats[pid]={ab:0,h:0,hr:0,rbi:0,bb:0,k:0,r:0,sb:0};return m.stats[pid];}
function batAdd(m,pid,d){const s=getBat(m,pid);for(const k in d)s[k]=(s[k]||0)+d[k];}
function getPit(m,pid){if(!m.pstats[pid])m.pstats[pid]={outs:0,h:0,r:0,er:0,bb:0,k:0,pp:0,w:0,l:0,sv:0};return m.pstats[pid];}
function pitAdd(m,pid,d){const s=getPit(m,pid);for(const k in d)s[k]=(s[k]||0)+d[k];}
/* 球季累計（含其他球團）；target 可指定為季後賽獨立累計（poPlayerStats） */
function mergeBatLine(pid,s,tgt){const ps=tgt||S.season.playerStats;const d=ps.bat[pid]||(ps.bat[pid]={g:0,ab:0,h:0,hr:0,rbi:0,bb:0,k:0,r:0,sb:0});d.g++;for(const k in s)d[k]=(d[k]||0)+s[k];}
function mergePitLine(pid,s,tgt){const ps=tgt||S.season.playerStats;const d=ps.pit[pid]||(ps.pit[pid]={g:0,outs:0,h:0,r:0,er:0,bb:0,k:0,pp:0,w:0,l:0,sv:0});d.g++;for(const k in s)d[k]=(d[k]||0)+s[k];}
function playerById(pid){const mm=/^([a-z]+)([bp])(\d+)$/.exec(pid);if(!mm)return null;const t=getTeam(mm[1]);return mm[2]==="b"?t.batters[+mm[3]]:t.pitchers[+mm[3]];}
function splitInt(total,weights){
  const n=weights.length,sum=weights.reduce((a,b)=>a+b,0)||1;
  const raw=weights.map(w=>Math.max(0,total)*w/sum);
  const out=raw.map(x=>Math.floor(x));
  let rem=total-out.reduce((a,b)=>a+b,0);
  const frac=raw.map((x,i)=>[x-Math.floor(x),i]).sort((a,b)=>b[0]-a[0]);
  let k=0;while(rem>0&&k<500){out[frac[k%n][1]]++;rem--;k++;}
  return out;
}
function weightedIndex(weights){
  let t=0;for(const w of weights)t+=Math.max(0,w);let r=Math.random()*t;
  for(let i=0;i<weights.length;i++){r-=Math.max(0,weights[i]);if(r<=0)return i;}
  return weights.length-1;
}
function addRuns(m,side,n){if(n<=0)return;m.score[side]+=n;if(m.line[side].length<m.inning)m.line[side].length=m.inning;m.line[side][m.inning-1]=(m.line[side][m.inning-1]||0)+n;}

function defaultLineup(team){return team.batters.filter(b=>!b.bench).slice(0,9);}
function buildLineup(team){
  const custom=(CAREER.lineups||{})[team.id];
  if(custom&&custom.length){
    const byId={};team.batters.forEach(b=>byId[b.id]=b);
    const seen={},arr=[];
    custom.forEach(id=>{const b=byId[id];if(b&&!seen[id]){arr.push(b);seen[id]=1;}});
    team.batters.forEach(b=>{if(arr.length<9&&!seen[b.id]){arr.push(b);seen[b.id]=1;}});
    if(arr.length>=9)return arr.slice(0,9);
  }
  return defaultLineup(team);
}
function buildBench(team){const lu=buildLineup(team);return team.batters.filter(b=>lu.indexOf(b)<0);}
function setPlayerLineup(ids){
  if(!S.season)return;
  CAREER.lineups=CAREER.lineups||{};
  CAREER.lineups[S.season.playerTeam]=ids.slice();
  saveCareer();
}
function starterOf(team,day){const sp=team.pitchers.filter(p=>p.starter);return sp[(day+hashStr(team.id))%sp.length];}

function newMatch(homeId,awayId,dayIndex,homeStarter,awayStarter){
  const home=getTeam(homeId),away=getTeam(awayId);
  const m={
    homeId,awayId,dayIndex,
    inning:1,half:"top",outs:0,balls:0,strikes:0,
    bases:[null,null,null],
    score:{away:0,home:0},hits:{away:0,home:0},errs:{away:0,home:0},
    line:{away:new Array(12).fill(0),home:new Array(12).fill(0)},
    lineups:{away:buildLineup(away),home:buildLineup(home)},
    bench:{away:buildBench(away),home:buildBench(home)},
    bullpen:{away:away.pitchers.filter(p=>!p.starter),home:home.pitchers.filter(p=>!p.starter)},
    usedPitchers:{away:[],home:[]},
    batterIdx:{away:0,home:0},
    pitchers:{away:{obj:awayStarter,pitches:0,cond:rollCond()},home:{obj:homeStarter,pitches:0,cond:rollCond()}},
    starters:{away:awayStarter,home:homeStarter},
    stats:{},pstats:{},log:[],over:false,winner:null,walkoff:false,
    lastOff:null,lastDef:null,usedSubs:new Set()
  };
  m.originals={away:m.lineups.away.slice(),home:m.lineups.home.slice()};  // 記錄原先發，供換人／打線對照
  m.log.push(`◆ 比賽開始　${away.name} ＠ ${home.name}（${home.stadium}）`);
  m.log.push(`　先發投手　${away.name}：${awayStarter.name}　／　${home.name}：${homeStarter.name}`);
  m.log.push(`◆ 1局上　${away.name}的進攻`);
  return m;
}

/* ---------- 打席處理 ---------- */
function playPA(m,offT,defT){
  const offSide=offenseSide(m),defSide=defenseSide(m);
  const batter=currentBatter(m);
  const P=m.pitchers[defSide];
  const eff=effOf(m,defSide);
  const L=[];
  const push=(s,cls)=>{L.push(s);m.log.push(cls?{t:s,c:cls}:s);};

  const runnerOn1=!!m.bases[0],runnerOn2=!!m.bases[1],runnerOn3=!!m.bases[2];
  const anyRunner=runnerOn1||runnerOn2||runnerOn3;
  if(offT==="bunt"&&!anyRunner)offT="normal";
  if(offT==="hitrun"&&!anyRunner)offT="normal";

  const thrown=ri(1,4)+ri(0,2);
  P.pitches+=thrown;
  m.pitchSpeed=Math.round(138+P.obj.velocity*0.35+ri(-3,3));   // 球速（熱血演出）
  pitAdd(m,P.obj.id,{pp:thrown});

  let ev;
  if(offT==="bunt"){
    const succ=clamp(0.62+(batter.speed-60)/300-(eff.velocity-60)/500,0.30,0.86);
    if(chance(succ)) ev=chance(0.10)?"BUNTHIT":"SAC";
    else ev="BUNTOUT";
  }else{
    ev=paOutcome(batter,eff,offT,defT);
  }

  push(`　投手「${DEF_NAME[defT]||"配球"}」對決打者「${OFF_NAME[offT]||"揮擊"}」。`,null);

  let runs=0,desc="",cls="out";
  if(ev==="K"){m.outs++;
    batAdd(m,batter.id,{ab:1,k:1});pitAdd(m,P.obj.id,{k:1,outs:1});
    desc=`三振！${batter.name}揮棒落空，黯然退回休息區。`;cls="out";
    if(offT==="hitrun"&&runnerOn1&&m.outs<2&&chance(0.42)){
      m.bases[0]=null;m.outs++;desc+=`（打帶跑走壘失敗，一壘跑者被封殺！）`;
    }
  }
  else if(ev==="OUT"){const r=resolveOut(m.bases,batter,m.outs,DEF_MODS[defT]&&DEF_MODS[defT].ground);
    runs=r.runs;m.outs+=r.outsAdded;m.bases=r.bases;
    batAdd(m,batter.id,{ab:1});pitAdd(m,P.obj.id,{outs:r.outsAdded});
    desc=r.desc+"。";cls="out";
  }
  else if(ev==="SAC"){const nb=[m.bases[0],m.bases[1],m.bases[2]];let rr=0;
    if(m.bases[2]){rr++;nb[2]=null;}
    if(m.bases[1]){nb[2]=m.bases[1];nb[1]=null;}
    if(m.bases[0]){nb[1]=m.bases[0];nb[0]=null;}
    runs=rr;m.bases=nb;m.outs++;
    batAdd(m,batter.id,{ab:0});pitAdd(m,P.obj.id,{outs:1});
    desc=`漂亮的犧牲短打！${batter.name} 成功護送跑者${rr?"並送回一分":""}。`;cls="out";
  }
  else if(ev==="BUNTOUT"){m.outs++;batAdd(m,batter.id,{ab:1});pitAdd(m,P.obj.id,{outs:1});desc=`短打失敗，${batter.name} 點成小飛球被接殺。`;cls="out";}
  else if(ev==="BUNTHIT"){const nb=[batter,m.bases[0],m.bases[1]];let rr=0;
    if(m.bases[2]){rr++;nb[2]=m.bases[1];nb[1]=m.bases[0];nb[0]=batter;}
    else if(m.bases[1]){nb[2]=m.bases[1];nb[1]=m.bases[0];nb[0]=batter;}
    runs=rr;m.bases=nb;m.hits[offSide]++;
    batAdd(m,batter.id,{ab:1,h:1});pitAdd(m,P.obj.id,{h:1});
    desc=`出其不意！${batter.name} 偷點形成內野安打！`;cls="hit";
  }
  else if(ev==="BB"){const r=advanceOnWalk(m.bases,batter);runs=r.runs;m.bases=r.bases;
    batAdd(m,batter.id,{ab:0,bb:1});pitAdd(m,P.obj.id,{bb:1});
    r.scored.forEach(x=>{if(x)batAdd(m,x.id,{r:1});});
    desc=`四壞球保送，${batter.name}選球上壘。`;cls="hit";
  }
  else if(ev==="HBP"){const r=advanceOnWalk(m.bases,batter);runs=r.runs;m.bases=r.bases;
    batAdd(m,batter.id,{ab:0,bb:1});
    r.scored.forEach(x=>{if(x)batAdd(m,x.id,{r:1});});
    desc=`觸身球！${batter.name}挨了一記，保送上壘。`;cls="hit";
  }
  else{ // 安打：一壘／二壘／三壘／全壘打
    const h=hitAdvance(m.bases,batter,ev,offT==="hitrun");
    runs=h.runs;m.bases=h.bases;m.hits[offSide]++;
    pitAdd(m,P.obj.id,{h:1});
    batAdd(m,batter.id,{ab:1,h:1});
    if(ev==="HR")batAdd(m,batter.id,{hr:1});
    h.scored.forEach(x=>{if(x)batAdd(m,x.id,{r:1});});
    const word={"HR":"全壘打","3B":"三壘安打","2B":"二壘安打","1B":"一壘安打"}[ev];
    if(ev==="HR"){desc=`全壘打～～！！ ${batter.name} 的${runs>1?runs+"分":"陽春"}彈！`;cls="big";}
    else{desc=`${word}！${batter.name} 擊出穿越防線的安打${runs?"，跑者回壘得分":""}。`;cls="hit";}
  }

  // 得分
  if(runs>0){
    addRuns(m,offSide,runs);
    batAdd(m,batter.id,{rbi:runs});
    pitAdd(m,P.obj.id,{r:runs,er:runs});
    push(`　★ ${sideName(m,offSide)} 拿下 ${runs} 分！`, "run");
  }

  // 產出文字
  const cnt=makeCount(ev);
  const pitchWords=makePitchSeq(ev,cnt);
  pitchWords.forEach(w=>push("　　› "+w,null));
  push(`　${desc}（球數 ${cnt.b}-${cnt.s}）`,cls);

  // 下一棒
  m.batterIdx[offSide]++;
  m.balls=0;m.strikes=0;

  // 熱血演出：記錄上一打席結果與大字形
  m.lastKind=ev;
  m.lastRuns=runs;
  if(ev==="HR")m.splash={t:"全壘打！！",c:"hr"};
  else if(ev==="K")m.splash={t:"三振！",c:"k"};
  else if(ev==="3B")m.splash={t:"三壘安打！",c:"hit"};
  else if(ev==="2B")m.splash={t:"二壘安打！",c:"hit"};
  else if(ev==="1B"||ev==="BUNTHIT")m.splash={t:"安打！",c:"hit"};
  else if(ev==="BB")m.splash={t:"保送",c:"bb"};
  else if(ev==="HBP")m.splash={t:"觸身球",c:"bb"};
  else if(ev==="SAC")m.splash={t:"犧牲觸擊",c:"out"};

  // 再見安打判定
  if(m.half==="bottom"&&m.inning>=9&&m.score.home>m.score.away){
    m.over=true;m.winner="home";m.walkoff=true;m.splash={t:"再見！",c:"hr"};
  }
}
/* 單場英雄（Player of the Game）
   候選僅取「勝利方」球員（和局時兩隊皆可），並讓打者與投手份量相當，
   避免以往投手（含敗投）幾乎必當 MVP 的問題。 */
function gameHero(m){
  const wSide=m.winner;                    // "home" / "away" / null(和局)
  const winTeam=wSide==null?null:(wSide==="home"?m.homeId:m.awayId);
  const winStarter=(wSide!=null&&m.starters)?m.starters[wSide].id:null;
  const teamOf=pid=>String(pid).replace(/[bp]\d+$/,"");
  const cand=[];
  for(const pid in m.stats){
    if(winTeam&&teamOf(pid)!==winTeam)continue;
    const s=m.stats[pid];
    const v=s.h*1.5+s.hr*2.5+s.rbi*1.4+(s.r||0)*1.0+(s.sb||0)*0.5+(s.bb||0)*0.2;
    const p=playerById(pid);
    cand.push({pid,name:p?p.name:pid,isPit:false,s,v});
  }
  for(const pid in m.pstats){
    if(winTeam&&teamOf(pid)!==winTeam)continue;
    const s=m.pstats[pid];
    let v=s.k*2+(s.outs||0)*0.45-(s.er||0)*3+(s.sv||0)*3;
    if(pid===winStarter)v+=3;              // 勝隊先發勝投加成（m.pstats 未記勝投）
    const p=playerById(pid);
    cand.push({pid,name:p?p.name:pid,isPit:true,s,v});
  }
  if(!cand.length)return null;
  cand.sort((a,b)=>b.v-a.v);
  return cand[0];
}

function makeCount(ev){
  if(ev==="K")return{b:ri(0,3),s:3};
  if(ev==="BB")return{b:4,s:ri(0,2)};
  if(ev==="HBP")return{b:0,s:0};
  return{b:ri(0,3),s:ri(0,2)};
}
function makePitchSeq(ev,cnt){
  const arr=[];
  for(let i=0;i<cnt.b;i++)arr.push("壞球，球數落後");
  for(let i=0;i<cnt.s;i++)arr.push(chance(0.5)?"好球沒揮，記好球":"精彩的界外球");
  if(arr.length===0)arr.push("第一球就出手");
  const fin={"K":"再見三振，棒子揮了個空","BB":"明顯壞球，打者獲得保送","HBP":"身體附近的球，打者閃避不及",
    "HR":"清脆的擊球聲！球飛向中外野深處","3B":"強勁的平飛球滾向右外野縫隙","2B":"深遠的飛球落地，打者衝上二壘",
    "1B":"穿越內野的強襲安打","OUT":"擊球進場，被防守方處理",
    "SAC":"輕輕一點，球滾向三壘方向","BUNTHIT":"突如其來的一點，防守方反應不及","BUNTOUT":"點成小飛球，被捕手接殺"}[ev]||"擊球進場";
  arr.push(fin);
  return arr;
}

/* ---------- 半局 / 比賽結束 ---------- */
function endHalf(m){
  m.outs=0;m.bases=[null,null,null];m.balls=0;m.strikes=0;
  const finished=m.half;
  if(finished==="top"){
    if(m.inning>=9&&m.score.home>m.score.away){m.over=true;m.winner="home";return;}  // 主隊領先才不用打九局下
    m.half="bottom";
    m.log.push({t:`◆ ${m.inning}局下　${sideName(m,"home")}的進攻`,c:"inn"});
  }else{
    if(m.inning>=9&&m.score.home!==m.score.away){m.over=true;m.winner=m.score.home>m.score.away?"home":"away";return;}
    if(m.inning>=18){m.over=true;m.winner=m.score.home>m.score.away?"home":(m.score.home<m.score.away?"away":null);return;}
    if(m.inning>=12&&!m.noTie){m.over=true;m.winner=null;return;}
    m.inning++;m.half="top";
    m.log.push({t:`◆ ${m.inning}局上　${sideName(m,"away")}的進攻`,c:"inn"});
  }
}

/* ---------- CPU AI 戰術 ---------- */
function aiOffense(m){
  const batter=currentBatter(m);
  const defSide=defenseSide(m);
  const eff=effOf(m,defSide);
  const r1=!!m.bases[0],r2=!!m.bases[1],r3=!!m.bases[2];
  if(m.outs<2&&!r3&&(r1||r2)&&batter.power<58&&chance(0.32))return "bunt";
  if(r1&&batter.speed>72&&m.outs<2&&chance(0.14))return "hitrun";
  if(batter.power>72&&(r1||r2)&&m.outs<2&&chance(0.26))return "power";
  if(eff.control<58&&chance(0.30))return "take";
  return "normal";
}
function aiDefense(m){
  const batter=currentBatter(m);
  const defSide=defenseSide(m);
  const P=m.pitchers[defSide];
  const openFirst=!m.bases[0];
  if(m.outs<2&&openFirst&&(m.bases[1]||m.bases[2])&&batter.power>78&&chance(0.55))return "ibb";
  if(P.pitches>75&&chance(0.4))return "control";
  if(batter.power>75)return chance(0.5)?"corner":"chase";
  return weightedPick([["corner",0.40],["control",0.28],["power",0.20],["chase",0.12]]);
}

/* ---------- 玩家特殊動作 ---------- */
function doIBB(m){
  const offSide=offenseSide(m),batter=currentBatter(m),P=m.pitchers[defenseSide(m)];
  const r=advanceOnWalk(m.bases,batter);
  m.bases=r.bases;
  if(r.runs>0){addRuns(m,offSide,r.runs);batAdd(m,batter.id,{rbi:r.runs});}
  batAdd(m,batter.id,{ab:0,bb:1});
  m.log.push({t:`　投手選擇故意四壞，保送 ${batter.name} 上一壘。`,c:"sys"});
  m.batterIdx[offSide]++;P.pitches+=4;pitAdd(m,P.obj.id,{pp:4,bb:1});
}
function doSteal(m){
  const offSide=offenseSide(m);
  let from=-1,to=-1,runner=null;
  if(m.bases[0]){from=0;to=1;runner=m.bases[0];}
  else if(m.bases[1]){from=1;to=2;runner=m.bases[1];}
  if(!runner){m.log.push({t:"　沒有可盜壘的跑者。",c:"sys"});return;}
  const defSide=defenseSide(m),eff=effOf(m,defSide);
  const p=clamp(0.60+(runner.speed-60)/160-(eff.velocity-60)/400,0.35,0.88);
  if(chance(p)){
    m.bases[from]=null;m.bases[to]=runner;
    batAdd(m,runner.id,{sb:1});
    m.log.push({t:`　★ 盜壘成功！${runner.name} 用速度搶下${to===2?"三壘":"二壘"}！`,c:"hit"});
  }else{
    m.bases[from]=null;m.outs++;
    m.log.push({t:`　盜壘失敗！${runner.name} 遭到阻殺，${m.outs}人出局。`,c:"out"});
    if(m.outs>=3)endHalf(m);
  }
}
function doPinchHit(m,auto){
  const offSide=offenseSide(m);
  const bench=m.bench[offSide];
  if(!bench.length){m.log.push({t:"　已無可用之兵。",c:"sys"});return;}
  const lu=m.lineups[offSide],idx=m.batterIdx[offSide]%lu.length;
  const before=lu[idx];
  const bi=auto?ri(0,bench.length-1):0;   // 自動調度隨機挑替補，讓大家都有上場機會
  const sub=bench.splice(bi,1)[0];
  lu[idx]=sub;
  m.log.push({t:`　代打！換下「${before.name}」（${before.posLabel}），由「${sub.name}」（${sub.posLabel}）拎著球棒上場代打。`,c:"sys"});
}
function doChangePitcher(m,pid){
  const defSide=defenseSide(m);
  const bp=m.bullpen[defSide];
  const i=bp.findIndex(p=>p.id===pid);
  if(i<0)return;
  const np=bp.splice(i,1)[0];
  const old=m.pitchers[defSide].obj;
  m.usedPitchers[defSide].push(old.id);
  const npCond=rollCond();
  m.pitchers[defSide]={obj:np,pitches:0,cond:npCond};
  const condTxt=npCond==="good"?"（好調）":npCond==="bad"?"（不調）":"";
  m.log.push({t:`　★ 換投！${sideName(m,defSide)} 換下「${old.name}」（${old.role}），由「${np.name}」（${np.role}）接替投球${condTxt}。`,c:"run"});
}

/* ---------- 遊戲回合控制 ---------- */
let busy=false;
function submit(fn,ms){
  if(busy)return;
  busy=true;
  const ov=$("#ov");if(ov)ov.classList.add("on");
  setTimeout(()=>{
    try{fn();}catch(e){console.error(e);}
    busy=false;if(ov)ov.classList.remove("on");
    if(S.match&&S.match.over&&!S.match._processed)processGameEnd(S.match);
    render();
  },ms||230);
}
function maybeAutoSub(m){
  if(m.over)return;
  const bench=m.bench[offenseSide(m)];
  if(!bench.length||!chance(0.06))return;
  doPinchHit(m,true);   // 自動讓替補上場代打（自動比賽才有機會上場的問題）
}
function resolveTurn(offT,defT){
  const m=S.match;if(!m||m.over)return;
  if(!playerIsOffense(m))maybeAutoSub(m);   // AI 進攻時也讓其替補有代打機會
  if(defT==="ibb"){doIBB(m);}
  else{playPA(m,offT,defT);}
  if(!m.over&&m.outs>=3)endHalf(m);
}
function autoHalf(m){
  const startHalf=m.half,startInn=m.inning;let guard=0;
  while(!m.over&&m.half===startHalf&&m.inning===startInn&&guard++<200){
    maybeAutoSub(m);
    playPA(m,aiOffense(m),aiDefense(m));
    if(m.outs>=3)endHalf(m);
  }
}
function autoGame(m){
  let guard=0;
  while(!m.over&&guard++<4000){
    maybeAutoSub(m);
    playPA(m,aiOffense(m),aiDefense(m));
    if(m.outs>=3)endHalf(m);
  }
  if(!m.over){m.over=true;}
}
