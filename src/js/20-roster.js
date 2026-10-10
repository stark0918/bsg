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
  const pos=["C","1B","2B","3B","SS","LF","CF","RF","DH"];
  const arch=["contact","power","speed","eye","balanced"];
  const batters=[];
  for(let i=0;i<13;i++){
    const p=i<9?pos[i]:null;
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
      pos:p||("B"+i), posLabel:p?POS_ZH[p]:"替補", bench:i>=9,
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
    team.batters.concat(team.pitchers).forEach(applyOv);
    teamCache[id]=team;
  }
  return teamCache[id];
}
