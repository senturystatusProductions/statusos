const STORAGE_KEY = "senturyStatusOS_v2";
const today = () => new Date().toISOString().slice(0,10);
const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random());
const money = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(Number(n||0));
const fmtDate = d => d ? new Date(d+"T12:00:00").toLocaleDateString() : "—";

const defaultState = {
  settings:{businessName:"Sentury Status Productions",weeklyOutreachGoal:50,monthlyRevenueGoal:2000},
  daily:{
    date:today(),
    priorities:[
      {id:uid(),title:"Post today's content",done:false},
      {id:uid(),title:"Message 10 new artists",done:false},
      {id:uid(),title:"Complete one business improvement",done:false}
    ],
    sections:[
      {title:"Sales",items:["Find 20 artists","Leave 10 meaningful comments","Send 10 personalized DMs","Follow up with 5 previous leads","Update lead tracker"].map(title=>({id:uid(),title,done:false}))},
      {title:"Content",items:["Study one strong post","Write one hook","Record one short video","Post and share to Stories"].map(title=>({id:uid(),title,done:false}))},
      {title:"Business",items:["Improve one page, product, or service","Check website orders and inquiries"].map(title=>({id:uid(),title,done:false}))},
      {title:"End of Day",items:["Record today's wins","Write tomorrow's main priority","Enter today's revenue"].map(title=>({id:uid(),title,done:false}))}
    ]
  },
  artists:[],
  content:[],
  sales:[],
  projects:[
    {id:uid(),name:"Instrumental CD Vol. 1",type:"Instrumental CD",deadline:"",progress:10,nextStep:"Choose theme and track list"}
  ],
  revenue:[],
  goals:[
    {id:uid(),name:"Contact 50 artists this week",target:50,current:0,deadline:""},
    {id:uid(),name:"Earn $2,000 this month",target:2000,current:0,deadline:""}
  ],
  templates:[
    {id:uid(),name:"First Contact",message:"Hey, I came across your music and really liked your style. I produce West Coast, cinematic, and hard-hitting hip-hop. I think I have a few beats that would fit your sound well. I'd be glad to send over a few previews. No pressure."},
    {id:uid(),name:"Follow-up",message:"Just following up in case my last message got buried. I still think I have a few beats that would fit your sound. I can send a short private playlist whenever you're ready."}
  ]
};

function clone(obj){return JSON.parse(JSON.stringify(obj))}

function loadLocal(){
  const raw=localStorage.getItem(STORAGE_KEY);
  let saved=raw?JSON.parse(raw):clone(defaultState);

  if(saved.daily?.date!==today()){
    saved.daily=clone(defaultState).daily;
  }

  return saved;
}

let state=loadLocal();
let cloudSaveTimer=null;
let appInitialized=false;
let realtimeChannel=null;
let suppressCloudSave=false;

function getSupabaseClient(){
  return window.statusOSSupabase || null;
}

async function getSignedInUser(){
  const client=getSupabaseClient();
  if(!client) return null;

  const {data,error}=await client.auth.getUser();

  if(error){
    console.error("StatusOS user lookup failed:",error);
    return null;
  }

  return data?.user || null;
}

async function saveCloud(){
  const client=getSupabaseClient();
  const user=await getSignedInUser();

  if(!client || !user) return;

  const {error}=await client
    .from("statusos_workspaces")
    .upsert(
      {
        user_id:user.id,
        app_state:state,
        updated_at:new Date().toISOString()
      },
      {onConflict:"user_id"}
    );

  if(error){
    console.error("StatusOS cloud save failed:",error);
  }
}

function save(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  renderAll();

  if(suppressCloudSave) return;

  clearTimeout(cloudSaveTimer);
  cloudSaveTimer=setTimeout(saveCloud,500);
}

