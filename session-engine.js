/* StatusOS v4.1.0 Session Engine */
(function(){
  'use strict';
  const KEY='statusos_session_history_v1';
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}}
  function write(items){localStorage.setItem(KEY,JSON.stringify(items.slice(-1000)))}
  function log(entry){
    const item={id:(crypto.randomUUID?.()||`session-${Date.now()}-${Math.random().toString(16).slice(2)}`),type:'custom',status:'completed',startedAt:null,completedAt:new Date().toISOString(),durationSeconds:0,...entry};
    const history=read();history.push(item);write(history);
    window.dispatchEvent(new CustomEvent('statusos:session-completed',{detail:item}));
    return item;
  }
  window.StatusOSSessionEngine={log,history:read,clear:()=>write([])};
})();
