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
function makeSchedule(){
  const ids=TEAM_DEFS.map(t=>t.id);
  const first=roundRobin(ids);
  const days=[];
  first.forEach((round,r)=>{
    days.push(round.map((p,i)=>r%2===0?{away:p[0],home:p[1],played:false,score:null}:{away:p[1],home:p[0],played:false,score:null}));
  });
  first.forEach((round,r)=>{
    days.push(round.map((p,i)=>r%2===0?{away:p[1],home:p[0],played:false,score:null}:{away:p[0],home:p[1],played:false,score:null}));
  });
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
  const lamA=clamp(4.3*Math.pow(a.off/b.def,0.6)*rf(0.8,1.2),0.6,12);
  const lamB=clamp(4.3*Math.pow(b.off/a.def,0.6)*rf(0.8,1.2),0.6,12);
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
  const b=getTeam(teamId).batters.slice(0,9);
  const ps=b.map(p=>({pid:p.id,ab:0,h:0,hr:0,rbi:0,bb:0,k:0,r:0,sb:0}));
  ps.forEach(x=>x.ab=ri(3,5));
  const totalAB=ps.reduce((a,x)=>a+x.ab,0);
  const H=clamp(Math.round(runs*1.15+4.6+rf(-1.5,1.5)),runs,Math.min(15,totalAB));
  const powW=b.map(p=>Math.pow(Math.max(1,p.power-30),2));
  let hr=clamp(Math.round(runs*rf(0.12,0.45)),0,runs);
  hr=Math.min(hr,H);
  for(let i=0;i<hr;i++){let idx=weightedIndex(powW),tries=0;while(ps[idx].h>=ps[idx].ab&&tries<9){idx=weightedIndex(powW);tries++;}ps[idx].hr++;ps[idx].h++;}
  const w=b.map(p=>0.8+Math.max(0,p.meet-40)*0.008+Math.max(0,p.power-40)*0.003);
  const add=splitInt(H-hr,w);
  let extra=0;
  ps.forEach((x,i)=>{const room=Math.max(0,x.ab-x.h);const give=Math.min(add[i],room);x.h+=give;extra+=add[i]-give;});
  while(extra>0){const i=weightedIndex(w);if(ps[i].h<ps[i].ab){ps[i].h++;extra--;}else break;}
  const rw=b.map(p=>0.8+Math.max(0,p.meet-40)*0.006+Math.max(0,p.speed-40)*0.004);
  const rs=splitInt(runs,rw);ps.forEach((x,i)=>x.r+=rs[i]);
  const wr=b.map(p=>0.8+Math.max(0,p.power-40)*0.01+Math.max(0,p.meet-40)*0.004);
  const rbi=splitInt(runs,wr);ps.forEach((x,i)=>x.rbi+=rbi[i]);
  const bbT=ri(1,5);for(let i=0;i<bbT;i++)ps[weightedIndex(b.map(p=>p.eye))].bb++;
  const kT=ri(4,11);for(let i=0;i<kT;i++)ps[weightedIndex(b.map(p=>Math.max(1,110-p.meet)))].k++;
  const sbT=ri(0,3);for(let i=0;i<sbT;i++)ps[weightedIndex(b.map(p=>Math.max(1,p.speed-48)))].sb++;
  return ps;
}
function synthPitching(teamId,runsAllowed,oppHits,won,close){
  const t=getTeam(teamId);
  const sp=t.pitchers.filter(p=>p.starter),rp=t.pitchers.filter(p=>!p.starter);
  const starter=sp[ri(0,sp.length-1)];
  const outs=Math.min(27,ri(15,25));
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
  if(won){ last.w=1; if(close&&list.length>1&&last.outs>=3&&last.outs<9)last.sv=1; }
  else starterLine.l=1;
  return list;
}
function synthGameStats(awayId,homeId,ra,rh){
  const margin=Math.abs(ra-rh);
  const awayBat=synthBatting(awayId,ra), homeBat=synthBatting(homeId,rh);
  const awayPit=synthPitching(awayId,rh,homeBat.reduce((a,x)=>a+x.h,0),rh<ra,margin<=3);
  const homePit=synthPitching(homeId,ra,awayBat.reduce((a,x)=>a+x.h,0),ra<rh,margin<=3);
  awayBat.forEach(s=>mergeBatLine(s.pid,s));
  homeBat.forEach(s=>mergeBatLine(s.pid,s));
  awayPit.forEach(s=>mergePitLine(s.pid,s));
  homePit.forEach(s=>mergePitLine(s.pid,s));
}
function mergePlayerStats(m){
  for(const pid in m.stats)mergeBatLine(pid,m.stats[pid]);
  for(const pid in m.pstats)mergePitLine(pid,m.pstats[pid]);
  // 勝敗投手：獲勝方先發勝投、落敗方先發敗投（寫入球季累計）
  if(m.winner){
    const wSide=m.winner,lSide=wSide==="home"?"away":"home";
    const ps=S.season.playerStats.pit;
    const wId=m.starters[wSide].id,lId=m.starters[lSide].id;
    if(ps[wId])ps[wId].w=(ps[wId].w||0)+1;
    if(ps[lId])ps[lId].l=(ps[lId].l||0)+1;
  }
}
function processGameEnd(m){
  if(m._processed)return;m._processed=true;
  const day=S.season.schedule[m.dayIndex];
  const g=day.find(x=>x.away===m.awayId&&x.home===m.homeId);
  if(g){g.played=true;g.score={a:m.score.away,h:m.score.home};}
  applyRecord(m.awayId,m.homeId,m.score.away,m.score.home);
  mergePlayerStats(m);
  day.forEach(x=>{
    if(x.played)return;
    const r=quickSim(x.away,x.home);
    x.played=true;x.score={a:r.a,h:r.b};
    applyRecord(x.away,x.home,r.a,r.b);
    synthGameStats(x.away,x.home,r.a,r.b);
  });
  S.season.day++;
  if(S.season.day>=S.season.schedule.length){CAREER.pending=true;saveCareer();}
  saveGame();
}