async function loadCloud(){
  const client=getSupabaseClient();
  const user=await getSignedInUser();

  if(!client || !user) return;

  const {data,error}=await client
    .from("statusos_workspaces")
    .select("app_state")
    .eq("user_id",user.id)
    .maybeSingle();

  if(error){
    console.error("StatusOS cloud load failed:",error);
    return;
  }

  if(data?.app_state && Object.keys(data.app_state).length){
    state=data.app_state;

    if(state.daily?.date!==today()){
      state.daily=clone(defaultState).daily;
    }

    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  }else{
    const {error:insertError}=await client
      .from("statusos_workspaces")
      .insert({
        user_id:user.id,
        app_state:state,
        updated_at:new Date().toISOString()
      });

    if(insertError){
      console.error("StatusOS first cloud save failed:",insertError);
    }
  }
}

async function startRealtimeSync(){
  const client=getSupabaseClient();
  const user=await getSignedInUser();

  if(!client || !user) return;

  if(realtimeChannel){
    await client.removeChannel(realtimeChannel);
    realtimeChannel=null;
  }

  realtimeChannel=client
    .channel(`statusos-workspace-${user.id}`)
    .on(
      "postgres_changes",
      {
        event:"UPDATE",
        schema:"public",
        table:"statusos_workspaces",
        filter:`user_id=eq.${user.id}`
      },
      payload=>{
        const incoming=payload?.new?.app_state;

        if(!incoming || !Object.keys(incoming).length) return;

        suppressCloudSave=true;
        state=incoming;

        if(state.daily?.date!==today()){
          state.daily=clone(defaultState).daily;
        }

        localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
        renderAll();

        setTimeout(()=>{
          suppressCloudSave=false;
        },0);
      }
    )
    .subscribe(status=>{
      if(status==="SUBSCRIBED"){
        console.log("StatusOS realtime sync connected.");
      }
    });
}

const dayThemes={
  Sunday:["Reset Day",["Rest","Family time","Light planning"]],
  Monday:["CEO Day",["Plan the week","Review leads","Set revenue goal","Schedule content"]],
  Tuesday:["Artist Outreach Day",["Find new artists","Personal DMs","Follow-ups"]],
  Wednesday:["Content Day",["Film multiple videos","Edit content","Build content bank"]],
  Thursday:["Client Day",["Mixing","Mastering","Custom beats","Orders"]],
  Friday:["Growth Day",["Website","SEO","Products","Weekly review"]],
  Saturday:["Creative Day",["Make beats","Sound design","Experiment"]]
};

document.getElementById("todayDate").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});

document.querySelectorAll(".nav-item").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(btn.dataset.view).classList.add("active");
  document.getElementById("pageTitle").textContent=btn.textContent;
});

document.querySelectorAll("[data-open]").forEach(btn=>btn.onclick=()=>{
  const dlg=document.getElementById(btn.dataset.open);
  if(dlg.id==="revenueModal") dlg.querySelector('[name="date"]').value=today();
  dlg.showModal();
});

function bindForm(id, handler){
  document.getElementById(id).addEventListener("submit",e=>{
    if(e.submitter?.value==="cancel") return;
    e.preventDefault();
    const data=Object.fromEntries(new FormData(e.target));
    handler(data); e.target.reset(); e.target.closest("dialog").close(); save();
  });
}
bindForm("artistForm",d=>state.artists.push({id:uid(),...d}));
bindForm("contentForm",d=>state.content.push({id:uid(),...d}));
bindForm("saleForm",d=>state.sales.push({id:uid(),...d,value:Number(d.value||0)}));
bindForm("projectForm",d=>state.projects.push({id:uid(),...d,progress:Number(d.progress||0)}));
bindForm("revenueForm",d=>state.revenue.push({id:uid(),...d,amount:Number(d.amount||0)}));
bindForm("goalForm",d=>state.goals.push({id:uid(),...d,target:Number(d.target||1),current:Number(d.current||0)}));
bindForm("templateForm",d=>state.templates.push({id:uid(),...d}));

