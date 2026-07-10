import './styles.css';
import { createMaterial } from './material.js';
import { createFeedback, detectTier } from './feedback.js';
import { createConductor } from './conductor.js';

const states={
  stillness:{value:0,code:'静',noun:'静观',drift:'0.18',title:['当世界','不再索取','何物仍在'],copy:'让注意力缓慢沉降。此刻，不必抵达任何结果。'},
  curiosity:{value:1,code:'问',noun:'好奇',drift:'0.43',title:['跟随那些','仍不肯变得','熟悉的事物'],copy:'不急着抵达，只沿着陌生的边缘继续触碰。'},
  resolve:{value:2,code:'定',noun:'笃定',drift:'0.71',title:['把全部重量','交给一个','真正的选择'],copy:'让意图停留得足够久，直到它拥有自己的形状。'}
};
const titles={
  stillness:[['静默之中','仍有在场'],['留白抵达','恰好之处']],
  curiosity:[['问题仍在','向外生长'],['陌生之处','正在发生']],
  resolve:[['一线既择','便完整留下'],['重量落定','形状自明']]
};
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
const tier=detectTier();const tierName={A:'甲',B:'乙',C:'丙'}[tier];document.documentElement.dataset.tier=tier;
const pointerHistory=[];let currentState='stillness',act='attune',statusTimer,inscriptionStart=0,inscriptionFrame,velocity=0,lastPoint=null,distance=0,peaks=0;
const conductor=createConductor();
const feedback=createFeedback(document.querySelector('#feedback'),{tier});
const phaseValue=document.querySelector('#phase-value'),phaseMarker=document.querySelector('#phase-marker');
const material=createMaterial(document.querySelector('#material'),{reducedMotion:reduceMotion,onTick(time,pointer){phaseValue.textContent=(time%1).toFixed(3);phaseMarker.style.top=`${(time*7)%96}%`;if(act==='attune'){pointerHistory.push({x:pointer.x,y:pointer.y,t:time,v:0});if(pointerHistory.length>240)pointerHistory.shift();}}});
if(!material)document.documentElement.classList.add('no-webgl');
const $=selector=>document.querySelector(selector);
const thesis=$('.thesis'),title=$('#thesis-title'),noun=$('#state-noun'),stateCopy=$('#state-copy'),driftValue=$('#drift-value'),fieldValue=$('#field-value'),status=$('#status');
const now=new Date();$('#session-id').textContent=`照—${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
function announce(message){status.textContent=message;status.classList.add('show');clearTimeout(statusTimer);statusTimer=setTimeout(()=>status.classList.remove('show'),2200);}
function setState(key){if(!states[key]||key===currentState||act!=='attune')return;currentState=key;const next=states[key];document.body.dataset.state=key;document.querySelectorAll('.state-button').forEach(button=>{const active=button.dataset.state===key;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});thesis.classList.add('transitioning');material?.setState(next.value);material?.addEnergy(.35);feedback?.setQuality(next.value);setTimeout(()=>{title.innerHTML=`<span>${next.title[0]}</span><em>${next.title[1]}</em><span>${next.title[2]}</span>`;noun.textContent=next.noun;stateCopy.textContent=next.copy;driftValue.textContent=next.drift;fieldValue.textContent=next.code;thesis.classList.remove('transitioning');},reduceMotion.matches?0:380);announce(`${next.noun}已被选择`);}
document.querySelectorAll('.state-button').forEach(button=>button.addEventListener('click',()=>setState(button.dataset.state)));

const holdButton=$('#hold-button'),holdProgress=$('.hold-progress');let holdStart=0,holdFrame=null,holding=false;
function updateHold(nowTime){if(!holding)return;const progress=Math.min(1,(nowTime-holdStart)/1800);holdProgress.style.strokeDashoffset=String(465*(1-progress));material?.addEnergy(.03);if(progress>=1){holding=false;holdButton.classList.remove('holding');enterInscription();return;}holdFrame=requestAnimationFrame(updateHold);}
function startHold(event){event.preventDefault();if(holding||act!=='attune')return;holding=true;holdStart=performance.now();holdButton.classList.add('holding');holdButton.setPointerCapture?.(event.pointerId);holdFrame=requestAnimationFrame(updateHold);}
function cancelHold(){if(!holding)return;holding=false;cancelAnimationFrame(holdFrame);holdProgress.style.strokeDashoffset='465';holdButton.classList.remove('holding');}
holdButton.addEventListener('pointerdown',startHold);holdButton.addEventListener('pointerup',cancelHold);holdButton.addEventListener('pointercancel',cancelHold);holdButton.addEventListener('keydown',event=>{if((event.key===' '||event.key==='Enter')&&!event.repeat)startHold(event);});holdButton.addEventListener('keyup',event=>{if(event.key===' '||event.key==='Enter')cancelHold();});

function enterInscription(){act='inscribe';document.body.dataset.act='inscribe';$('#inscription').setAttribute('aria-hidden','false');feedback?.setQuality(states[currentState].value);feedback?.activate(true);inscriptionStart=performance.now();pointerHistory.length=0;lastPoint=null;distance=0;peaks=0;conductor.start();announce('刻写空间已经开启');inscriptionFrame=requestAnimationFrame(tickInscription);}
function injectAt(clientX,clientY){if(act!=='inscribe')return;const point={x:clientX/innerWidth,y:clientY/innerHeight,t:performance.now()};if(lastPoint){const dx=point.x-lastPoint.x,dy=point.y-lastPoint.y,dt=Math.max(8,point.t-lastPoint.t);const instantaneous=Math.min(1,Math.hypot(dx,dy)*1200/dt);velocity=velocity*.68+instantaneous*.32;distance+=Math.hypot(dx,dy);if(instantaneous>.72)peaks+=1;}lastPoint=point;pointerHistory.push({...point,v:velocity});if(pointerHistory.length>1000)pointerHistory.shift();feedback?.inject(point.x,point.y,.12+velocity*.78);material?.addEnergy(.06+velocity*.12);}
addEventListener('pointermove',event=>injectAt(event.clientX,event.clientY),{passive:true});addEventListener('touchmove',event=>{const touch=event.touches[0];if(touch)injectAt(touch.clientX,touch.clientY);},{passive:true});
function tickInscription(nowTime){if(act!=='inscribe')return;const elapsed=(nowTime-inscriptionStart)/1000,progress=Math.min(1,elapsed/12);$('#inscription-time').textContent=Math.max(0,12-elapsed).toFixed(1);$('#inscription-progress').style.transform=`scaleX(${progress})`;$('#velocity-value').textContent=velocity.toFixed(3);velocity*=.94;conductor.update({energy:velocity,velocity,quality:states[currentState].value,progress});if(progress>=1){release();return;}inscriptionFrame=requestAnimationFrame(tickInscription);}
$('#release-now').addEventListener('click',release);

function seeded(seed){let value=seed%2147483647;return()=> (value=value*16807%2147483647)/2147483647;}
function release(){if(act!=='inscribe')return;act='release';cancelAnimationFrame(inscriptionFrame);feedback?.activate(false);conductor.update({energy:0,velocity:0,quality:states[currentState].value,progress:1});setTimeout(()=>conductor.stop(),550);const seed=drawFinalPlate();const options=titles[currentState];const chosen=options[Math.min(options.length-1,Math.floor((distance*10+peaks)%options.length))];$('#trace-title').innerHTML=`${chosen[0]}<br><em>${chosen[1]}</em>`;$('#trace-prologue').innerHTML=`你的${states[currentState].noun}<br>已经成为一次材质事件。`;$('#trace-reading').textContent=`路径 ${distance.toFixed(2)} · 脉冲 ${peaks} · 场值 ${feedback?.sample().join('/')||'本地'}`;$('#trace-code').textContent=`照—${String(seed).padStart(6,'0')}`;$('#trace-meta').textContent=`${states[currentState].noun} · ${(performance.now()-inscriptionStart).toFixed(0)} 毫秒 · ${tier}渲染等级  · 仅限本地`;document.body.dataset.act='release';$('#trace-overlay').classList.add('open');$('#trace-overlay').setAttribute('aria-hidden','false');$('#download-trace').focus();announce('此刻已经凝结成形');}
function drawFinalPlate(){const canvas=$('#trace-canvas'),ratio=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*ratio;canvas.height=innerHeight*ratio;const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);ctx.clearRect(0,0,innerWidth,innerHeight);const seed=(Date.now()+Math.floor(distance*10000)+peaks*97)%1000000,random=seeded(seed);const colors=currentState==='stillness'?['#ebe7df','#8898aa','#90788c']:currentState==='curiosity'?['#e8e3da','#5e9b89','#b26e96']:['#e7e2d9','#d17462','#568d80'];ctx.globalCompositeOperation='screen';const usable=pointerHistory.length?pointerHistory:[{x:.5,y:.5,v:.1}];for(let ribbon=0;ribbon<7;ribbon++){ctx.beginPath();usable.forEach((point,index)=>{const x=innerWidth*(.48+point.x*.42)+(ribbon-3)*5+Math.sin(index*.12+ribbon)*point.v*18;const y=innerHeight*(.16+point.y*.68)+(ribbon-3)*4;index===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});ctx.strokeStyle=colors[ribbon%colors.length];ctx.globalAlpha=.1+ribbon*.025;ctx.lineWidth=.55+ribbon*.12;ctx.stroke();}
 for(let i=0;i<150+peaks*3;i++){const source=usable[Math.floor(random()*usable.length)];const x=innerWidth*(.48+source.x*.42)+(random()-.5)*100*(.2+source.v);const y=innerHeight*(.16+source.y*.68)+(random()-.5)*80*(.2+source.v);ctx.beginPath();ctx.arc(x,y,.3+random()*1.8,0,Math.PI*2);ctx.fillStyle=colors[i%colors.length];ctx.globalAlpha=.18+random()*.62;ctx.fill();}return seed;}
$('#restart-trace').addEventListener('click',()=>location.reload());
$('#download-trace').addEventListener('click',()=>{const link=document.createElement('a');link.download=`照见-${states[currentState].noun}-私人痕迹.png`;link.href=$('#trace-canvas').toDataURL('image/png');link.click();announce('私人痕迹已准备保存');});
const aboutDialog=$('#about-dialog');$('#about-open').addEventListener('click',()=>aboutDialog.showModal());$('#about-close').addEventListener('click',()=>aboutDialog.close());aboutDialog.addEventListener('click',event=>{if(event.target===aboutDialog)aboutDialog.close();});
const soundToggle=$('#sound-toggle');soundToggle.addEventListener('click',()=>{const enabled=!conductor.enabled;soundToggle.setAttribute('aria-pressed',String(enabled));soundToggle.querySelector('span:last-child').textContent=enabled?'环境声开启':'环境声关闭';enabled?conductor.start():conductor.stop();});
