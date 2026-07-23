(function(){
  'use strict';

  const VERSION='3.9.0';
  const RECENT_KEY='statusos_command_recent_v1';
  const FAVORITES_KEY='statusos_command_favorites_v1';
  const MAX_RECENT=8;

  const pages=[
    ['dashboard','Mission Control','Dashboard'],['today','Today','Today'],['planner','Calendar + Planner','Planning'],
    ['tasks','Task Engine','Planning'],['habits','Habit Engine','Planning'],['review','Weekly Review','Planning'],
    ['goals','Goals','Planning'],['reset','Success OS','Planning'],['music','Music OS','Business'],
    ['crm','Artist OS','Business'],['content','Content Planner','Business'],['sales','Sales Pipeline','Business'],
    ['projects','Projects','Business'],['timeline','Timeline','Business'],['revenue','Revenue','Business'],
    ['templates','DM Templates','Business'],['assistant','Command Center','Tools'],['developer','Developer','Tools']
  ].map(([id,title,group])=>({id:`page:${id}`,type:'page',title,subtitle:group,view:id,keywords:`${title} ${group} ${id}`}));

  const actions=[
    {id:'action:new-task',type:'action',title:'New Task',subtitle:'Quick action',keywords:'add create task todo',run:()=>capture('task')},
    {id:'action:new-artist',type:'action',title:'New Artist',subtitle:'Quick action',keywords:'add create artist crm contact',run:()=>capture('artist')},
    {id:'action:new-project',type:'action',title:'New Project',subtitle:'Quick action',keywords:'add create project',run:()=>capture('project')},
    {id:'action:new-content',type:'action',title:'New Content Item',subtitle:'Quick action',keywords:'add create content post',run:()=>capture('content')},
    {id:'action:add-revenue',type:'action',title:'Add Revenue',subtitle:'Quick action',keywords:'money income payment finance',run:()=>capture('revenue')},
    {id:'action:start-focus',type:'action',title:'Start Focus Session',subtitle:'Timer',keywords:'focus pomodoro timer work',run:()=>{navigate('planner');setTimeout(()=>document.getElementById('pomodoroStart')?.click(),180)}},
    {id:'action:start-workout',type:'action',title:'Start Workout',subtitle:'Performance Timer',keywords:'boxing tabata hiit workout timer',run:()=>capture('workout')},
    {id:'action:quick-capture',type:'action',title:'Open Quick Capture',subtitle:'Quick action',keywords:'plus menu capture',run:()=>document.getElementById('quickCaptureBtn')?.click()}
  ];

  let root,input,list,items=[],filtered=[],activeIndex=0,lastFocus=null;

  const readJSON=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v==null?fallback:v}catch{return fallback}};
  const writeJSON=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
  const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc=s=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function navigate(view){
    if(window.StatusOS?.Navigation?.activateView) window.StatusOS.Navigation.activateView(view);
    else document.querySelector(`.nav-item[data-view="${CSS.escape(view)}"]`)?.click();
  }

  function capture(action){
    const btn=document.querySelector(`[data-capture-action="${action}"]`);
    if(btn){btn.click();return;}
    document.getElementById('quickCaptureBtn')?.click();
    setTimeout(()=>document.querySelector(`[data-capture-action="${action}"]`)?.click(),80);
  }

  function collectDynamic(){
    const out=[];
    const seen=new Set();
    const keyMap={
      statusos_artists_v2:{type:'artist',view:'crm',label:'Artist'},
      statusos_smart_tasks_v1:{type:'task',view:'tasks',label:'Task'},
      statusos_planner_items_v1:{type:'planner',view:'planner',label:'Planner'},
      statusos_projects_v1:{type:'project',view:'projects',label:'Project'},
      statusos_music_items_v1:{type:'music',view:'music',label:'Music'},
      statusos_content_items_v1:{type:'content',view:'content',label:'Content'}
    };
    const titleKeys=['title','name','artist_name','artistName','task','text','label','project_name','projectName','song','beat','subject'];
    const subtitleKeys=['status','category','stage','email','platform','date','dueDate','genre','type'];

    function add(obj,meta,key,index){
      if(!obj||typeof obj!=='object'||Array.isArray(obj))return;
      let title='';for(const k of titleKeys){if(typeof obj[k]==='string'&&obj[k].trim()){title=obj[k].trim();break;}}
      if(!title)return;
      let subtitle='';for(const k of subtitleKeys){if(typeof obj[k]==='string'&&obj[k].trim()){subtitle=obj[k].trim();break;}}
      const id=`data:${key}:${obj.id||index}:${title}`;
      if(seen.has(id))return;seen.add(id);
      out.push({id,type:'data',title,subtitle:`${meta.label}${subtitle?` · ${subtitle}`:''}`,view:meta.view,keywords:normalize(JSON.stringify(obj)).slice(0,1000)});
    }

    Object.entries(keyMap).forEach(([key,meta])=>{
      const value=readJSON(key,null);
      const arr=Array.isArray(value)?value:Array.isArray(value?.items)?value.items:[];
      arr.filter(x=>!x?.deletedAt).slice(0,500).forEach((x,i)=>add(x,meta,key,i));
    });

    // Main workspace contains several legacy collections.
    const workspace=readJSON('senturyStatusOS_v2',{});
    const walk=(value,path='workspace',depth=0)=>{
      if(depth>3||out.length>1500)return;
      if(Array.isArray(value)){value.slice(0,300).forEach((x,i)=>{if(x&&typeof x==='object'){add(x,{label:'Workspace',view:guessView(path)},path,i);walk(x,`${path}.${i}`,depth+1)}});return;}
      if(value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>walk(v,`${path}.${k}`,depth+1));
    };
    walk(workspace);
    return out;
  }

  function guessView(path){
    const p=path.toLowerCase();
    if(p.includes('project'))return'projects';if(p.includes('artist')||p.includes('crm'))return'crm';
    if(p.includes('content'))return'content';if(p.includes('sale'))return'sales';if(p.includes('revenue')||p.includes('finance'))return'revenue';
    if(p.includes('task'))return'tasks';if(p.includes('music')||p.includes('beat'))return'music';return'dashboard';
  }

  function recentIds(){return readJSON(RECENT_KEY,[])}
  function favoriteIds(){return readJSON(FAVORITES_KEY,[])}
  function remember(id){const next=[id,...recentIds().filter(x=>x!==id)].slice(0,MAX_RECENT);writeJSON(RECENT_KEY,next)}
  function toggleFavorite(id){const fav=favoriteIds();writeJSON(FAVORITES_KEY,fav.includes(id)?fav.filter(x=>x!==id):[...fav,id]);render()}

  function buildItems(){items=[...pages.filter(x=>x.view!=='developer'||!document.getElementById('developer')?.classList.contains('hidden')),...actions,...collectDynamic()]}

  function score(item,q){
    if(!q)return 1;
    const hay=normalize(`${item.title} ${item.subtitle} ${item.keywords||''}`);
    if(hay===q)return 100;if(hay.startsWith(q))return 80;if(normalize(item.title).includes(q))return 60;
    const words=q.split(' ');return words.every(w=>hay.includes(w))?30+words.length:0;
  }

  function search(){
    const q=normalize(input.value);
    buildItems();
    if(!q){
      const fav=favoriteIds().map(id=>items.find(x=>x.id===id)).filter(Boolean);
      const rec=recentIds().map(id=>items.find(x=>x.id===id)).filter(Boolean).filter(x=>!fav.some(f=>f.id===x.id));
      const quick=actions.filter(x=>!fav.some(f=>f.id===x.id)&&!rec.some(r=>r.id===x.id));
      filtered=[...fav,...rec,...quick].slice(0,14);
    }else filtered=items.map(x=>({x,s:score(x,q)})).filter(y=>y.s>0).sort((a,b)=>b.s-a.s||a.x.title.localeCompare(b.x.title)).slice(0,30).map(y=>y.x);
    activeIndex=Math.min(activeIndex,Math.max(0,filtered.length-1));render();
  }

  function render(){
    if(!list)return;
    const fav=new Set(favoriteIds());
    if(!filtered.length){list.innerHTML='<div class="command-empty">No matching commands or records.</div>';return;}
    list.innerHTML=filtered.map((item,i)=>`<button class="command-result${i===activeIndex?' active':''}" type="button" data-command-index="${i}" role="option" aria-selected="${i===activeIndex}">
      <span class="command-result-icon">${item.type==='page'?'↗':item.type==='action'?'＋':'⌕'}</span>
      <span class="command-result-copy"><strong>${esc(item.title)}</strong><small>${esc(item.subtitle||item.type)}</small></span>
      <span class="command-result-actions"><button class="command-favorite${fav.has(item.id)?' is-favorite':''}" type="button" data-favorite-id="${esc(item.id)}" aria-label="${fav.has(item.id)?'Remove favorite':'Add favorite'}">★</button><kbd>${i===activeIndex?'Enter':''}</kbd></span>
    </button>`).join('');
    list.querySelector('.command-result.active')?.scrollIntoView({block:'nearest'});
  }

  function execute(item){
    if(!item)return;remember(item.id);close();
    if(item.run)item.run();else if(item.view)navigate(item.view);
  }

  function open(initial=''){
    if(!root)return;lastFocus=document.activeElement;root.classList.remove('hidden');document.body.classList.add('command-palette-open');
    input.value=initial;activeIndex=0;search();setTimeout(()=>input.focus(),20);
  }
  function close(){if(!root)return;root.classList.add('hidden');document.body.classList.remove('command-palette-open');lastFocus?.focus?.()}

  function createUI(){
    root=document.createElement('div');root.id='statusosCommandPalette';root.className='command-palette-backdrop hidden';
    root.innerHTML=`<section class="command-palette" role="dialog" aria-modal="true" aria-label="StatusOS command palette">
      <div class="command-search-row"><span>⌕</span><input id="statusosCommandInput" type="search" autocomplete="off" placeholder="Search StatusOS or type a command..." aria-label="Search StatusOS"><kbd>Esc</kbd></div>
      <div class="command-hint"><span>Navigate with ↑ ↓</span><span>Open with Enter</span><span>Favorite with ★</span></div>
      <div id="statusosCommandResults" class="command-results" role="listbox"></div>
      <footer><strong>StatusOS Command Palette</strong><span>Ctrl / Cmd + K</span></footer>
    </section>`;
    document.body.appendChild(root);input=root.querySelector('#statusosCommandInput');list=root.querySelector('#statusosCommandResults');

    input.addEventListener('input',()=>{activeIndex=0;search()});
    root.addEventListener('click',e=>{
      if(e.target===root){close();return;}
      const fav=e.target.closest('[data-favorite-id]');if(fav){e.preventDefault();e.stopPropagation();toggleFavorite(fav.dataset.favoriteId);return;}
      const row=e.target.closest('[data-command-index]');if(row)execute(filtered[Number(row.dataset.commandIndex)]);
    });
  }

  function boot(){
    createUI();
    document.addEventListener('keydown',e=>{
      const mod=e.ctrlKey||e.metaKey;
      if(mod&&e.key.toLowerCase()==='k'){e.preventDefault();root.classList.contains('hidden')?open():close();return;}
      if(root.classList.contains('hidden')){
        if(mod&&e.key.toLowerCase()==='n'&&!e.shiftKey){e.preventDefault();open('new task')}
        else if(mod&&e.shiftKey&&e.key.toLowerCase()==='n'){e.preventDefault();open('new content')}
        else if(mod&&e.key.toLowerCase()==='t'){e.preventDefault();open('start focus')}
        else if(mod&&e.key.toLowerCase()==='w'){e.preventDefault();open('start workout')}
        return;
      }
      if(e.key==='Escape'){e.preventDefault();close()}
      else if(e.key==='ArrowDown'){e.preventDefault();activeIndex=(activeIndex+1)%Math.max(1,filtered.length);render()}
      else if(e.key==='ArrowUp'){e.preventDefault();activeIndex=(activeIndex-1+Math.max(1,filtered.length))%Math.max(1,filtered.length);render()}
      else if(e.key==='Enter'){e.preventDefault();execute(filtered[activeIndex])}
    });
    window.addEventListener('storage',()=>{if(!root.classList.contains('hidden'))search()});
    window.StatusOS=window.StatusOS||{};window.StatusOS.CommandPalette={open,close,search,version:VERSION};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
