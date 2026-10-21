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
  const used=new Set();
  const pos=["C","1B","2B","3B","SS","LF","CF","RF"];   // 8 個守備位置：沒有「DH 守位」了
  const benchPos=["C","SS","CF","1B"];   // 板凳球員守位（僅供顯示／換人對照，不影響能力加成）
  const arch=["contact","power","speed","eye","balanced"];
  const batters=[];
  /* 第 9 位先發原本是「DH 守位」，現在 DH 改由打線上的棒次決定（任何球員都能當），
     所以他改拿一個外野位置；用球隊 id 決定左／右外野，各隊看起來才不會一樣。 */
  const ninthOF=(hashStr("gk-pos9-"+team.id)%2)?"LF":"RF";
  for(let i=0;i<13;i++){
    const p=i<8?pos[i]:(i===8?ninthOF:null);
    const bp=i>=9?benchPos[i-9]:null;
    const a=rpick(arnd,arch);
    let meet=nrm(rnd,52,10),power=nrm(rnd,50,13),eye=nrm(rnd,50,11),speed=nrm(rnd,52,12),def=nrm(rnd,52,11);
    if(a==="contact"){meet+=9;eye+=3;power-=4;}
    if(a==="power"){power+=14;meet-=5;speed-=6;}
    if(a==="speed"){speed+=16;def+=4;power-=7;meet+=1;}
    if(a==="eye"){eye+=14;meet+=2;power+=2;speed-=6;}
    if(p==="C"){def+=12;speed-=8;meet+=2;}
    if(p==="1B"){power+=8;def-=3;speed-=4;}
    if(p==="2B"){def+=8;speed+=4;power-=6;}
    if(p==="3B"){power+=6;def+=3;}
    if(p==="SS"){def+=12;speed+=6;power-=4;}
    if(p==="CF"){def+=8;speed+=8;power-=2;}
    if(p==="LF"||p==="RF"){power+=3;def-=2;}
    const s=team.str;
    batters.push({
      id:team.id+"b"+i, name:mkName(nrnd,used),
      pos:p||(bp||("B"+i)), posLabel:p?POS_ZH[p]:(bp?POS_ZH[bp]:"替補"), bench:i>=9,
      meet:Math.round(clamp(meet+s,25,96)), power:Math.round(clamp(power+s,20,96)),
      eye:Math.round(clamp(eye+s,25,96)), speed:Math.round(clamp(speed+s,20,96)),
      defense:Math.round(clamp(def+s,20,96))
    });
  }
  const pitchers=[];
  for(let i=0;i<6;i++){
    const sp=i<3;
    let velocity=nrm(rnd,sp?62:71,8),control=nrm(rnd,sp?64:60,9),breaking=nrm(rnd,sp?62:68,9),stamina=nrm(rnd,sp?74:42,sp?7:8);
    pitchers.push({
      id:team.id+"p"+i, name:mkName(nrnd,used), role:sp?"先發":"後援", starter:sp,
      velocity:Math.round(clamp(velocity+team.str,25,97)),
      control:Math.round(clamp(control+team.str,25,97)),
      breaking:Math.round(clamp(breaking+team.str,25,97)),
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
