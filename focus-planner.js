/* StatusOS v3.5.0 Focus Planner & Pomodoro */
(function(){
  'use strict';
  const KEY='statusos_success_os_v2';
  const quotes=[
    ['Challenges are what make life interesting, and overcoming them is what makes life meaningful.','Joshua J. Marine'],
    ['Success is the sum of small efforts, repeated day in and day out.','Robert Collier'],
    ['The secret of getting ahead is getting started.','Mark Twain'],
    ['You do not have to see the whole staircase, just take the first step.','Martin Luther King Jr.'],
    ['What you do today can improve all your tomorrows.','Ralph Marston'],
    ['Great things are done by a series of small things brought together.','Vincent van Gogh'],
    ['Focus on being productive instead of busy.','Tim Ferriss'],
    ['The future depends on what you do today.','Mahatma Gandhi'],
    ['Action is the foundational key to all success.','Pablo Picasso'],
    ['A year from now you may wish you had started today.','Karen Lamb'],
    ['It always seems impossible until it is done.','Nelson Mandela'],
    ['Discipline is choosing between what you want now and what you want most.','Abraham Lincoln']
  ];
  const escapeHtml=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const iso=(d=new Date())=>{const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)};
  let selectedDate=window.StatusOSSuccessDate?.get?.()||iso();
  let duration=25*60, remaining=duration, running=false, endAt=0, ticker=null, mode='focus', audioCtx=null;

  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return {}}}
  function day(){const data=read();data.days ||= {};data.days[selectedDate] ||= {morning:{checks:{}},night:{},planner:{}};data.days[selectedDate].planner ||= {};const p=data.days[selectedDate].planner;p.tasks ||= Array.from({length:5},()=>({text:'',target:1,actual:0}));while(p.tasks.length<5)p.tasks.push({text:'',target:1,actual:0});p.stats ||= {sessions:0,focusMinutes:0,breakMinutes:0};return {data,p}}
  function save(mutator){const {data,p}=day();mutator(p);localStorage.setItem(KEY,JSON.stringify(data));window.dispatchEvent(new CustomEvent('statusos:success-updated'));renderPlanner()}
  function quoteForDate(){const n=selectedDate.replaceAll('-','').split('').reduce((a,b)=>a+Number(b),0);return quotes[n%quotes.length]}
  function taskMarkup(task,index){const bubbles=Array.from({length:5},(_,i)=>`<button type="button" class="focus-bubble ${i<Math.min(task.actual||0,5)?'filled':''}" data-bubble="${i+1}" aria-label="Set ${i+1} completed Pomodoros"></button>`).join('');return `<div class="focus-task-main"><span>${index+1}.</span><input class="focus-task-input" value="${escapeHtml(task.text)}" placeholder="Enter task..."></div><div class="focus-task-tracking"><label>Target <input class="focus-target-input" type="number" min="1" max="12" value="${Math.max(1,Number(task.target)||1)}"></label><div class="focus-bubbles" aria-label="Completed Pomodoros">${bubbles}</div><span class="focus-actual">${Number(task.actual)||0} actual</span><button type="button" class="focus-use-timer">Use timer</button></div>`}
  function renderPlanner(){
    const {p}=day();const [q,a]=quoteForDate();const qt=document.getElementById('focusQuoteText'),qa=document.getElementById('focusQuoteAuthor');if(qt)qt.textContent=q;if(qa)qa.textContent=a;
    p.tasks.forEach((t,i)=>{const row=document.querySelector(`[data-focus-task="${i}"]`);if(row&&!(row.contains(document.activeElement)&&document.activeElement?.matches('input,textarea')))row.innerHTML=taskMarkup(t,i);else if(row&&!row.innerHTML)row.innerHTML=taskMarkup(t,i)});
    const notes=document.getElementById('focusPlannerNotes');if(notes&&document.activeElement!==notes)notes.value=p.notes||'';
    const reflection=document.getElementById('focusScoreReflection');if(reflection&&document.activeElement!==reflection)reflection.value=p.reflection||'';
    const scores=document.getElementById('focusScoreButtons');if(scores)scores.innerHTML=Array.from({length:10},(_,i)=>`<button type="button" class="${Number(p.score)===i+1?'active':''}" data-score="${i+1}">${i+1}</button>`).join('');
    const select=document.getElementById('pomodoroTaskSelect');if(select){const old=select.value;select.innerHTML='<option value="">No task selected</option>'+p.tasks.map((t,i)=>`<option value="${i}">${i+1}. ${escapeHtml(t.text||'Untitled task')}</option>`).join('');if([...select.options].some(o=>o.value===old))select.value=old;}
    document.getElementById('pomodoroSessionCount')&&(document.getElementById('pomodoroSessionCount').textContent=String(p.stats.sessions||0));
    document.getElementById('pomodoroFocusTime')&&(document.getElementById('pomodoroFocusTime').textContent=`${p.stats.focusMinutes||0} min`);
    document.getElementById('pomodoroBreakTime')&&(document.getElementById('pomodoroBreakTime').textContent=`${p.stats.breakMinutes||0} min`);
    updateTaskLabel();updateTimerUI();
  }
  function updateTaskLabel(){const s=document.getElementById('pomodoroTaskSelect'),label=document.getElementById('pomodoroTaskLabel');if(!label)return;label.textContent=s?.value===''||!s?'No task selected':s.options[s.selectedIndex]?.text||'Selected task'}
  function fmt(sec){return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`}
  function updateTimerUI(){
    if(running)remaining=Math.max(0,Math.ceil((endAt-Date.now())/1000));
    const d=document.getElementById('pomodoroDisplay');if(d)d.textContent=fmt(remaining);
    const m=document.getElementById('pomodoroMode');if(m)m.textContent=mode==='focus'?'FOCUS':mode==='short'?'SHORT BREAK':'LONG BREAK';
    const ring=document.getElementById('pomodoroRing');if(ring){const progress=duration?Math.max(0,Math.min(1,1-remaining/duration)):0;ring.style.setProperty('--timer-progress',`${progress*360}deg`)}
    const start=document.getElementById('pomodoroStart');if(start)start.textContent=running?'Running…':remaining<duration&&remaining>0?'▶ Continue':'▶ Start';
    document.title=running?`${fmt(remaining)} • StatusOS`:'StatusOS';
  }
  function prepareAudio(){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;audioCtx ||= new AC();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}catch{return null}}
  function chime(){if(!document.getElementById('pomodoroChime')?.checked)return;const ctx=prepareAudio();if(!ctx)return;const now=ctx.currentTime;[659.25,783.99,987.77].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,now+i*.2);g.gain.exponentialRampToValueAtTime(.18,now+i*.2+.02);g.gain.exponentialRampToValueAtTime(.0001,now+i*.2+1.4);o.connect(g);g.connect(ctx.destination);o.start(now+i*.2);o.stop(now+i*.2+1.5)})}
  function vibrate(){if(!document.getElementById('pomodoroVibrate')?.checked)return;try{navigator.vibrate?.([200,120,200,120,400])}catch{}}
  function finish(){clearInterval(ticker);ticker=null;running=false;remaining=0;const minutes=Math.round(duration/60);save(p=>{p.stats.sessions=(p.stats.sessions||0)+1;if(mode==='focus'){p.stats.focusMinutes=(p.stats.focusMinutes||0)+minutes;const index=Number(document.getElementById('pomodoroTaskSelect')?.value);if(Number.isInteger(index)&&index>=0&&p.tasks[index])p.tasks[index].actual=(p.tasks[index].actual||0)+1}else p.stats.breakMinutes=(p.stats.breakMinutes||0)+minutes});chime();vibrate();const status=document.getElementById('pomodoroStatus');if(status)status.textContent=mode==='focus'?'Focus session complete. Great work.':'Break complete. Ready for the next focused block.';updateTimerUI()}
  function tick(){updateTimerUI();if(remaining<=0)finish()}
  function start(){if(running)return;prepareAudio();if(remaining<=0)remaining=duration;endAt=Date.now()+remaining*1000;running=true;ticker=setInterval(tick,250);const status=document.getElementById('pomodoroStatus');if(status)status.textContent=mode==='focus'?'Focus on one task until the chime.':'Step away and reset.';updateTimerUI()}
  function pause(){if(!running)return;remaining=Math.max(0,Math.ceil((endAt-Date.now())/1000));running=false;clearInterval(ticker);ticker=null;const status=document.getElementById('pomodoroStatus');if(status)status.textContent='Paused. Continue when ready.';updateTimerUI()}
  function restart(){running=false;clearInterval(ticker);ticker=null;remaining=duration;const status=document.getElementById('pomodoroStatus');if(status)status.textContent='Timer restarted.';updateTimerUI()}
  function setDuration(min){running=false;clearInterval(ticker);ticker=null;duration=Math.max(1,Math.min(180,Number(min)||25))*60;remaining=duration;document.querySelectorAll('[data-pomodoro-minutes]').forEach(b=>b.classList.toggle('active',Number(b.dataset.pomodoroMinutes)===Number(min)));updateTimerUI()}
  function setMode(next){mode=next;document.querySelectorAll('[data-pomodoro-mode]').forEach(b=>b.classList.toggle('active',b.dataset.pomodoroMode===mode));setDuration(mode==='focus'?25:mode==='short'?5:15)}
  function bind(){
    document.querySelectorAll('.focus-task-row').forEach(row=>{
      row.innerHTML=taskMarkup({text:'',target:1,actual:0},Number(row.dataset.focusTask));
      row.addEventListener('input',e=>{const i=Number(row.dataset.focusTask);if(e.target.matches('.focus-task-input'))save(p=>p.tasks[i].text=e.target.value);if(e.target.matches('.focus-target-input'))save(p=>p.tasks[i].target=Math.max(1,Math.min(12,Number(e.target.value)||1)))});
      row.addEventListener('click',e=>{const i=Number(row.dataset.focusTask);const bubble=e.target.closest('[data-bubble]');if(bubble)save(p=>p.tasks[i].actual=Number(bubble.dataset.bubble));if(e.target.closest('.focus-use-timer')){const s=document.getElementById('pomodoroTaskSelect');if(s){s.value=String(i);updateTaskLabel()}document.querySelector('.pomodoro-panel')?.scrollIntoView({behavior:'smooth',block:'start'})}})
    });
    document.getElementById('focusPlannerNotes')?.addEventListener('input',e=>save(p=>p.notes=e.target.value));
    document.getElementById('focusScoreReflection')?.addEventListener('input',e=>save(p=>p.reflection=e.target.value));
    document.getElementById('focusScoreButtons')?.addEventListener('click',e=>{const b=e.target.closest('[data-score]');if(b)save(p=>p.score=Number(b.dataset.score))});
    document.getElementById('pomodoroTaskSelect')?.addEventListener('change',updateTaskLabel);
    document.querySelectorAll('[data-pomodoro-minutes]').forEach(b=>b.addEventListener('click',()=>setDuration(Number(b.dataset.pomodoroMinutes))));
    document.getElementById('pomodoroCustomBtn')?.addEventListener('click',()=>{const v=prompt('Enter timer length in minutes (1–180):','30');if(v!==null)setDuration(v)});
    document.getElementById('pomodoroStart')?.addEventListener('click',start);document.getElementById('pomodoroPause')?.addEventListener('click',pause);document.getElementById('pomodoroRestart')?.addEventListener('click',restart);
    document.querySelectorAll('[data-pomodoro-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.pomodoroMode)));
    window.addEventListener('statusos:success-date-changed',e=>{selectedDate=e.detail.date;pause();restart();renderPlanner()});
    window.addEventListener('storage',e=>{if(e.key===KEY)renderPlanner()});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&running)tick()});
    renderPlanner();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
