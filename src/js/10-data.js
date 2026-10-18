/* ---------- 名稱池 ---------- */
const SU=["王","李","林","陳","張","黃","劉","蔡","楊","吳","許","鄭","謝","郭","洪","曾","廖","賴","徐","周","葉","蘇","莊","江","呂","何","羅","高","蕭","潘","彭","沈","柯","游","溫","盧","侯","石","詹","連","宋","曹","方","田","杜","韓","傅","鍾","涂","范",
          "趙","錢","孫","馬","朱","董","袁","余","姜","蔣","尹","邵","汪","戴","譚","陸","翁","顏","湯","黎","施","孔","莫","嚴","華","魏","顧","阮","歐","紀"];
const GI=["柏融","威晨","智勝","育成","子偉","岱鋼","國輝","泓志","家豪","俊秀","政閔","勝偉","振昌","凱文","均聲","致遠","金鋒","泰山","建民","宸緯","宇翔","冠廷","承翰","翊豪","哲瑄","皓然","凱翔","宥均","秉澄","冠宇","柏霖","宥辰","書豪","睿宸","柏睿","宥嘉","彥廷","子豪","冠緯","家緯","宇宸",
          "明軒","承恩","佳賢","志豪","冠傑","建銘","柏翰","耀輝","天佑","子銘","禹丞","彥博","宗翰","銘豪","哲宇","駿傑","博恩","明傑","建輝","志維",
          "家銘","冠仁","育賢","瑞霖","信哲","承宇","沛宸","立軒","詠恩","振華","豪傑","勝傑","文彥","君毅","奕辰","松軒","正皓","皓宇","培源","詮恩"];
/* ---------- 姓名綁定（名單擴充後，既有球員不再換名） ----------
   原本球員名字是每次開季用亂數從名單重抽，名單一改，全聯盟一起換名。
   現在第一次見到球員就把名字寫進 CAREER.ov，之後以存檔裡的名字為準。
   擴充名單以前開的舊存檔，用 SU_OLD／GI_OLD 重現「當初的名字」，老玩家的球員完全不會變。 */
const NAMEPOOL_V=2;
const SAVEKEY_HINT=["clubstory_save_v1","gekikuukan_baseball_save_v1"];
const SU_OLD=["王","李","林","陳","張","黃","劉","蔡","楊","吳","許","鄭","謝","郭","洪","曾","廖","賴","徐","周","葉","蘇","莊","江","呂","何","羅","高","蕭","潘","彭","沈","柯","游","溫","盧","侯","石","詹","連","宋","曹","方","田","杜","韓","傅","鍾","涂","范"];
const GI_OLD=["柏融","威晨","智勝","育成","子偉","岱鋼","國輝","泓志","家豪","俊秀","政閔","勝偉","振昌","凱文","均聲","致遠","金鋒","泰山","建民","宸緯","宇翔","冠廷","承翰","翊豪","哲瑄","皓然","凱翔","宥均","秉澄","冠宇","柏霖","宥辰","書豪","睿宸","柏睿","宥嘉","彥廷","子豪","冠緯","家緯","宇宸"];
/* 用舊名單重現一支球隊原本的名字順序（先 13 名野手、再 6 名投手，共用同一組不重複記錄） */
function legacyRosterNames(teamId){
  const rnd=mulberry32(hashStr("gk-name-v1-"+teamId)),used=new Set(),out=[];
  const mk=()=>{
    for(let i=0;i<40;i++){const n=rpick(rnd,SU_OLD)+rpick(rnd,GI_OLD);if(!used.has(n)){used.add(n);return n;}}
    return rpick(rnd,SU_OLD)+rpick(rnd,GI_OLD);
  };
  for(let i=0;i<19;i++)out.push(mk());
  return out;
}
/* 綁定整隊球員的名字（getTeam 產生球員後呼叫一次）。
   判斷「這是擴充名單以前的舊存檔嗎」只做一次，結果記在 CAREER.namePool：
   綁定本身會寫進 CAREER.ov，若每支球隊都重新判斷，後面的隊伍會被自己剛寫入的紀錄誤判成舊存檔。 */