document.getElementById("resetDailyBtn").onclick=()=>{state.daily=clone(defaultState).daily;save()};
document.getElementById("saveSettingsBtn").onclick=()=>{
  state.settings.businessName=document.getElementById("businessName").value;
  state.settings.weeklyOutreachGoal=Number(document.getElementById("weeklyOutreachGoal").value||50);
  state.settings.monthlyRevenueGoal=Number(document.getElementById("monthlyRevenueGoal").value||2000);
  save();
};
document.getElementById("resetAllBtn").onclick=()=>{if(confirm("Reset all app data on this device?")){state=clone(defaultState);save()}};

document.getElementById("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`sentury-status-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);
};
document.getElementById("importInput").onchange=e=>{
  const file=e.target.files[0]; if(!file)return;
  const reader=new FileReader();reader.onload=()=>{try{state=JSON.parse(reader.result);save()}catch{alert("Invalid backup file.")}};reader.readAsText(file);
};

function renderDaily(){
  const p=document.getElementById("priorityList");p.innerHTML="";
  state.daily.priorities.forEach(item=>{
    const row=document.createElement("div");row.className="task-row";
    const c=document.createElement("input");c.type="checkbox";c.className="task-check";c.checked=item.done;c.onchange=()=>{item.done=c.checked;save()};
    const t=document.createElement("input");t.className="priority-input";t.value=item.title;t.oninput=()=>{item.title=t.value;localStorage.setItem(STORAGE_KEY,JSON.stringify(state))};
    row.append(c,t);p.append(row);
  });
  const wrap=document.getElementById("dailySections");wrap.innerHTML="";
  state.daily.sections.forEach(sec=>{
    const card=document.createElement("article");card.className="card";card.style.marginBottom="14px";
    card.innerHTML=`<h3>${sec.title}</h3>`;
    sec.items.forEach(item=>{
      const row=document.createElement("label");row.className="task-row";
      const c=document.createElement("input");c.type="checkbox";c.className="task-check";c.checked=item.done;c.onchange=()=>{item.done=c.checked;save()};
      const span=document.createElement("span");span.className="task-label";span.textContent=item.title;
      row.append(c,span);card.append(row);
    });
    wrap.append(card);
  });
  const all=[...state.daily.priorities,...state.daily.sections.flatMap(x=>x.items)];
  const done=all.filter(x=>x.done).length, pct=all.length?Math.round(done/all.length*100):0;
  document.getElementById("dailyProgressText").textContent=`${done} of ${all.length} complete`;
  document.getElementById("dailyProgressBar").style.width=pct+"%";
  document.getElementById("scorePercent").textContent=pct+"%";
  document.getElementById("scoreRing").style.strokeDashoffset=314.159-(pct/100*314.159);
  const theme=dayThemes[new Date().toLocaleDateString("en-US",{weekday:"long"})];
  document.getElementById("dayThemeTitle").textContent=theme[0];
  document.getElementById("dayThemeTasks").innerHTML=theme[1].map(x=>`<div>${x}</div>`).join("");
}

function renderCRM(){
  const q=(document.getElementById("crmSearch").value||"").toLowerCase(), f=document.getElementById("crmFilter").value;
  const rows=state.artists.filter(a=>!f||a.status===f).filter(a=>JSON.stringify(a).toLowerCase().includes(q));
  document.getElementById("crmTable").innerHTML=rows.map(a=>`<tr>
    <td><strong>${a.name}</strong><br><small>${a.contact||""}</small></td><td>${a.genre||"—"}</td><td><span class="status">${a.status}</span></td>
    <td>${fmtDate(a.lastContact)}</td><td>${fmtDate(a.followUp)}</td><td><button class="mini-btn delete" onclick="removeItem('artists','${a.id}')">Delete</button></td></tr>`).join("")||`<tr><td colspan="6" class="muted">No artists added yet.</td></tr>`;
}
document.getElementById("crmSearch").oninput=renderCRM;document.getElementById("crmFilter").onchange=renderCRM;

