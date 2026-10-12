/* ---------- 新人選秀（球季結束後、開新球季前） ---------- */
/* 規則：例行賽戰績越差越先選（一輪）。你的順位可從 4 名候補中挑人；
   其他球團自動補上最需要的位置。未選到的退休缺口仍由舊機制自動遞補。 */
function prepareDraft(){
  const se=S.season;
  if(se.drafted||se.draft)return;
  const order=standingsList().map(x=>x.id).reverse();   // 戰績差者優先
  const picks=[];
  order.forEach(tid=>{
    const t=getTeam(tid);
    const vac=t.batters.concat(t.pitchers).filter(p=>(p.age||26)>=38);
    if(vac.length){
      const v=vac[0];
      picks.push({teamId:tid,pid:v.id,pos:v.posLabel||v.role||"投手",kind:v.role!==undefined?"pit":"bat"});
    }
  });
  se.draftLog=se.draftLog||[];
  if(!picks.length){se.drafted=true;return;}
  se.draft={picks,idx:0,cands:null,done:false};
}
function draftCurrentPick(){
  const d=S.season.draft;
  return d&&d.picks[d.idx];
}
function draftCandidates(pick){
  const rng=mulberry32(hashStr("gk-draft-"+pick.teamId+"-"+pick.pid));
  const used=new Set();
  const str=getTeam(pick.teamId).str;
  const base=52+str;
  const nf=a=>(rng()-0.5)*2*a;
  const aro=rpick(rng,pick.kind==="pit"?["power","control","ground"]:["slug","contact","speed","balanced"]);
  const cands=[];
  for(let i=0;i<4;i++){
    let name="";
    for(let k=0;k<20;k++){const n=rpick(rng,SU)+rpick(rng,GI);if(!used.has(n)){used.add(n);name=n;break;}}
    if(!name)name=rpick(rng,SU)+rpick(rng,GI);
    const age=Math.round(rng()*3+19);
    if(pick.kind==="pit"){
      let velocity=base+nf(12),control=base+nf(11),breaking=base+nf(11),stamina=60+nf(14);
      if(aro==="power"){velocity+=10;control-=5;breaking+=2;}
      if(aro==="control"){control+=12;velocity-=4;breaking+=2;}
      if(aro==="ground"){breaking+=6;control+=4;velocity-=3;}
      cands.push({id:pick.pid+"-c"+i,teamId:pick.teamId,name,age,role:"先發",posLabel:pick.pos,
        velocity:Math.round(clamp(velocity,30,95)),control:Math.round(clamp(control,30,95)),
        breaking:Math.round(clamp(breaking,30,95)),stamina:Math.round(clamp(stamina,30,92))});
    }else{
      let meet=base+nf(11),power=base+nf(13),eye=base+nf(10),speed=54+nf(14),defense=base+nf(10);
      if(aro==="slug"){power+=13;meet-=6;speed-=5;}
      if(aro==="contact"){meet+=11;eye+=3;power-=5;}
      if(aro==="speed"){speed+=15;defense+=3;power-=6;}
      if(aro==="balanced"){eye+=5;defense+=3;}
      cands.push({id:pick.pid+"-c"+i,teamId:pick.teamId,name,age,posLabel:pick.pos,
        meet:Math.round(clamp(meet,30,95)),power:Math.round(clamp(power,30,95)),
        eye:Math.round(clamp(eye,30,95)),speed:Math.round(clamp(speed,25,95)),
        defense:Math.round(clamp(defense,28,95))});
    }
  }
  return cands;
}
function draftBest(cands){let bi=0,bv=-1;cands.forEach((c,i)=>{const v=playerOverall(c);if(v>bv){bv=v;bi=i;}});return bi;}
function applyDraftRookie(pick,rookie){
  const p=playerById(pick.pid);
  const o=CAREER.ov[pick.pid]||(CAREER.ov[pick.pid]={});
  const keys=rookie.role!==undefined?["velocity","control","breaking","stamina"]:["meet","power","eye","speed","defense"];
  let trend=0;
  keys.forEach(k=>{trend+=rookie[k]-(p?p[k]:52);o[k]=rookie[k];});
  o.name=rookie.name;o.age=rookie.age;o.trend=trend;
  if(CAREER.career){delete CAREER.career.bat[pick.pid];delete CAREER.career.pit[pick.pid];}
  S.season.draftLog.push({teamId:pick.teamId,name:rookie.name,pos:pick.pos,age:rookie.age,pid:pick.pid,season:seasonNo()});
}
function draftJudge(){
  if(!S.season.draft)return;
  let d=S.season.draft,guard=0;
  while(d&&d.idx<d.picks.length&&d.picks[d.idx].teamId!==S.season.playerTeam&&guard++<50){
    const pick=d.picks[d.idx];const cs=draftCandidates(pick);
    applyDraftRookie(pick,cs[draftBest(cs)]);d.idx++;d.cands=null;
  }
  if(S.season.draft&&S.season.draft.idx>=S.season.draft.picks.length){
    S.season.drafted=true;S.season.draft=null;
    for(const k in teamCache)delete teamCache[k];   // 讓選秀結果反映到名冊
    saveGame();
  }
}
/* ---------- 選秀畫面 ---------- */
function candCard(c,pick,idx){
  const grade=gradeOf(playerOverall(c));
  const bars=c.role!==undefined
    ? ["球速","控球","變化","體力"].map((l,i)=>rbar(l,[c.velocity,c.control,c.breaking,c.stamina][i])).join("")
    : ["打擊","力量","選球","速度","守備"].map((l,i)=>rbar(l,[c.meet,c.power,c.eye,c.speed,c.defense][i])).join("");
  return `<div class="panel cand">
    <div class="cand-top">${playerAvatar(c,40)}<div><div class="nm">${esc(c.name)}　<span class="grade g-${grade}">${grade}</span> <span class="pill off">${c.age} 歲</span></div>
      <div class="meta">${esc(c.posLabel)}　·　候補</div></div></div>
    <div class="bars">${bars}</div>
    <button class="btn gold blk" data-act="draftPick" data-arg="${idx}">★ 指名 ${esc(c.name)}</button>
  </div>`;
}
function viewDraft(){
  const se=S.season;
  if(!se.draft||se.draft.idx>=se.draft.picks.length){
    const log=(se.draftLog||[]).map((x,i)=>`<tr><td class="num">${i+1}</td><td class="name">${teamBadge(x.teamId)}</td><td class="name">${esc(x.name)}</td><td>${esc(x.pos)}</td><td class="num">${x.age} 歲</td></tr>`).join("");
    return `<div class="panel center"><h2>⭐ 新人選秀結束</h2>
      <p class="muted">新人們已陸續入團，下一球季就靠他們了！</p></div>
      <div class="panel"><h2>指名結果</h2><table class="grid"><tr><th>#</th><th>球團</th><th>指名新人</th><th>位置</th><th>年齡</th></tr>${log}</table>
      <div class="hr"></div>
      <button class="btn red blk" data-act="newgame">開始新球季</button>
      <button class="btn blk" data-act="awards">🏆 頒獎典禮</button>
      <button class="btn blk" data-act="backHub">← 回球季總部</button></div>`;
  }
  const d=se.draft,pick=d.picks[d.idx];
  const isMe=pick.teamId===se.playerTeam;
  const cands=draftCandidates(pick);
  const step=`<span class="pill ${isMe?"on":""}">第 ${d.idx+1} 順位（${getTeam(pick.teamId).name}）</span>`;
  const body=isMe
    ? `<p class="muted">輪到你的球團指名！從以下 4 名候補中選 1 人加入（其餘缺口由自動選秀補齊）。</p>
       <div class="two">${cands.map((c,i)=>candCard(c,pick,i)).join("")}</div>
       <div class="hr"></div>
       <button class="btn gold blk" data-act="draftAuto">🤖 自動選最強</button>`
    : `<p class="muted">其他球團正在指名新人…</p>
       <div class="hr"></div>
       <button class="btn blk" data-act="draftNext">▶ 下一順位</button>
       <button class="btn blk" data-act="draftAuto">🤖 直接看到結束</button>`;
  return `<div class="panel center"><h2>⭐ 新人選秀</h2><p class="muted">例行賽戰績越差順位越前面（一輪制）。</p>${step}</div>
    <div class="panel center">
      <div class="teamcard"><div><div class="nm">${teamBadge(pick.teamId)}</div>
      <div class="meta">指名順位：第 ${d.idx+1} 位 · 補強位置：${esc(pick.pos)}</div></div></div>
    </div>
    ${body}`;
}