function bindRosterNames(team){
  const ov=CAREER.ov=CAREER.ov||{};
  const players=team.batters.concat(team.pitchers);
  // 判斷「這是擴充名單以前的舊存檔嗎」整個存檔只做一次，結果寫進 CAREER.namePool：
  //   0 = 尚未決定、1 = 舊存檔（用舊名單重現原名）、2 = 全新玩家（直接用現行名單）
  // 注意綁定本身會寫進 CAREER.ov，若每支球隊都重新判斷，後面的隊伍會被自己剛寫入的紀錄誤判。
  if(!CAREER.namePool){
    const old=((CAREER.seasons||0)>0)||((CAREER.history||[]).length>0)||Object.keys(ov).length>0||
              SAVEKEY_HINT.some(k=>{try{return !!localStorage.getItem(k);}catch(e){return false;}});
    CAREER.namePool=old?1:NAMEPOOL_V;
  }
  const legacy=CAREER.namePool===1?legacyRosterNames(team.id):null;
  players.forEach((p,i)=>{
    const o=ov[p.id]||(ov[p.id]={});
    if(o.name==null)o.name=(legacy&&legacy[i])||p.name;
  });
}
const POS_ZH={C:"捕手","1B":"一壘手","2B":"二壘手","3B":"三壘手",SS:"游擊手",LF:"左外野",CF:"中外野",RF:"右外野",DH:"指定打擊"};

/* ---------- 球隊定義 ---------- */
const TEAM_DEFS=[
  {id:"azure",  name:"蒼海鯊", short:"鯊", c1:"#17a08a", c2:"#08493f", stadium:"蒼海灣球場", str:5},
  {id:"blaze",  name:"烈焰龍", short:"龍", c1:"#e23b2a", c2:"#7a1408", stadium:"烈焰球場",   str:3},
  {id:"gale",   name:"疾風鷹", short:"鷹", c1:"#9b59b6", c2:"#4a1f63", stadium:"疾風丘球場", str:0},
  {id:"aurora", name:"極光熊", short:"熊", c1:"#2a7de1", c2:"#0b3d78", stadium:"極光巨蛋",   str:-1},
  {id:"thunder",name:"雷神虎", short:"虎", c1:"#e5a11a", c2:"#7a5406", stadium:"雷神山球場", str:-3},
  {id:"phantom",name:"幻影獅", short:"獅", c1:"#4a5b6b", c2:"#1c2530", stadium:"幻影圓頂",   str:-5},
  {id:"emerald",name:"翡翠鹿", short:"鹿", c1:"#2ecc71", c2:"#145a32", stadium:"翡翠森球場", str:2},
  {id:"tangerine",name:"橙狐", short:"狐", c1:"#e67e22", c2:"#7a3b00", stadium:"橙田球場",   str:-2},
];

/* ---------- 生涯（年齡與成長，跨球季保存在瀏覽器） ---------- */
const CAREERKEY="clubstory_career_v1",OLD_CAREERKEY="gekikuukan_career_v1";
let CAREER=normalizeCareer(null);   // 全新玩家（無舊存檔）也要有 career/history/awards 等欄位
function normalizeCareer(d){
  const c=Object.assign({seasons:0,pending:false,ov:{},records:{}},d||{});
  c.ov=c.ov||{};c.records=c.records||{};c.history=c.history||[];c.awards=c.awards||[];c.career=c.career||{bat:{},pit:{}};
  c.lastTeam=c.lastTeam||null;
  c.streakBest=c.streakBest||{};
  c.retirements=c.retirements||[];
  c.debut=c.debut||{};   // pid → 初登場球季（新人王資格用；沒有紀錄＝還沒在完成的球季出賽過）
  c.namePool=c.namePool||0;   // 已綁定的姓名清單版本（0=尚未綁定）
  return c;
}
function loadCareer(){try{const r=localStorage.getItem(CAREERKEY)||localStorage.getItem(OLD_CAREERKEY);if(r)CAREER=normalizeCareer(JSON.parse(r));}catch(e){}}
function saveCareer(){try{localStorage.setItem(CAREERKEY,JSON.stringify(CAREER));localStorage.removeItem(OLD_CAREERKEY);}catch(e){}}
function seasonNo(){return (CAREER.seasons||0)+1;}
/* 上一季率領的球隊（優先取目前球季，其次生涯記錄），用於「續任原隊」 */
function lastTeamId(){
  if(S.season&&S.season.playerTeam)return S.season.playerTeam;
  if(CAREER.lastTeam)return CAREER.lastTeam;
  const h=CAREER.history||[];
  return h.length?h[h.length-1].team:null;
}
function baseAge(id){return 19+(hashStr("age-"+id)%20);}      // 19~38
function applyOv(p){
  p.age=baseAge(p.id);
  const o=CAREER.ov[p.id];if(!o)return;
  if(o.age!=null)p.age=o.age;
  if(o.name)p.name=o.name;
  ["meet","power","eye","speed","defense","mentality","velocity","control","breaking","stamina"].forEach(k=>{if(o[k]!=null)p[k]=o[k];});
}
function ageDelta(a){
  if(a<=21)return ri(0,4);
  if(a<=24)return ri(-1,3);
  if(a<=28)return ri(-1,2);
  if(a<=31)return ri(-2,1);
  if(a<=34)return ri(-3,1);
  if(a<=37)return ri(-3,0);
  return ri(-5,-1);
}
function randName(){return pick(SU)+pick(GI);}
/* 換人時取一個沒被用過的名字：避免新人與在役／已引退球員同名，
   否則同一個名字會在聯盟裡反覆出現，看起來像同一人重出江湖（連帶讓獎項紀錄看起來重複）。 */
