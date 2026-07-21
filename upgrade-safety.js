/* StatusOS v3.3.2 upgrade safety */
(function(){
  "use strict";
  const VERSION="3.3.2", KEY=`statusos_upgrade_snapshot_${VERSION}`;
  try{
    if(!localStorage.getItem(KEY)){
      const data={};
      for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&(k.startsWith("statusos_")||k==="senturyStatusOS_v2"))data[k]=localStorage.getItem(k);}
      localStorage.setItem(KEY,JSON.stringify({version:VERSION,createdAt:new Date().toISOString(),data}));
    }
    localStorage.setItem("statusos_data_schema_version",VERSION);
  }catch(e){console.warn("Upgrade safety snapshot unavailable",e);}
})();
