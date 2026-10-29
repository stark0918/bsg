/* ---------- 球員產生（依隊 deterministic） ---------- */
function mkName(rnd,used){  for(let i=0;i<40;i++){
    const n=rpick(rnd,SU)+rpick(rnd,GI);
    if(!used.has(n)){used.add(n);return n;}
  }
  return rpick(rnd,SU)+rpick(rnd,GI);
}
function genRoster(team){
  const rnd=mulberry32(hashStr("gk-roster-v3-"+team.id));
  const nrnd=mulberry32(hashStr("gk-name-v1-"+team.id));
  const arnd=mulberry32(hashStr("gk-arch-v1-"+team.id));
  const mrnd=mulberry32(hashStr("gk-ment-v1-"+team.id));   // 膽識獨立亂數流（beta D3c，不影響其他能力）
  const used=new Set();
  const pos=["C","1B","2B","3B","SS","LF","CF","RF"];   // 8 個守備位置：沒有「DH 守位」了
  const benchPos=["C","SS","CF","1B"];   // 板凳球員守位（僅供顯示／換人對照，不影響能力加成）
  // 副守位：讓打線在有人受傷／輪休或手動換人時，還有第二個比較合理的位置可排。
  const pos2Map={C:"1B","1B":"LF","2B":"SS","3B":"1B",SS:"2B",LF:"RF",CF:"LF",RF:"LF"};
  const benchPos2=["1B","2B","LF","LF"];
  const arch=["contact","power","speed","eye","balanced"];
  const batters=[];
  /* 第 9 位先發原本是「DH 守位」，現在 DH 改由打線上的棒次決定（任何球員都能當），
     所以他改拿一個外野位置；用球隊 id 決定左／右外野，各隊看起來才不會一樣。 */
  const ninthOF=(hashStr("gk-pos9-"+team.id)%2)?"LF":"RF";
  const benchN=Math.max(0,Math.min(8,Number(cfg('benchBatters'))||4));   // 板凳打者人數（管理者可調）
  const totalBat=9+benchN;
  const usePos=cfg('posBoost')!==0;   // 守位能力加成開關
  for(let i=0;i<totalBat;i++){
    const p=i<8?pos[i]:(i===8?ninthOF:null);
    const bp=i>=9?benchPos[(i-9)%benchPos.length]:null;
    const p2=i<8?pos2Map[p]:(i===8?(ninthOF==="LF"?"RF":"LF"):benchPos2[(i-9)%benchPos2.length]);
    const a=rpick(arnd,arch);
    let meet=nrm(rnd,52,10),power=nrm(rnd,50,13),eye=nrm(rnd,50,11),speed=nrm(rnd,52,12),def=nrm(rnd,52,11);
    if(a==="contact"){meet+=9;eye+=3;power-=4;}
    if(a==="power"){power+=14;meet-=5;speed-=6;}
    if(a==="speed"){speed+=16;def+=4;power-=7;meet+=1;}
    if(a==="eye"){eye+=14;meet+=2;power+=2;speed-=6;}
    if(usePos){
      if(p==="C"){def+=12;speed-=8;meet+=2;}
      if(p==="1B"){power+=8;def-=3;speed-=4;}
      if(p==="2B"){def+=8;speed+=4;power-=6;}
      if(p==="3B"){power+=6;def+=3;}
      if(p==="SS"){def+=12;speed+=6;power-=4;}
      if(p==="CF"){def+=8;speed+=8;power-=2;}
      if(p==="LF"||p==="RF"){power+=3;def-=2;}
    }
    const s=teamStr(team.id);
    batters.push({
      id:team.id+"b"+i, name:mkName(nrnd,used),
      pos:p||(bp||("B"+i)), posLabel:p?POS_ZH[p]:(bp?POS_ZH[bp]:"替補"),
      pos2:p2||null, pos2Label:p2?POS_ZH[p2]:"", bench:i>=9,
      meet:Math.round(clamp(meet+s,25,96)), power:Math.round(clamp(power+s,20,96)),
      eye:Math.round(clamp(eye+s,25,96)), speed:Math.round(clamp(speed+s,20,96)),
      defense:Math.round(clamp(def+s,20,96)),
      mentality:Math.round(clamp(nrm(mrnd,53,13)+s,25,96))   // 膽識：獨立亂數流，不影響其他能力（beta D3c）
    });
  }
  const pitchers=[];
  const ps2=teamStr(team.id);
  const nSt=Math.max(1,Math.min(5,Number(cfg('starterPitchers'))||3));
  const nRl=Math.max(0,Math.min(6,Number(cfg('reliefPitchers'))||3));
  for(let i=0;i<nSt+nRl;i++){
    const sp=i<nSt;
    let velocity=nrm(rnd,sp?62:71,8),control=nrm(rnd,sp?64:60,9),breaking=nrm(rnd,sp?62:68,9),stamina=nrm(rnd,sp?74:42,sp?7:8);
    pitchers.push({
      id:team.id+"p"+i, name:mkName(nrnd,used), role:sp?"先發":"後援", starter:sp,
      velocity:Math.round(clamp(velocity+ps2,25,97)),
      control:Math.round(clamp(control+ps2,25,97)),
      breaking:Math.round(clamp(breaking+ps2,25,97)),
      stamina:Math.round(clamp(stamina,25,95))
    });
  }
  return {batters,pitchers};
}
const teamCache={};
function getTeam(id){
  if(!teamCache[id]){
    const def=TEAM_DEFS.find(t=>t.id===id);
    const team=Object.assign({},def,genRoster(def));
    bindRosterNames(team);   // 首次見到球員就把名字寫進 CAREER.ov，名單之後再改也不換名
    team.batters.concat(team.pitchers).forEach(applyOv);
    teamCache[id]=team;
  }
  return teamCache[id];
}

