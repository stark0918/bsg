/* ---------- 熱血音效（WebAudio 合成，不需外部檔） ---------- */
let _snd={ctx:null,master:null};
function sndInit(){
  if(_snd.ctx)return;
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    _snd.ctx=new AC();
    if(_snd.ctx.state==="suspended")_snd.ctx.resume();
    _snd.master=_snd.ctx.createGain();
    _snd.master.gain.value=0.32;
    _snd.master.connect(_snd.ctx.destination);
  }catch(e){}
}
function _tone(freq,dur,type,vol,slideTo,delay){
  if(!_snd.ctx)return;
  const t=_snd.ctx.currentTime+(delay||0);
  const o=_snd.ctx.createOscillator(),g=_snd.ctx.createGain();
  o.type=type||"square";o.frequency.setValueAtTime(freq,t);
  if(slideTo)o.frequency.exponentialRampToValueAtTime(slideTo,t+dur);
  g.gain.setValueAtTime(vol||0.2,t);
  g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(g);g.connect(_snd.master);
  o.start(t);o.stop(t+dur+0.02);
}
function _noise(dur,vol,delay,freq,type){
  if(!_snd.ctx)return;
  const t=_snd.ctx.currentTime+(delay||0);
  const len=Math.max(1,Math.floor(_snd.ctx.sampleRate*dur));
  const buf=_snd.ctx.createBuffer(1,len,_snd.ctx.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=(Math.random()*2-1);
  const src=_snd.ctx.createBufferSource();src.buffer=buf;
  const f=_snd.ctx.createBiquadFilter();
  f.type=type||"lowpass";f.frequency.value=freq||800;
  const g=_snd.ctx.createGain();
  g.gain.setValueAtTime(vol||0.3,t);
  g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  src.connect(f);f.connect(g);g.connect(_snd.master);
  src.start(t);src.stop(t+dur+0.02);
}
const SFX={
  crack(){sndInit();_noise(0.12,0.5,0,2600,"highpass");_tone(900,0.06,"square",0.25);},
  hit(){sndInit();_noise(0.07,0.4,0,3000,"highpass");_tone(1800,0.05,"triangle",0.2,700);},
  hr(){sndInit();_noise(0.1,0.55,0,2800,"highpass");_tone(300,0.7,"sawtooth",0.25,60);_noise(1.6,0.35,0.1,1200,"bandpass");_tone(660,0.9,"triangle",0.18,990,0.1);},
  k(){sndInit();_noise(0.16,0.5,0,500,"lowpass");_tone(160,0.35,"sawtooth",0.22,60);},
  out(){sndInit();_tone(220,0.12,"square",0.12,180);},
  wink(){sndInit();_tone(880,0.08,"square",0.12,null,0);_tone(1320,0.1,"square",0.12,null,0.07);},
  cheer(){sndInit();_noise(1.4,0.3,0,900,"bandpass");_tone(392,0.5,"triangle",0.12,523,0.05);},
  charge(){sndInit();[392,523,659,784].forEach((f,i)=>_tone(f,0.22,"square",0.16,null,i*0.12));_noise(1.8,0.3,0.5,1000,"bandpass");},
  champ(){sndInit();[523,659,784,1046].forEach((f,i)=>_tone(f,0.3,"square",0.2,null,i*0.14));_tone(1318,0.7,"triangle",0.2,1046,0.56);_noise(2.2,0.4,0.7,1400,"bandpass");}
};
/* 依上一打席結果播放音效（僅互動回合） */
function playSnd(m){
  if(!m||!m.lastKind)return;
  const k=m.lastKind;
  if(k==="HR")SFX.hr();
  else if(k==="3B"||k==="2B")SFX.hit();
  else if(k==="1B"||k==="BUNTHIT")SFX.crack();
  else if(k==="K")SFX.k();
  else if(k==="BB"||k==="HBP")SFX.wink();
  else if(k==="OUT"||k==="SAC"||k==="BUNTOUT")SFX.out();
  if(m.walkoff)setTimeout(()=>SFX.cheer(),220);
}
document.addEventListener("click",sndInit);