let _freshNames=null;
function freshName(){
  if(!_freshNames)_freshNames=takenNames();
  for(let i=0;i<60;i++){const n=randName();if(!_freshNames.has(n)){_freshNames.add(n);return n;}}
  return randName();
}
/* 引退記錄：名字被新人覆蓋前留下名單＋生涯成績快照 */
function recordRetirement(pid,name,teamId,age,pos){
  CAREER.retirements=CAREER.retirements||[];
  const cb=(CAREER.career&&CAREER.career.bat||{})[pid],cp=(CAREER.career&&CAREER.career.pit||{})[pid];
  const line=cb?`出賽${cb.g||0}　安打${cb.h||0}　全壘打${cb.hr||0}　打點${cb.rbi||0}`
    :cp?`出賽${cp.g||0}　勝${cp.w||0}敗${cp.l||0}　救援${cp.sv||0}　三振${cp.k||0}`:"";
  const no=seasonNo(),deb=(CAREER.debut||{})[pid];
  const g=(cb&&cb.g)||(cp&&cp.g)||0;
  // 效力球季數：只有在 debut 可信時才顯示。
  // 舊存檔的 debut 是「紀錄功能上線後」才補的，會算少；用生涯總出賽推一個下限來驗算，
  // 下限都比 debut 算出的球季多 → 判定 debut 不可信，寧可不要顯示錯的數字。
  let seasons=null;
  if(deb>0){
    const perSeason=((S.season&&S.season.schedule)||[]).length||14;
    const minSeasons=Math.ceil(g/perSeason);
    const byDebut=no-deb+1;
    if(minSeasons<=byDebut)seasons=byDebut;
  }
  CAREER.retirements.push({no,pid,name,team:teamId,age:age||null,pos:pos||"",line,
    // 快照：原本的 CAREER.career 與 milestones 在換人後會被清掉（pid 被新人沿用），
    // 不預先存下來的話，引退頁只剩一行文字，點進去看不到生涯資料與里程碑。
    kind:cb?"bat":cp?"pit":"",
    stats:Object.assign({},cb||cp||null),
    miles:Object.assign({},(CAREER.milestones||{})[pid]||null),
    seasons,
    debutSeason:deb>0?deb:null});
}
function advanceCareer(){
  _freshNames=null;   // 本輪換人用的名字集合（避免同隊兩名新人撞名）
  TEAM_DEFS.forEach(def=>{
    const t=teamCache[def.id]||getTeam(def.id);
    t.batters.concat(t.pitchers).forEach(p=>{
      const isPit=p.role!==undefined;
      const o=CAREER.ov[p.id]||(CAREER.ov[p.id]={});
      o.age=(p.age||26)+1;
      const keys=isPit?["velocity","control","breaking","stamina"]:["meet","power","eye","speed","defense","mentality"];
      let trend=0;
      if(o.age>=39){                      // 退休 → 新人
        recordRetirement(p.id,p.name,def.id,p.age,p.posLabel||p.role);
        o.age=ri(19,22);o.name=freshName();
        if(CAREER.career){delete CAREER.career.bat[p.id];delete CAREER.career.pit[p.id];}
        if(CAREER.debut)delete CAREER.debut[p.id];   // 同一 pid 換新人時，初登場紀錄也要清掉
        keys.forEach(k=>{const v=Math.round(clamp(50+rf(-9,9)+(def.str||0),30,76));trend+=v-(p[k]||50);o[k]=v;});
      }else{
        keys.forEach(k=>{const v=Math.round(clamp((p[k]||50)+ageDelta(o.age),20,99));trend+=v-(p[k]||50);o[k]=v;});
      }
      o.trend=trend;
    });
  });
  CAREER.seasons++;CAREER.pending=false;
  saveCareer();
  for(const k in teamCache)delete teamCache[k];
}
