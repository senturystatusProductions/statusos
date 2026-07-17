/* StatusOS v2.4.2 Actionable Daily Planner */
(function(){
  "use strict";
  const KEY="statusos_planner_items_v1";
  let items=[];
  let selectedDate=new Date().toISOString().slice(0,10);
  let editingId=null;
  const $=id=>document.getElementById(id);
  const uid=()=>crypto.randomUUID?crypto.randomUUID():`plan_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const now=()=>new Date().toISOString();
  const notify=(m,t="success")=>window.StatusOS?.Notify?.[t]?.(m)||window.dispatchEvent(new CustomEvent("statusos:notify",{detail:{message:m,type:t}}));
  const tomorrow=date=>{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+1);return d.toISOString().slice(0,10);};
  function load(){try{items=JSON.parse(localStorage.getItem(KEY)||"[]");if(!Array.isArray(items))items=[];}catch{items=[];}}
  function emit(){render();window.dispatchEvent(new CustomEvent("statusos:planner-updated",{detail:{items:[...items]}}));}
  function save(){localStorage.setItem(KEY,JSON.stringify(items));emit();scheduleCloudPush();}
  function dateLabel(date){return new Intl.DateTimeFormat(undefined,{weekday:"long",month:"long",day:"numeric"}).format(new Date(`${date}T12:00:00`));}
  function weekDates(base){const d=new Date(`${base}T12:00:00`);d.setDate(d.getDate()-d.getDay());return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return x.toISOString().slice(0,10);});}
  function renderWeek(){const host=$("plannerWeekStrip");if(!host)return;host.innerHTML="";weekDates(selectedDate).forEach(date=>{const d=new Date(`${date}T12:00:00`);const count=items.filter(x=>x.date===date&&!x.completed).length;const b=document.createElement("button");b.type="button";b.className=`planner-day${date===selectedDate?" active":""}`;b.innerHTML=`<span>${d.toLocaleDateString(undefined,{weekday:"short"})}</span><strong>${d.getDate()}</strong><small>${count?`${count} item${count===1?"":"s"}`:"Clear"}</small>`;b.onclick=()=>{selectedDate=date;render();};host.appendChild(b);});}
  function actionButton(label,className,handler,aria){const b=document.createElement("button");b.type="button";b.className=className;b.textContent=label;b.setAttribute("aria-label",aria||label);b.addEventListener("click",handler);return b;}
  function render(){
    const list=$("plannerTimeline");if(!list)return;
    $("plannerSelectedDate").textContent=dateLabel(selectedDate);
    const dayItems=items.filter(x=>x.date===selectedDate).sort((a,b)=>(a.completed-b.completed)||((a.time||"99:99").localeCompare(b.time||"99:99")));
    list.innerHTML="";
    if(!dayItems.length){list.innerHTML='<div class="planner-empty"><strong>Your day is open.</strong><span>Add a focus block, session, follow-up, workout, or family commitment.</span></div>';}
    dayItems.forEach(item=>{
      const row=document.createElement("article");row.className=`planner-item${item.completed?" completed":""}`;
      const check=actionButton(item.completed?"✓":"","planner-check",()=>toggle(item.id),item.completed?"Mark incomplete":"Mark complete");
      const time=document.createElement("div");time.className="planner-time";time.textContent=item.time||"Anytime";
      const copy=document.createElement("div");copy.className="planner-copy";copy.innerHTML="<strong></strong><span></span>";copy.querySelector("strong").textContent=item.title;copy.querySelector("span").textContent=item.completed?`${item.category||"Plan"} · Completed`:item.category||"Plan";
      const actions=document.createElement("div");actions.className="planner-item-actions";
      actions.append(
        actionButton("Edit","planner-action",()=>openEdit(item.id),`Edit ${item.title}`),
        actionButton("Tomorrow","planner-action",()=>postpone(item.id),`Move ${item.title} to tomorrow`),
        actionButton("Delete","planner-action danger",()=>remove(item.id),`Delete ${item.title}`)
      );
      row.append(check,time,copy,actions);list.appendChild(row);
    });
    const open=dayItems.filter(x=>!x.completed).length,done=dayItems.length-open;
    $("plannerDayCount").textContent=dayItems.length?`${open} open · ${done} done`:`0 open`;
    renderWeek();
  }
  function openAdd(){editingId=null;const f=$("plannerForm");f.reset();f.elements.date.value=selectedDate;$("plannerModalTitle").textContent="Add to Day";$("plannerSubmitBtn").textContent="Save to Planner";$("plannerModal").showModal();}
  function openEdit(id){const item=items.find(x=>x.id===id);if(!item)return;editingId=id;const f=$("plannerForm");f.elements.title.value=item.title;f.elements.date.value=item.date;f.elements.time.value=item.time||"";f.elements.category.value=item.category||"Plan";$("plannerModalTitle").textContent="Edit Planner Item";$("plannerSubmitBtn").textContent="Save Changes";$("plannerModal").showModal();}
  function toggle(id){const item=items.find(x=>x.id===id);if(!item)return;item.completed=!item.completed;item.completed_at=item.completed?now():null;item.updated_at=now();save();notify(item.completed?"Task completed":"Task reopened","success");}
  function postpone(id){const item=items.find(x=>x.id===id);if(!item)return;item.date=tomorrow(item.date);item.completed=false;item.completed_at=null;item.updated_at=now();save();notify(`Moved to ${dateLabel(item.date)}`,"success");}
  async function remove(id){const item=items.find(x=>x.id===id);if(!item)return;items=items.filter(x=>x.id!==id);save();const sb=window.statusOSSupabase;if(sb&&navigator.onLine){try{const {data:{user}}=await sb.auth.getUser();if(user)await sb.from("planner_items").delete().eq("id",id).eq("user_id",user.id);}catch(e){console.warn("Planner cloud delete failed",e);}}notify("Planner item deleted","success");}
  async function cloudPull(){const sb=window.statusOSSupabase;if(!sb)return;try{const {data:{user}}=await sb.auth.getUser();if(!user)return;const {data,error}=await sb.from("planner_items").select("*").eq("user_id",user.id);if(error)throw error;if(Array.isArray(data)){const cloud=data.map(x=>({id:x.id,title:x.title,date:x.plan_date,time:x.plan_time?.slice(0,5)||"",category:x.category,completed:x.completed,updated_at:x.updated_at}));const map=new Map(items.map(x=>[x.id,x]));cloud.forEach(x=>{const local=map.get(x.id);if(!local||new Date(x.updated_at)>=new Date(local.updated_at||0))map.set(x.id,x);});items=[...map.values()];localStorage.setItem(KEY,JSON.stringify(items));emit();}}
    catch(e){console.warn("Planner pull failed",e);}
  }
  let pushTimer;
  function scheduleCloudPush(){clearTimeout(pushTimer);pushTimer=setTimeout(cloudPush,500);}
  async function cloudPush(){const sb=window.statusOSSupabase;if(!sb||!navigator.onLine)return;try{const {data:{user}}=await sb.auth.getUser();if(!user)return;const rows=items.map(x=>({id:x.id,user_id:user.id,title:x.title,plan_date:x.date,plan_time:x.time||null,category:x.category||"Plan",completed:!!x.completed,updated_at:x.updated_at||now()}));if(rows.length){const {error}=await sb.from("planner_items").upsert(rows,{onConflict:"id"});if(error)throw error;}window.dispatchEvent(new CustomEvent("statusos:planner-sync",{detail:{status:"synced"}}));}
    catch(e){console.warn("Planner push failed",e);window.dispatchEvent(new CustomEvent("statusos:planner-sync",{detail:{status:"pending"}}));}
  }
  function bind(){
    load();const dateInput=$("plannerDate");if(dateInput)dateInput.value=selectedDate;
    $("plannerPrevWeek")?.addEventListener("click",()=>{const d=new Date(`${selectedDate}T12:00:00`);d.setDate(d.getDate()-7);selectedDate=d.toISOString().slice(0,10);render();});
    $("plannerNextWeek")?.addEventListener("click",()=>{const d=new Date(`${selectedDate}T12:00:00`);d.setDate(d.getDate()+7);selectedDate=d.toISOString().slice(0,10);render();});
    $("plannerTodayBtn")?.addEventListener("click",()=>{selectedDate=new Date().toISOString().slice(0,10);render();});
    $("addPlannerItemBtn")?.addEventListener("click",openAdd);
    $("plannerForm")?.addEventListener("submit",e=>{e.preventDefault();const f=e.currentTarget,fd=new FormData(f),data={title:String(fd.get("title")||"").trim(),date:String(fd.get("date")),time:String(fd.get("time")||""),category:String(fd.get("category")||"Plan")};if(editingId){const item=items.find(x=>x.id===editingId);if(item)Object.assign(item,data,{updated_at:now()});notify("Planner item updated","success");}else{items.push({id:uid(),...data,completed:false,updated_at:now()});notify("Added to your day","success");}editingId=null;save();$("plannerModal").close();});
    window.addEventListener("statusos:app-ready",()=>setTimeout(cloudPull,250));window.addEventListener("online",cloudPush);document.addEventListener("visibilitychange",()=>{if(!document.hidden){cloudPull();cloudPush();}});render();
  }
  window.StatusOS=window.StatusOS||{};
  window.StatusOS.Planner={render,pull:cloudPull,push:cloudPush,list:()=>items.map(x=>({...x})),selectedDate:()=>selectedDate,selectDate:(date)=>{selectedDate=date||new Date().toISOString().slice(0,10);render();},openAdd,openEdit,toggle,postpone,remove,update:(id,patch)=>{const item=items.find(x=>x.id===id);if(!item)return null;Object.assign(item,patch,{updated_at:now()});save();return {...item};},add:(input)=>{const item={id:input.id||uid(),title:String(input.title||"Untitled").trim(),date:String(input.date||selectedDate),time:String(input.time||""),category:String(input.category||"Plan"),completed:!!input.completed,updated_at:now()};items.push(item);save();return item;},addMany:(rows)=>{const created=[];(rows||[]).forEach(input=>{const duplicate=items.some(x=>x.date===(input.date||selectedDate)&&x.title.trim().toLowerCase()===String(input.title||"").trim().toLowerCase());if(!duplicate){const item={id:input.id||uid(),title:String(input.title||"Untitled").trim(),date:String(input.date||selectedDate),time:String(input.time||""),category:String(input.category||"Plan"),completed:false,updated_at:now()};items.push(item);created.push(item);}});if(created.length)save();return created;}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
})();
