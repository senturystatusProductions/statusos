/* StatusOS v3.7.0 Performance Timer */
(function(){
  'use strict';
  const PREF='statusos_performance_timer_v1';
  const HISTORY='statusos_workout_history_v1';
  const bells={1:'./sounds/boxing-bell-1.wav',2:'./sounds/boxing-bell-2.wav',3:'./sounds/boxing-bell-3.wav'};
  const presets={
    tabata:{mode:'tabata',work:20,rest:10,rounds:8,warmup:10,cooldown:0},
    boxing:{mode:'boxing',work:180,rest:60,rounds:5,warmup:10,cooldown:0},
    kettlebell:{mode:'hiit',work:40,rest:20,rounds:10,warmup:30,cooldown:30},
    skipping:{mode:'boxing',work:180,rest:60,rounds:8,warmup:30,cooldown:30}
  };
  let mode='focus',running=false,paused=false,timer=null,phase='ready',round=1,remaining=0,phaseDuration=0,halfwayPlayed=false,startedAt=0,workoutElapsed=0,stopwatchElapsed=0;
  let audio=null;
  const $=id=>document.getElementById(id);
  const readPrefs=()=>{try{return {...{work:20,rest:10,rounds:8,warmup:10,cooldown:0,halfway:true,voice:false,vibrate:true},...JSON.parse(localStorage.getItem(PREF)||'{}')}}catch{return {work:20,rest:10,rounds:8,warmup:10,cooldown:0,halfway:true,voice:false,vibrate:true}}};
  const savePrefs=()=>{const p=getConfig();localStorage.setItem(PREF,JSON.stringify(p));};
  const getConfig=()=>({work:Math.max(1,+$('performanceWork')?.value||20),rest:Math.max(0,+$('performanceRest')?.value||0),rounds:Math.max(1,+$('performanceRounds')?.value||8),warmup:Math.max(0,+$('performanceWarmup')?.value||0),cooldown:Math.max(0,+$('performanceCooldown')?.value||0),halfway:!!$('performanceHalfway')?.checked,voice:!!$('performanceVoice')?.checked,vibrate:!!$('performanceVibrate')?.checked});
  function playBell(n){try{audio?.pause();audio=new Audio(bells[n]);audio.volume=.9;audio.play().catch(()=>{});if(getConfig().vibrate&&navigator.vibrate)navigator.vibrate(n===3?[200,100,200,100,400]:[180]);}catch{}}
  function speak(text){if(!getConfig().voice||!('speechSynthesis'in window))return;try{speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(text));}catch{}}
  function fmt(sec){sec=Math.max(0,Math.floor(sec));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}
  function setVisual(next){const ring=$('pomodoroRing');ring?.classList.remove('performance-work','performance-rest','performance-halfway','performance-done','performance-ready');ring?.classList.add(`performance-${next}`);}
  function update(){
    const display=$('pomodoroDisplay'),modeLabel=$('pomodoroMode'),phaseLabel=$('performancePhaseLabel'),roundLabel=$('performanceRoundLabel');
    if(display)display.textContent=fmt(mode==='stopwatch'?stopwatchElapsed:remaining);
    if(modeLabel)modeLabel.textContent=mode==='stopwatch'?'STOPWATCH':phase.toUpperCase();
    if(phaseLabel)phaseLabel.textContent=phase.toUpperCase();
    if(roundLabel)roundLabel.textContent=mode==='stopwatch'?'Open timer':`Round ${Math.min(round,getConfig().rounds)} / ${getConfig().rounds}`;
    const pct=phaseDuration?Math.min(1,Math.max(0,(phaseDuration-remaining)/phaseDuration)):0;
    $('pomodoroRing')?.style.setProperty('--timer-progress',`${pct*360}deg`);
    const start=$('pomodoroStart');if(start)start.textContent=running?'▶ Running':paused?'▶ Continue':'▶ Start';
    const pause=$('pomodoroPause');if(pause)pause.disabled=!running;
  }
  function setPhase(next,seconds){phase=next;phaseDuration=Math.max(0,seconds);remaining=phaseDuration;halfwayPlayed=false;setVisual(next);if(next==='work'){playBell(1);speak(`Round ${round}. Work.`)}else if(next==='rest'){playBell(2);speak('Rest.')}else if(next==='cooldown'){playBell(2);speak('Cool down.')}update();}
  function begin(){
    if(mode==='focus')return;
    if(running)return;
    if(paused){running=true;paused=false;timer=setInterval(tick,1000);update();return;}
    const c=getConfig();savePrefs();startedAt=Date.now();workoutElapsed=0;round=1;stopwatchElapsed=0;running=true;paused=false;
    if(mode==='stopwatch'){phase='work';phaseDuration=0;remaining=0;setVisual('work');timer=setInterval(tick,1000);speak('Start.');update();return;}
    if(mode==='emom'){c.rest=0;$('performanceRest').value=0;}
    if(c.warmup>0){setPhase('ready',c.warmup);speak('Get ready.')}else setPhase('work',c.work);
    timer=setInterval(tick,1000);update();
  }
  function tick(){
    if(!running)return;
    if(mode==='stopwatch'){stopwatchElapsed++;workoutElapsed++;update();return;}
    remaining--;workoutElapsed++;
    const c=getConfig();
    if(phase==='work'&&c.halfway&&!halfwayPlayed&&phaseDuration>=10&&remaining===Math.floor(phaseDuration/2)){halfwayPlayed=true;playBell(2);speak('Halfway.');setVisual('halfway');setTimeout(()=>{if(phase==='work')setVisual('work')},650)}
    if(remaining<=0)advance();else update();
  }
  function advance(){const c=getConfig();if(phase==='ready'){setPhase('work',c.work);return}if(phase==='work'){if(round>=c.rounds){if(c.cooldown>0)setPhase('cooldown',c.cooldown);else complete();return}if(c.rest>0)setPhase('rest',c.rest);else{round++;setPhase('work',c.work)}return}if(phase==='rest'){round++;setPhase('work',c.work);return}if(phase==='cooldown')complete();}
  function pause(){if(mode==='focus'||!running)return;running=false;paused=true;clearInterval(timer);timer=null;speak('Paused.');update();}
  function reset(){if(mode==='focus')return;running=false;paused=false;clearInterval(timer);timer=null;audio?.pause();phase='ready';round=1;remaining=mode==='stopwatch'?0:getConfig().work;phaseDuration=remaining;stopwatchElapsed=0;setVisual('ready');update();$('pomodoroStatus').textContent='Ready when you are.';}
  function complete(){running=false;paused=false;clearInterval(timer);timer=null;phase='done';remaining=0;setVisual('done');playBell(3);speak('Workout complete. Great work.');recordWorkout();$('pomodoroStatus').textContent='Workout complete. Great work.';update();}
  function recordWorkout(){const today=new Date().toISOString().slice(0,10);let h=[];try{h=JSON.parse(localStorage.getItem(HISTORY)||'[]')}catch{}h.push({date:today,mode,seconds:Math.max(1,workoutElapsed),rounds:mode==='stopwatch'?0:getConfig().rounds,completedAt:new Date().toISOString()});localStorage.setItem(HISTORY,JSON.stringify(h.slice(-500)));renderStats();window.dispatchEvent(new CustomEvent('statusos:workout-completed',{detail:h[h.length-1]}));}
  function renderStats(){let h=[];try{h=JSON.parse(localStorage.getItem(HISTORY)||'[]')}catch{}const days=new Set(h.map(x=>x.date)),today=new Date();let streak=0;for(let i=0;i<366;i++){const d=new Date(today);d.setDate(today.getDate()-i);const k=d.toISOString().slice(0,10);if(days.has(k))streak++;else if(i===0)continue;else break}$('performanceWorkoutCount').textContent=h.length;$('performanceWorkoutMinutes').textContent=`${Math.round(h.reduce((a,x)=>a+(x.seconds||0),0)/60)} min`;$('performanceRoundsTotal').textContent=h.reduce((a,x)=>a+(x.rounds||0),0);$('performanceWorkoutStreak').textContent=`${streak} days`;}
  function applyPreset(name){const p=presets[name];if(!p)return;setMode(p.mode);$('performanceWork').value=p.work;$('performanceRest').value=p.rest;$('performanceRounds').value=p.rounds;$('performanceWarmup').value=p.warmup;$('performanceCooldown').value=p.cooldown;savePrefs();reset();}
  function setMode(next){
    if(next===mode)return; if(mode!=='focus')reset(); mode=next;
    document.querySelectorAll('[data-performance-mode]').forEach(b=>b.classList.toggle('active',b.dataset.performanceMode===mode));
    const workout=mode!=='focus';$('performanceWorkoutPanel')?.classList.toggle('hidden',!workout);$('performanceWorkoutStats')?.classList.toggle('hidden',!workout);document.querySelectorAll('.pomodoro-focus-only').forEach(el=>el.classList.toggle('hidden',workout));
    const taskSelect=$('pomodoroTaskSelect')?.closest('label');if(taskSelect)taskSelect.classList.toggle('hidden',workout);
    if(mode==='tabata'){Object.assign($('performanceWork'),{value:20});$('performanceRest').value=10;$('performanceRounds').value=8}
    if(mode==='boxing'){Object.assign($('performanceWork'),{value:180});$('performanceRest').value=60;$('performanceRounds').value=5}
    if(mode==='emom'){Object.assign($('performanceWork'),{value:60});$('performanceRest').value=0;$('performanceRounds').value=10}
    if(mode==='stopwatch'){$('performancePhaseLabel').textContent='OPEN TIMER'}
    if(workout){$('pomodoroCurrentTask').textContent=mode==='stopwatch'?'Open workout timer':`${mode.toUpperCase()} workout`;reset();$('pomodoroStatus').textContent='Set your intervals and press Start.';}else{setVisual('ready');$('pomodoroStatus').textContent='Choose a task and press Start.';}
  }
  function intercept(id,fn){$(id)?.addEventListener('click',e=>{if(mode==='focus')return;e.preventDefault();e.stopImmediatePropagation();fn();},true)}
  function bind(){
    const p=readPrefs();for(const [id,key] of [['performanceWork','work'],['performanceRest','rest'],['performanceRounds','rounds'],['performanceWarmup','warmup'],['performanceCooldown','cooldown']])if($(id))$(id).value=p[key];if($('performanceHalfway'))$('performanceHalfway').checked=p.halfway;if($('performanceVoice'))$('performanceVoice').checked=p.voice;if($('performanceVibrate'))$('performanceVibrate').checked=p.vibrate;
    document.querySelectorAll('[data-performance-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.performanceMode)));
    document.querySelectorAll('[data-workout-preset]').forEach(b=>b.addEventListener('click',()=>applyPreset(b.dataset.workoutPreset)));
    document.querySelectorAll('[data-preview-bell]').forEach(b=>b.addEventListener('click',()=>playBell(+b.dataset.previewBell)));
    document.querySelectorAll('#performanceWorkoutPanel input').forEach(el=>el.addEventListener('change',()=>{savePrefs();if(!running)reset()}));
    intercept('pomodoroStart',begin);intercept('pomodoroPause',pause);intercept('pomodoroRestart',reset);intercept('pomodoroStopAlarm',reset);
    renderStats();update();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
