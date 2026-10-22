/* ---------- 遊戲設定（管理者可調，存於瀏覽器） ----------
   所有可調參數集中在這裡，管理者面板直接改這個物件；
   遊戲各處透過 CFG.xxx 讀取，改完存檔即生效。
   設定存於 localStorage，與遊戲存檔（生涯）分開，不會被刪除進度影響。 */
const CONFIG_KEY="clubstory_config_v1";
const CONFIG_DEF={
  /* ── 賽制 ── */
  seasonRounds:3,        // 每隊對戰幾輪：2=14天、3=21天、4=28天
  allStar:1,             // 明星賽：1=舉辦、0=不辦
  playoff:1,             // 季後賽：1=舉辦、0=直接由聯盟龍頭封王
  /* ── 評比門檻 ── */
  qBat:0.8,              // 野手入榜所需出賽場次（占本季場次比例）
  qPit:0.35,             // 投手入榜所需出賽場次（占本季場次比例）
  qEraOuts:2,            // 防禦率榜所需出局數（每場場次換算）
  qCyOuts:3.2,           // 最佳投手：先發至少要投滿的局數（每場場次換算）
  qSawOuts:6.4,          // 澤村賞：實質先發（完整承擔）局數（每場場次換算）
  careerAb:200,          // 生涯榜（跨季累計）打席門檻
  /* ── 球員生成 ── */
  strScale:1,            // 球隊強弱差距倍率：0=全聯盟一樣強、1=原本、2=強弱差加倍
  strShift:0,            // 全聯盟整體強度偏移（-5 ~ +5）
  benchBatters:4,        // 板凳打者人數（先發 9 人之外）
  starterPitchers:3,     // 先發投手人數
  reliefPitchers:3,      // 後援投手人數
  posBoost:1,            // 守位能力加成：1=開、0=關
  /* ── 後援上場 ── */
  autoPitcher:1,         // 自動換投：1=開、0=關（先發打到上限或後段守成時自動換牛棚）
  autoPitPitch:85,       // 先發投到多少球就換後援
  autoPitInn:8,          // 第幾局起可以派守成型後援
  autoPitLead:3,         // 守成換投時的最大分差（領先 1~3 分）
  autoPitStamina:75,      // 完投資格：先發體力達到這個值
  autoPitFresh:0.88,      // 完投資格：疲勞係數還要高於這個值（還投得動）
  autoPitMax:145,         // 完投的球數上限（超過就一定換人）
  /* ── 比賽數值 ── */
  runExp:4.3,            // 每隊每場得分期望值
  hitRatio:1.15,         // 安打數 ÷ 得分的係數
  pitOutsMin:15,         // 先發投手單場最少局數
  pitOutsMax:25          // 先發投手單場最多局數
};
let CFG=loadConfig();
function loadConfig(){
  try{
    const raw=localStorage.getItem(CONFIG_KEY);
    if(raw){const o=JSON.parse(raw);if(o&&typeof o==="object")return Object.assign({},CONFIG_DEF,o);}
  }catch(e){}
  return Object.assign({},CONFIG_DEF);
}
function saveConfig(){try{localStorage.setItem(CONFIG_KEY,JSON.stringify(CFG));}catch(e){}}
function resetConfig(){CFG=Object.assign({},CONFIG_DEF);saveConfig();}
/* 讀設定（帶預設值，舊存檔缺欄位也不會壞） */
function cfg(key){const v=CFG[key];return v==null?CONFIG_DEF[key]:v;}
/* 各參數的合理範圍（管理者面板調整時會被夾住，避免調到離譜的值） */
const CFG_LIMITS={
  seasonRounds:[1,6], allStar:[0,1], playoff:[0,1],
  qBat:[0.3,1], qPit:[0.05,1], qEraOuts:[0.5,6], qCyOuts:[0.5,8], qSawOuts:[1,12],
  careerAb:[0,1000],
  strScale:[0,3], strShift:[-5,5], benchBatters:[0,8], starterPitchers:[1,5], reliefPitchers:[1,6], posBoost:[0,1],
  autoPitcher:[0,1], autoPitPitch:[30,150], autoPitInn:[1,12], autoPitLead:[1,8],
  autoPitStamina:[60,97], autoPitFresh:[0.7,1], autoPitMax:[90,200],
  runExp:[1,10], hitRatio:[0.5,3], pitOutsMin:[3,27], pitOutsMax:[4,27]
};
function cfgMin(k){const l=CFG_LIMITS[k];return l?l[0]:0;}
function cfgMax(k){const l=CFG_LIMITS[k];return l?l[1]:999;}
/* 球隊強弱值：差距倍率 × 全體偏移（管理者可調） */
function teamStr(id){
  const def=TEAM_DEFS.find(t=>t.id===id);
  const base=def?def.str:0;
  return base*cfg('strScale')+cfg('strShift');
}
