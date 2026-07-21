/* StatusOS v2.9.1 Success OS reliability polish */
(function(){
  'use strict';
  const KEY='statusos_success_os_v2';
  const LEGACY='statusos_mindset_v1';
  const iso=(d=new Date())=>{const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)};
  const defaults={purpose:'I am building Sentury Status Productions into a successful, respected music business that creates financial freedom for my family by consistently creating exceptional value for artists and producers.',why:'I want freedom, security, meaningful creative work, and a stronger future for my family.',identities:['I am a disciplined and highly skilled music producer.','I am a focused business owner who creates value before asking for results.','I finish important work even when I do not feel motivated.','I am a present husband and father.','I take care of my health, energy, and mind.'],days:{}};
  const principles=[
    ['Desire','A clear desire becomes useful when it is specific enough to guide today’s choices.','Write or complete one action that directly supports your main purpose.'],
    ['Faith','Faith grows through repeated thought backed by evidence-producing action.','Do one task today that proves you believe in your own plan.'],
    ['Autosuggestion','What you repeatedly tell yourself influences what you notice and what you attempt.','Read your purpose aloud slowly and with feeling.'],
    ['Specialized knowledge','Success comes from useful knowledge applied to a definite purpose.','Learn one practical thing that improves your craft or business today.'],
    ['Imagination','Ideas become valuable when you shape them into something useful.','Turn one idea into a beat, message, offer, or clear next step.'],
    ['Organized planning','A strong goal needs a simple plan that can survive an imperfect day.','Choose the next smallest executable step and schedule it.'],
    ['Decision','Indecision drains energy. A reasonable decision creates movement and feedback.','Make one delayed decision and move forward.'],
    ['Persistence','Major results are usually small actions repeated longer than most people expect.','Complete one important follow-up you have been avoiding.'],
    ['Mastermind','Progress accelerates when capable people exchange knowledge, support, and honest feedback.','Reach out to one person who can strengthen a goal or whom you can help.'],
    ['Subconscious direction','Your final and first thoughts help set the emotional direction of your day.','End tonight by visualizing tomorrow’s first action completed.'],
    ['Energy and focus','Your mind works better when your body and environment support it.','Protect one focused work block and remove one distraction.'],
    ['Intuition','Good intuition becomes more reliable when it rests on experience, calm attention, and reflection.','Write down one strong instinct, then test it with a small action.']
  ];
  function read(){
    try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw)return {...defaults,...raw,days:raw.days||{},identities:Array.isArray(raw.identities)?raw.identities:defaults.identities};}catch{}
    try{const old=JSON.parse(localStorage.getItem(LEGACY)||'null');if(old)return {...defaults,days:old.days||{}};}catch{}
    return JSON.parse(JSON.stringify(defaults));
  }
  let data=read();
  function write(){localStorage.setItem(KEY,JSON.stringify(data));window.dispatchEvent(new CustomEvent('statusos:success-updated'));render();}
  function current(){const key=iso();data.days[key] ||= {morning:{checks:{}},night:{}};data.days[key].morning ||= {checks:{}};data.days[key].morning.checks ||= {};data.days[key].night ||= {};return data.days[key];}
  function setTab(name){document.querySelectorAll('[data-success-tab]').forEach(b=>b.classList.toggle('active',b.dataset.successTab===name));document.querySelectorAll('[data-success-panel]').forEach(p=>p.classList.toggle('hidden',p.dataset.successPanel!==name));}
  function completeDay(x){return !!(x?.morning?.complete&&x?.night?.complete)}
  function streak(){let n=0,d=new Date();while(completeDay(data.days[iso(d)])){n++;d.setDate(d.getDate()-1)}return n}
  function principle(){const start=new Date(new Date().getFullYear(),0,0);const day=Math.floor((new Date()-start)/86400000);return principles[day%principles.length]}
  function render(){
    const x=current();
    const checks=x.morning.checks||{};
    document.querySelectorAll('[data-mindset-check]').forEach(el=>el.checked=!!checks[el.dataset.mindsetCheck]);
    const set=(id,v,prop='value')=>{const el=document.getElementById(id);if(el&&document.activeElement!==el)el[prop]=v};
    set('mindsetPurposeText',data.purpose,'textContent');set('mindsetIdentityPreview',data.identities.slice(0,3).join(' • '),'textContent');
    set('morningGratitude',x.morning.gratitude||'');set('mindsetAction',x.morning.action||'');set('eveningWins',x.night.wins||'');set('eveningLesson',x.night.lesson||'');set('eveningEvidence',x.night.evidence||'');set('tomorrowPriority',x.night.priority||'');set('successPurposeInput',data.purpose);set('successWhyInput',data.why);
    const done=Object.values(checks).filter(Boolean).length,total=6,pct=Math.round(done/total*100);
    set('morningMindsetProgress',`${done} of ${total} complete`,'textContent');const bar=document.getElementById('morningMindsetBar');if(bar)bar.style.width=`${pct}%`;set('morningScore',`${pct}%`,'textContent');
    const morningDone=document.getElementById('morningTabDone'),nightDone=document.getElementById('nightTabDone');morningDone?.classList.toggle('hidden',!x.morning.complete);nightDone?.classList.toggle('hidden',!x.night.complete);const morningBtn=document.getElementById('completeMorningMindset');if(morningBtn)morningBtn.textContent=x.morning.complete?'Morning Completed':'Complete Morning Ritual';const nightBtn=document.getElementById('saveEveningResetBtn');if(nightBtn)nightBtn.textContent=x.night.complete?'Night Completed':'Complete Night Review';
    const st=streak();set('mindsetStreak',`${st} day streak`,'textContent');set('successCurrentStreak',String(st),'textContent');
    const [pt,pl,pa]=principle();set('dailyPrincipleTitle',pt,'textContent');set('dailyPrincipleLesson',pl,'textContent');set('dailyPrincipleAction',`Today's action: ${pa}`,'textContent');
    const list=document.getElementById('identityList');if(list)list.innerHTML=data.identities.map((v,i)=>`<div class="identity-row"><span>${escapeHtml(v)}</span><button type="button" data-remove-identity="${i}" aria-label="Remove identity">×</button></div>`).join('');
    const keys=Object.keys(data.days).sort().slice(-30),mc=keys.filter(k=>data.days[k].morning?.complete).length,nc=keys.filter(k=>data.days[k].night?.complete).length,dc=keys.filter(k=>completeDay(data.days[k])).length;
    set('successMorningCount',String(mc),'textContent');set('successNightCount',String(nc),'textContent');set('successConsistency',`${Math.round(dc/30*100)}%`,'textContent');
    const hist=document.getElementById('successHistory');if(hist){let rows=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=iso(d),z=data.days[k]||{};rows.push(`<div><span>${d.toLocaleDateString(undefined,{weekday:'short'})}</span><i class="${z.morning?.complete?'done':''}">Morning</i><i class="${z.night?.complete?'done':''}">Night</i></div>`)}hist.innerHTML=rows.join('')}
    const title=document.getElementById('successLaunchTitle'),text=document.getElementById('successLaunchText'),btn=document.getElementById('dashboardSuccessBtn');if(title&&text&&btn){if(!x.morning.complete){title.textContent='Start with purpose';text.textContent='Complete your morning ritual before the day gets noisy.';btn.textContent='Start My Day'}else if(!x.night.complete){title.textContent='Morning ritual complete';text.textContent=x.morning.action?`Today's major win: ${x.morning.action}`:'Carry your purpose into focused action.';btn.textContent='Open Success OS'}else{title.textContent='Day reflected';text.textContent='Your morning and night routines are complete.';btn.textContent='View Progress'}}
  }
  function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function saveMorning(){const x=current();x.morning.checks={};document.querySelectorAll('[data-mindset-check]').forEach(el=>x.morning.checks[el.dataset.mindsetCheck]=el.checked);x.morning.gratitude=document.getElementById('morningGratitude')?.value.trim()||'';x.morning.action=document.getElementById('mindsetAction')?.value.trim()||'';x.morning.complete=Object.keys(x.morning.checks).length===6&&Object.values(x.morning.checks).every(Boolean)&&!!x.morning.gratitude&&!!x.morning.action;x.morning.completedAt=x.morning.complete?(x.morning.completedAt||new Date().toISOString()):null;write()}
  function saveNightDraft(markComplete=false){const x=current(),previousComplete=!!x.night.complete;const next={wins:document.getElementById('eveningWins')?.value.trim()||'',lesson:document.getElementById('eveningLesson')?.value.trim()||'',evidence:document.getElementById('eveningEvidence')?.value.trim()||'',priority:document.getElementById('tomorrowPriority')?.value.trim()||'',complete:previousComplete,completedAt:x.night.completedAt||null};if(markComplete){next.complete=!!(next.wins&&next.lesson&&next.evidence&&next.priority);next.completedAt=next.complete?(next.completedAt||new Date().toISOString()):null}else if(previousComplete&&!(next.wins&&next.lesson&&next.evidence&&next.priority)){next.complete=false;next.completedAt=null}x.night=next;write();return next.complete}
  let timer=null,remaining=60,isPaused=false,audioContext=null;
  function formatTimer(seconds){return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`}
  function prepareAudio(){
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx)return null;
      audioContext ||= new AudioCtx();
      if(audioContext.state==='suspended')audioContext.resume();
      return audioContext;
    }catch{return null}
  }
  function playZenBell(){
    const ctx=prepareAudio();
    if(!ctx)return;
    const now=ctx.currentTime;
    const master=ctx.createGain();
    master.gain.setValueAtTime(0.0001,now);
    master.gain.exponentialRampToValueAtTime(0.22,now+0.02);
    master.gain.exponentialRampToValueAtTime(0.0001,now+4.2);
    master.connect(ctx.destination);
    [528,790,1056].forEach((frequency,index)=>{
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.type=index===0?'sine':'triangle';
      osc.frequency.setValueAtTime(frequency,now);
      osc.frequency.exponentialRampToValueAtTime(frequency*0.985,now+4);
      gain.gain.setValueAtTime(index===0?0.7:0.22/(index+1),now);
      gain.gain.exponentialRampToValueAtTime(0.0001,now+3.7-(index*.35));
      osc.connect(gain);gain.connect(master);osc.start(now);osc.stop(now+4.3);
    });
  }
  function updateTimerUI(status=''){
    const out=document.getElementById('visualizationTimer');
    const startBtn=document.getElementById('startVisualizationBtn');
    const pauseBtn=document.getElementById('pauseVisualizationBtn');
    const statusEl=document.getElementById('visualizationTimerStatus');
    if(out)out.textContent=formatTimer(remaining);
    if(startBtn)startBtn.textContent=remaining===60?'Start 60-second timer':timer?'Running':'Continue';
    if(startBtn)startBtn.disabled=!!timer;
    if(pauseBtn){pauseBtn.disabled=!timer;pauseBtn.textContent='Pause'}
    if(statusEl&&status)statusEl.textContent=status;
  }
  function finishTimer(){
    clearInterval(timer);timer=null;remaining=0;isPaused=false;updateTimerUI('Visualization complete. Carry that picture into your next action.');
    const startBtn=document.getElementById('startVisualizationBtn');if(startBtn){startBtn.disabled=false;startBtn.textContent='Visualize again'}
    const pauseBtn=document.getElementById('pauseVisualizationBtn');if(pauseBtn)pauseBtn.disabled=true;
    const check=document.querySelector('[data-mindset-check="visualize"]');if(check){check.checked=true;saveMorning()}
    playZenBell();
    try{navigator.vibrate?.([60,80,60])}catch{}
  }
  function startTimer(){
    if(timer)return;
    prepareAudio();
    if(remaining<=0)remaining=60;
    isPaused=false;updateTimerUI('Stay still and picture the completed result.');
    timer=setInterval(()=>{remaining=Math.max(0,remaining-1);updateTimerUI();if(remaining<=0)finishTimer()},1000);
  }
  function pauseTimer(){
    if(!timer)return;
    clearInterval(timer);timer=null;isPaused=true;updateTimerUI('Paused. Continue when you are ready.');
    const startBtn=document.getElementById('startVisualizationBtn');if(startBtn){startBtn.disabled=false;startBtn.textContent='Continue'}
  }
  function resetTimer(){
    clearInterval(timer);timer=null;remaining=60;isPaused=false;updateTimerUI('A gentle zen bell will sound when the minute is complete.');
    const startBtn=document.getElementById('startVisualizationBtn');if(startBtn){startBtn.disabled=false;startBtn.textContent='Start 60-second timer'}
  }
  function navigate(view){document.querySelector(`[data-view="${view}"]`)?.click()}
  function bind(){
    document.querySelectorAll('[data-success-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.successTab)));
    document.querySelectorAll('[data-mindset-check]').forEach(el=>el.addEventListener('change',saveMorning));['morningGratitude','mindsetAction'].forEach(id=>document.getElementById(id)?.addEventListener('input',saveMorning));['eveningWins','eveningLesson','eveningEvidence','tomorrowPriority'].forEach(id=>document.getElementById(id)?.addEventListener('input',()=>saveNightDraft(false)));
    document.getElementById('startVisualizationBtn')?.addEventListener('click',startTimer);
    document.getElementById('pauseVisualizationBtn')?.addEventListener('click',pauseTimer);
    document.getElementById('resetVisualizationBtn')?.addEventListener('click',resetTimer);
    document.getElementById('completeMorningMindset')?.addEventListener('click',()=>{saveMorning();const ok=current().morning.complete;const el=document.getElementById('morningMindsetStatus');if(el)el.textContent=ok?'Morning ritual complete. Now prove it with focused action.':'Complete all six steps and fill in gratitude and today’s major win.';if(ok)try{navigator.vibrate?.(20)}catch{}});
    document.getElementById('openPlannerAfterRitual')?.addEventListener('click',()=>navigate('planner'));
    document.getElementById('saveSuccessPurpose')?.addEventListener('click',()=>{data.purpose=document.getElementById('successPurposeInput')?.value.trim()||defaults.purpose;data.why=document.getElementById('successWhyInput')?.value.trim()||'';write();const el=document.getElementById('successPurposeStatus');if(el)el.textContent='Purpose saved and added to your daily ritual.'});
    document.getElementById('addIdentityBtn')?.addEventListener('click',()=>{const input=document.getElementById('newIdentityInput'),v=input?.value.trim();if(!v)return;data.identities.push(v);input.value='';write()});
    document.getElementById('identityList')?.addEventListener('click',e=>{const b=e.target.closest('[data-remove-identity]');if(!b)return;data.identities.splice(Number(b.dataset.removeIdentity),1);write()});
    document.getElementById('saveEveningResetBtn')?.addEventListener('click',()=>{const ok=saveNightDraft(true);const el=document.getElementById('eveningResetStatus');if(el)el.textContent=ok?'Night review complete. Tomorrow begins with a clear direction.':'Your draft is saved. Fill in all four reflection fields to complete the review.';if(ok)try{navigator.vibrate?.(20)}catch{}});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){saveMorning();saveNightDraft(false)}});window.addEventListener('pagehide',()=>{saveMorning();saveNightDraft(false)});
    window.addEventListener('storage',e=>{if(e.key===KEY){data=read();render()}});render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
