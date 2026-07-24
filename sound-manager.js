/* StatusOS v4.1.0 Shared Sound Manager */
(function(){
  'use strict';
  const players=new Map();
  let current=null;
  let unlocked=false;

  function get(src){
    if(!src)return null;
    if(!players.has(src)){
      const audio=new Audio(src);
      audio.preload='auto';
      audio.playsInline=true;
      try{audio.load()}catch{}
      players.set(src,audio);
    }
    return players.get(src);
  }

  function stop(){
    if(!current)return;
    try{current.pause();current.currentTime=0}catch{}
    current=null;
  }

  async function unlock(){
    if(unlocked)return true;
    unlocked=true;
    const first=players.values().next().value;
    if(!first)return true;
    try{
      const old=first.volume;
      first.volume=0;
      first.currentTime=0;
      await first.play();
      first.pause();
      first.currentTime=0;
      first.volume=old;
    }catch{}
    return true;
  }

  async function play(src,{volume=.8,loop=false,restart=true}={}){
    const player=get(src);
    if(!player)return false;
    stop();
    current=player;
    player.loop=!!loop;
    player.volume=Math.max(0,Math.min(1,Number(volume)||0));
    if(restart){try{player.currentTime=0}catch{}}
    try{await player.play();return true}catch(error){console.warn('StatusOS audio playback blocked:',error);return false}
  }

  function preload(sources=[]){sources.filter(Boolean).forEach(get)}

  window.StatusOSSoundManager={play,stop,unlock,preload,get,isUnlocked:()=>unlocked};
  ['pointerdown','touchstart','keydown'].forEach(type=>document.addEventListener(type,unlock,{once:true,passive:true,capture:true}));
})();
