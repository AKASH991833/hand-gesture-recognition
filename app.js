/* GestureLab - MediaPipe Hands (vendored) + geometric gesture classifier, all local. */
(()=>{
const q=s=>document.querySelector(s);
const stage=q('#stage');
const CONN=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const GESTURES=['open palm','fist','thumbs up','peace','pointing'];
const FINGERS=[['thumb',4,2,17],['index',8,6,0],['middle',12,10,0],['ring',16,14,0],['pinky',20,18,0]];
let hands=null, ready=false, stream=null, video=null, canvas=null, ctx=null, img=null, running=false, padT=null;
let lastT=0, fps=0, sending=false, curGesture='-', curConf=0, lastLogKey=null, lastLogT=0;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function fingerStates(lm){
  // returns {thumb:bool, index:bool, middle:bool, ring:bool, pinky:bool}
  const w=lm[0];
  const ext={};
  ext.index=dist(lm[8],w)>dist(lm[6],w)*1.12;
  ext.middle=dist(lm[12],w)>dist(lm[10],w)*1.12;
  ext.ring=dist(lm[16],w)>dist(lm[14],w)*1.12;
  ext.pinky=dist(lm[20],w)>dist(lm[18],w)*1.12;
  ext.thumb=dist(lm[4],lm[17])>dist(lm[3],lm[17])*1.08;
  return ext;
}
function classify(lm){
  const e=fingerStates(lm);
  const four=e.index&&e.middle&&e.ring&&e.pinky;
  const none=!e.index&&!e.middle&&!e.ring&&!e.pinky;
  if(four)return'open palm';
  if(e.index&&e.middle&&!e.ring&&!e.pinky)return'peace';
  if(e.index&&!e.middle&&!e.ring&&!e.pinky)return'pointing';
  if(none&&e.thumb&&lm[4].y<lm[2].y-0.05)return'thumbs up';
  if(none)return'fist';
  if(e.thumb&&none)return'fist'; // thumb loose, fingers closed
  return null;
}
async function init(){
  hands=new Hands({locateFile:f=>'vendor/hands/'+f});
  hands.setOptions({maxNumHands:2,modelComplexity:1,minDetectionConfidence:0.35,minTrackingConfidence:0.4});
  hands.onResults(onResults);
  // warm up with a tiny blank so wasm compiles
  const c=document.createElement('canvas');c.width=c.height=64;
  await hands.send({image:c});
  ready=true;
  q('#st-model').textContent='hands 21-pt';
}
function setStage(node){
  stage.innerHTML='';
  canvas=document.createElement('canvas');canvas.className='overlay';
  const chip=document.createElement('div');chip.className='gchip';chip.id='gchip';chip.textContent='...';chip.hidden=true;
  stage.append(node,canvas,chip);ctx=canvas.getContext('2d');
}
async function loop(){
  if(!running)return;
  const src=video||img;
  if(src&&ready&&(video?video.readyState>=2:true)&&!sending){
    const w=video?video.videoWidth:img.naturalWidth,h=video?video.videoHeight:img.naturalHeight;
    if(canvas.width!==w){canvas.width=w;canvas.height=h;}
    sending=true;
    const t0=performance.now();
    let feed=src;padT=null;
    if(!video){ // pad stills: the palm detector needs margin around the hand
      const pw=Math.round(w*1.5),ph=Math.round(h*1.5);
      const pc=document.createElement('canvas');pc.width=pw;pc.height=ph;
      const pctx=pc.getContext('2d');pctx.fillStyle='#8a8a8a';pctx.fillRect(0,0,pw,ph);
      pctx.drawImage(src,w*0.25,h*0.25,w,h);
      feed=pc;padT={sx:w/pw,sy:h/ph,ox:0.25,oy:0.25};
    }
    try{await hands.send({image:feed});}catch(e){}
    q('#st-ms').textContent=Math.round(performance.now()-t0);
    sending=false;
    const now=performance.now();
    if(lastT)fps=fps*0.85+1000/(now-lastT)*0.15;
    lastT=now;
    q('#st-fps').textContent=video?fps.toFixed(0):'still';
  }
  if(video)requestAnimationFrame(loop);
}
function onResults(res){
  const src=video||img;if(!src)return;
  const w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  const lms=res.multiHandLandmarks||[];
  q('#st-hands').textContent=lms.length;
  const chip=q('#gchip');
  if(!lms.length){
    chip.hidden=true;
    q('#st-gesture').textContent='-';q('#st-conf').textContent='-';
    q('#fingers').innerHTML='<p style="font-size:13.5px;color:var(--muted)">No hand in view.</p>';
    markGestures(null);curGesture='-';
    return;
  }
  const lm=lms[0].map(p=>padT?{x:(p.x-padT.ox)/padT.sx,y:(p.y-padT.oy)/padT.sy,z:p.z}:p);
  const conf=res.multiHandedness&&res.multiHandedness[0]?res.multiHandedness[0].score:0;
  // draw skeleton
  ctx.lineWidth=Math.max(2,w/420);
  ctx.strokeStyle='rgba(249,115,22,.85)';
  CONN.forEach(([a,b])=>{ctx.beginPath();ctx.moveTo(lm[a].x*w,lm[a].y*h);ctx.lineTo(lm[b].x*w,lm[b].y*h);ctx.stroke();});
  lm.forEach((p,i)=>{
    ctx.beginPath();ctx.arc(p.x*w,p.y*h,Math.max(3,w/160),0,7);
    ctx.fillStyle=i===0?'#dc2626':[4,8,12,16,20].includes(i)?'#fbbf24':'#fff';
    ctx.fill();
  });
  const g=classify(lm);
  curGesture=g||'unknown';
  curConf=conf;
  chip.hidden=false;chip.textContent=curGesture;
  q('#st-gesture').textContent=curGesture;
  q('#st-conf').textContent=(conf*100).toFixed(0)+'%';
  markGestures(g);
  renderFingers(lm);
  if(video)logGesture(g);
}
function renderFingers(lm){
  const e=fingerStates(lm);
  const el=q('#fingers');
  el.innerHTML=FINGERS.map(([name,tip,pip,ref])=>{
    const on=e[name];
    const w=ref===17?dist(lm[4],lm[17]):dist(lm[tip===4?4:tip],lm[0]);
    const base=ref===17?dist(lm[3],lm[17]):dist(lm[pip],lm[0]);
    const pct=Math.min(100,Math.round(w/Math.max(0.001,base)*70));
    return `<div class="frow"><span>${name}</span><div class="tr"><div class="fl" style="width:${pct}%"></div></div><span class="st ${on?'on':''}">${on?'out':'in'}</span></div>`;
  }).join('');
}
function markGestures(g){
  document.querySelectorAll('.gtag').forEach(t=>t.classList.toggle('on',t.dataset.g===g));
}
function logGesture(g){
  if(!g)return;
  const now=performance.now();
  if(g===lastLogKey||now-lastLogT<1500)return;
  lastLogKey=g;lastLogT=now;
  const el=q('#timeline');
  if(el.querySelector('p'))el.innerHTML='';
  const row=document.createElement('div');row.className='tl-row';
  row.innerHTML=`<span class="tl-dot"></span><b>${g}</b><time>${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</time>`;
  el.prepend(row);
  while(el.children.length>30)el.lastChild.remove();
}
async function useVideo(){
  if(!ready){toast('Tracker still loading - one moment');return;}
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:960}},audio:false});}
  catch(e){toast('Camera blocked - allow permission or upload a photo');return;}
  video=document.createElement('video');video.muted=true;video.playsInline=true;video.srcObject=stream;
  await video.play();
  img=null;setStage(video);running=true;loop();
  q('#camBtn').textContent='Stop webcam';
}
function stopVideo(){
  if(stream)stream.getTracks().forEach(t=>t.stop());
  stream=null;video=null;running=false;
  q('#camBtn').textContent='Start webcam';
}
async function useImage(src){
  stopVideo();
  img=new Image();
  img.onload=async()=>{
    setStage(img);running=true;
    for(let i=0;i<3;i++){await loop();await new Promise(r=>setTimeout(r,400));} // a few passes help stills
    running=false;
  };
  img.src=src;
}
q('#camBtn').onclick=()=>video?stopVideo():useVideo();
q('#file').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>useImage(r.result);r.readAsDataURL(f);};
document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>useImage(b.dataset.s));
function toast(msg){const t=document.createElement('div');t.className='toast show';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3200);}
q('#glist').innerHTML=GESTURES.map(g=>`<span class="gtag" data-g="${g}">${g}</span>`).join('');
init().then(()=>useImage('sample-fist.jpg')).catch(e=>{q('#st-model').textContent='load error';toast('Tracker failed to load');console.error(e);});
})();