/* ---------- 守位指派（自動排守位／客串判斷） ----------
   打線上的 9 人先扣掉 DH，剩下 8 人排進 C/1B/2B/3B/SS/LF/CF/RF，每個位置剛好一人。
   分數：本職 100、副守位 82、相鄰位置 58、其他 24；再依該守位的守備門檻、
   球員守備力與速度（CF/SS）微調。8! = 40320 種排列直接全搜尋，取總分最高者，
   所以排序打線、手動換人後都不會再出現兩個一壘手／兩個中外野手。 */
const FIELD_POS=["C","1B","2B","3B","SS","LF","CF","RF"];
const POS_GROUP={
  C:["C"],
  "1B":["1B","3B","LF","RF"],
  "2B":["2B","SS","3B"],
  "3B":["3B","1B","SS","LF"],
  SS:["SS","2B","3B"],
  LF:["LF","CF","RF","1B"],
  CF:["CF","LF","RF"],
  RF:["RF","LF","CF","1B"]
};
const POS_HARD={C:64,SS:60,"2B":54,"3B":52,CF:56,"1B":46,LF:44,RF:44};
function posFitScore(p,pos){
  if(!p)return -999;
  const natural=p.pos===pos,alt=p.pos2===pos;
  let base=natural?100:alt?82:((POS_GROUP[p.pos]||[]).indexOf(pos)>=0?58:24);
  if(pos==="C"&&!natural&&!alt)base-=45;   // 捕手是專門位置，非本職客串的風險很高
  base-=Math.max(0,(POS_HARD[pos]||50)-(p.defense||50))*0.9;
  if(pos==="CF"||pos==="SS")base+=((p.speed||50)-50)*0.12;   // 中線守位需要速度
  return base;
}
function assignFieldPositions(players,dhPid){
  const list=(players||[]).filter(Boolean);
  const dh=(dhPid!=null&&list.find(p=>p.id===dhPid))||(list.length>8?list[8]:null);
  const fielders=list.filter(p=>p!==dh).slice(0,8);
  let best=null,bestScore=-1e9;
  const cur=new Array(fielders.length),used=new Array(8).fill(false);
  function rec(i,score){
    if(i>=fielders.length){if(score>bestScore){bestScore=score;best=cur.slice(0,i);}return;}
    for(let j=0;j<8;j++){
      if(used[j])continue;
      used[j]=true;cur[i]=FIELD_POS[j];
      rec(i+1,score+posFitScore(fielders[i],FIELD_POS[j]));
      used[j]=false;
    }
  }
  rec(0,0);
  const map={};
  if(best)fielders.forEach((p,i)=>{map[p.id]=best[i];});
  if(dh)map[dh.id]="DH";
  return {map,score:bestScore,dhPid:dh?dh.id:null};
}
/* 綜合打擊分數（近似 OPS）：打擊 1.2＋力量 1.5＋選球 1.2＋速度 0.5 */
function offenseScore(p){return (p.meet||0)*1.2+(p.power||0)*1.5+(p.eye||0)*1.2+(p.speed||0)*0.5;}
/* 自動排打線：先依守位重要性（C→SS→CF→2B→3B→1B→LF→RF）各挑最適合的一人，
   再從剩下的人挑打擊最好的一位當 DH；9 人再依打擊排序，DH 不強制第 9 棒。 */
function autoLineup(team){
  const pool=(team&&team.batters?team.batters:[]).slice();
  const used={},picked=[];
  const order=["C","SS","CF","2B","3B","1B","LF","RF"];
  order.forEach(pos=>{
    let best=null,bv=-1e9;
    pool.forEach(p=>{
      if(used[p.id])return;
      const v=posFitScore(p,pos)*0.78+offenseScore(p)*0.22+(p.pos===pos?12:0)+(p.pos2===pos?5:0);
      if(v>bv){bv=v;best=p;}
    });
    if(best){used[best.id]=1;picked.push(best);}
  });
  let dh=null,dv=-1e9;
  pool.forEach(p=>{
    if(used[p.id])return;
    const v=offenseScore(p)+(p.pos==="C"?-60:0);   // 已有主戰捕手時，板凳捕手不必優先 DH
    if(v>dv){dv=v;dh=p;}
  });
  // 極端情況（自訂名單不足 8 人）補滿守備員
  if(picked.length<8)pool.forEach(p=>{if(picked.length<8&&!used[p.id]){used[p.id]=1;picked.push(p);}});
  if(!dh)pool.forEach(p=>{if(!dh&&!used[p.id])dh=p;});
  // 9 人依打擊能力排序；DH 可以排在任意棒次，不強制第 9 棒。
  const ordered=picked.slice(0,8).concat(dh?[dh]:[]).sort((a,b)=>offenseScore(b)-offenseScore(a));
  const dhIdx=dh?ordered.indexOf(dh):-1;
  return {ids:ordered.map(p=>p.id),dhPid:dh?dh.id:null,dhIdx,assign:assignFieldPositions(ordered,dh?dh.id:null)};
}
/* 驗證：每隊預設打線扣掉 DH 後，8 個守位是否剛好各一人（測試／除錯用）。 */
function validateRosterPositions(){
  return TEAM_DEFS.map(def=>{
    const t=getTeam(def.id),lu=buildLineup(t),dhIdx=dhSlotOf(def.id);
    const a=assignFieldPositions(lu,lu[dhIdx]?lu[dhIdx].id:null);
    const seen={},dup=[];
    Object.keys(a.map).forEach(pid=>{const pos=a.map[pid];if(pos==="DH")return;if(seen[pos])dup.push(pos);seen[pos]=1;});
    return {team:def.id,dup,missing:FIELD_POS.filter(p=>!seen[p]),score:a.score};
  });
}
