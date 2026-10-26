/* R3.31 s97 - recorded British voice (Piper en_GB-jenny_dioco): plays the pre-made mp3 for known words/sentences, otherwise falls back to the device voice */
(function(){
  var ss=window.speechSynthesis; if(!ss||!window.Audio||location.protocol==='file:') return;
  var BASE='assets/voice/jenny/', man=null, cur=null, nativeSpeak=ss.speak.bind(ss), nativeCancel=ss.cancel.bind(ss);
  fetch(BASE+'manifest.json').then(function(r){return r.ok?r.json():null}).then(function(j){man=j}).catch(function(){});
  function lookup(t){
    if(!man) return null; t=(t||'').trim().toLowerCase();
    return man[t]||man[t.replace(/[.!?,;:]+$/,'')]||null;
  }
  function stop(){ if(cur){var a=cur; cur=null; a.onended=a.onerror=null; try{a.pause()}catch(e){}} }
  ss.speak=function(u){
    var h=/^en/i.test(u.lang||'en')?lookup(u.text):null;
    if(!h) return nativeSpeak(u);
    stop(); nativeCancel();
    var a=new Audio(BASE+h+'.mp3'); cur=a; a.preservesPitch=true;
    a.playbackRate=Math.min(2,Math.max(.5,u.rate||1)); a.volume=u.volume==null?1:u.volume;
    var done=function(err){ if(cur!==a) return; cur=null; if(err&&u.onerror) u.onerror({error:'audio'}); else if(u.onend) u.onend({}); };
    a.onended=function(){done(false)};
    a.onerror=function(){ if(cur!==a) return; cur=null; nativeSpeak(u); };
    a.onplaying=function(){ if(u.onstart){var f=u.onstart; u.onstart=null; f({});} };
    a.play().catch(function(){ if(cur===a){cur=null; nativeSpeak(u);} });
  };
  ss.cancel=function(){ stop(); nativeCancel(); };
  ['pause','resume'].forEach(function(k){ var n=ss[k].bind(ss); ss[k]=function(){ if(cur){ k==='pause'?cur.pause():cur.play(); } return n(); }; });
  try{ var d=Object.getOwnPropertyDescriptor(SpeechSynthesis.prototype,'speaking');
    Object.defineProperty(ss,'speaking',{get:function(){return !!cur||d.get.call(ss)}}); }catch(e){}
})();