function renderBoard(key,stages,container,cardFn){
  const el=document.getElementById(container);el.innerHTML="";
  stages.forEach(stage=>{
    const col=document.createElement("div");col.className="kanban-column";col.innerHTML=`<h3>${stage}</h3>`;
    state[key].filter(x=>x.stage===stage).forEach(x=>{const c=document.createElement("div");c.className="kanban-card";c.innerHTML=cardFn(x);col.append(c)});
    el.append(col);
  });
}
function renderProjects(){document.getElementById("projectList").innerHTML=state.projects.map(p=>`<article class="card project-card"><p class="eyebrow">${p.type}</p><h3>${p.name}</h3><p class="muted">${p.nextStep||"No next step set"}</p><div class="meter"><span style="width:${p.progress}%"></span></div><small>${p.progress}% • ${p.deadline?fmtDate(p.deadline):"No deadline"}</small><div class="card-actions"><button class="mini-btn" onclick="bumpProject('${p.id}')">+10%</button><button class="mini-btn delete" onclick="removeItem('projects','${p.id}')">Delete</button></div></article>`).join("")||`<p class="muted">No projects yet.</p>`}
function renderRevenue(){
  const now=new Date(), startWeek=new Date(now);startWeek.setDate(now.getDate()-now.getDay());
  const sums={today:0,week:0,month:0,all:0};
  state.revenue.forEach(r=>{const d=new Date(r.date+"T12:00:00"),amt=Number(r.amount||0);sums.all+=amt;if(r.date===today())sums.today+=amt;if(d>=startWeek)sums.week+=amt;if(d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear())sums.month+=amt});
  ["Today","Week","Month","All"].forEach(k=>document.getElementById("rev"+k).textContent=money(sums[k.toLowerCase()]));
  document.getElementById("statRevenue").textContent=money(sums.month);
  document.getElementById("revenueTable").innerHTML=[...state.revenue].sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${r.source}</td><td>${r.name||"—"}</td><td>${money(r.amount)}</td><td><button class="mini-btn delete" onclick="removeItem('revenue','${r.id}')">Delete</button></td></tr>`).join("")||`<tr><td colspan="5" class="muted">No revenue entered yet.</td></tr>`;
}
function renderGoals(){document.getElementById("goalList").innerHTML=state.goals.map(g=>{const pct=Math.min(100,Math.round((g.current/g.target)*100));return `<article class="card goal-card"><h3>${g.name}</h3><div class="meter"><span style="width:${pct}%"></span></div><p>${g.current} / ${g.target}</p><small class="muted">${g.deadline?fmtDate(g.deadline):"No deadline"}</small><div class="card-actions"><button class="mini-btn" onclick="incrementGoal('${g.id}')">Add Progress</button><button class="mini-btn delete" onclick="removeItem('goals','${g.id}')">Delete</button></div></article>`}).join("")}
function renderTemplates(){document.getElementById("templateList").innerHTML=state.templates.map(t=>`<article class="card template-card"><h3>${t.name}</h3><p class="muted">${t.message}</p><div class="card-actions"><button class="mini-btn" onclick="copyTemplate('${t.id}')">Copy</button><button class="mini-btn delete" onclick="removeItem('templates','${t.id}')">Delete</button></div></article>`).join("")}
function renderStats() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Artists contacted this week
  document.getElementById("statContacted").textContent =
    state.artists.filter(a =>
      a.lastContact && new Date(a.lastContact) >= weekAgo
    ).length;

  // Follow-ups due
  document.getElementById("statFollowups").textContent =
    state.artists.filter(a =>
      a.followUp && a.followUp <= today()
    ).length;

  // Content posted this week
  document.getElementById("statPosts").textContent =
    state.content.filter(c =>
      c.stage === "Posted" &&
      (!c.date || new Date(c.date) >= weekAgo)
    ).length;

  // Revenue this month
  const now = new Date();

  const revenue = state.revenue
    .filter(r => {
      const d = new Date(r.date);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((total, r) => total + Number(r.amount || 0), 0);

  document.getElementById("statRevenue").textContent =
    "$" + revenue.toLocaleString();
}
function renderSettings(){document.getElementById("businessName").value=state.settings.businessName;document.getElementById("weeklyOutreachGoal").value=state.settings.weeklyOutreachGoal;document.getElementById("monthlyRevenueGoal").value=state.settings.monthlyRevenueGoal}

window.removeItem=(key,id)=>{state[key]=state[key].filter(x=>x.id!==id);save()}
window.bumpProject=id=>{const p=state.projects.find(x=>x.id===id);p.progress=Math.min(100,Number(p.progress)+10);save()}
window.incrementGoal=id=>{const g=state.goals.find(x=>x.id===id);const n=prompt("How much progress should be added?","1");if(n!==null){g.current+=Number(n||0);save()}}
window.copyTemplate=id=>{const t=state.templates.find(x=>x.id===id);navigator.clipboard.writeText(t.message);alert("Template copied.")}


function renderDashboardHeader(){
  const now=new Date();
  const hour=now.getHours();
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const welcome=document.getElementById("welcomeHeading");
  const day=document.getElementById("dashboardDay");
  const fullDate=document.getElementById("dashboardFullDate");
  if(welcome) welcome.textContent=`${greeting}, Sam.`;
  if(day) day.textContent=now.toLocaleDateString(undefined,{weekday:"long"});
  if(fullDate) fullDate.textContent=now.toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"});
}

function renderRecentActivity(){
  const container=document.getElementById("recentActivity");
  if(!container) return;

  const activity=[];
  state.revenue.slice(-3).forEach(item=>activity.push({title:`Revenue added: ${money(item.amount)}`,detail:item.name||item.source||"Revenue",date:item.date||""}));
  state.artists.slice(-3).forEach(item=>activity.push({title:`Artist added: ${item.name}`,detail:item.status||"New Lead",date:item.lastContact||""}));
  state.projects.slice(-3).forEach(item=>activity.push({title:`Project updated: ${item.name}`,detail:item.nextStep||item.type||"Project",date:item.deadline||""}));

  const latest=activity.slice(-6).reverse();
  container.innerHTML=latest.length
    ? latest.map(item=>`<div class="activity-item"><div><strong>${item.title}</strong><small>${item.detail}</small></div><small>${item.date?fmtDate(item.date):"Recent"}</small></div>`).join("")
    : `<div class="activity-empty">No recent activity yet.</div>`;
}

function renderAll(){
  renderDashboardHeader();
  renderRecentActivity();
  renderDaily();renderCRM();
  renderBoard("content",["Ideas","Writing","Filming","Ready","Posted"],"contentBoard",x=>`<strong>${x.title}</strong><p>${x.platform}</p><small>${x.hook||"No hook yet"} ${x.date?"• "+fmtDate(x.date):""}</small><div class="card-actions"><button class="mini-btn delete" onclick="removeItem('content','${x.id}')">Delete</button></div>`);
  renderBoard("sales",["Lead","Contacted","Conversation","Proposal","Won","Lost"],"salesBoard",x=>`<strong>${x.name}</strong><p>${x.offer||"Opportunity"}</p><small>${money(x.value)} • ${x.nextAction||"No next action"}</small><div class="card-actions"><button class="mini-btn delete" onclick="removeItem('sales','${x.id}')">Delete</button></div>`);
  renderProjects();renderRevenue();renderGoals();renderTemplates();renderStats();renderSettings();
}
window.initStatusOSApp = async function () {
  if(!appInitialized){
    await loadCloud();
    await startRealtimeSync();
    appInitialized=true;
  }

  renderAll();
};
