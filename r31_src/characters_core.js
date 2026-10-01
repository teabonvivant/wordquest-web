/* Forest Academy R3.1. Presentation-only. Slot keys retain V32 backup compatibility;
 * they are not the animals of the new team. Canonical IDs live in role.id.
 * Receives coarse UI state only, NEVER answers, student text, ledger or passwords. */
(function(root){'use strict';
 const roles={
 owl:{id:'lie-lie',name:'烈烈老師',animal:'老虎',job:'解題老師',group:'老師',color:'#906536',intro:'用清楚的步驟講解四則運算和應用題，陪你整理已知資料，再想下一步。',personality:'耐心、清晰、重視方法。',work:'四則運算、應用題、解題示範；英文區負責學習步驟帶路。',use:'先讀清楚題目，再用原有教學與提示一步一步完成。',quote:'先睇清楚題目，再諗下一步。',faces:['開心','自信','思考','驚訝','溫柔']},
 fox:{id:'you-you',name:'柚柚老師',animal:'狐狸',job:'圖形老師',group:'老師',color:'#aa5b39',intro:'用圖像觀察形狀、空間、分數和數線，幫你把抽象的關係看清楚。',personality:'細心、溫和、喜歡觀察。',work:'圖形、量度、分數與圖表；英文區陪伴觀察字形和字塊。',use:'先比較相同與不同，再操作程式的正式教具。',quote:'先觀察，再試下唔同方法。',faces:['開心','溫柔','專注','驚喜','思考']},
 star:{id:'ci-ci',name:'刺刺',animal:'刺蝟',job:'步驟小幫手',group:'學習助手',color:'#826047',intro:'需要提示、重試或休息時，陪你把事情拆成小步驟。',personality:'耐心、有條理、不催促。',work:'原有提示、錯題回饋、重試陪伴及休息提醒。',use:'提示仍按題目原有規則記錄；角色不會額外透露答案。',quote:'唔使急，試下一小步先。',faces:['開心','專注','思考','溫柔','加油']},
 bee:{id:'bo-bo',name:'波波',animal:'水獺',job:'數字小幫手',group:'學習助手',color:'#5a775d',intro:'陪你數數、認識數字和練習基本加減，也會在首頁帶你開始任務。',personality:'活潑、細心、樂於幫忙。',work:'數感、基本加減、首頁任務及完成回饋。',use:'學習金幣仍由原有系統結算，角色不會多派或重派。',quote:'一步一步，完成眼前嘅任務。',faces:['開心','聰明','專注','驚喜','自信']},
 rabbit:{id:'a-feng',name:'阿峰',animal:'山羊',job:'奧數同學',group:'同學',color:'#6b7152',intro:'喜歡挑戰，也願意先畫圖、列表，再比較不同解法。',personality:'好奇、有毅力、重視反思。',work:'奧數挑戰、策略卡、反思及街機準備。',use:'是程式內的同學角色，不是真人對手；不改變遊戲難度。',quote:'諗多個方法，再試一試。',faces:['專注','好奇','自信','思考','開心']},
 panda:{id:'tang-li',name:'糖栗老師',animal:'小熊貓',job:'創意與教具老師',group:'老師',color:'#59734b',intro:'把圖形積木、數學操作和創意探索連在一起，鼓勵你動手觀察。',personality:'有創意、溫暖、樂於嘗試。',work:'教具工房、動手探索、數學操作及街機陪伴。',use:'教具以程式圖形和數值為準；角色海報不是題目或標準答案。',quote:'動手試下，留意有咩改變。',faces:['開心','俏皮','好奇','興奮','溫柔']}
 };
 const ids=Object.freeze(['owl','fox','panda','bee','star','rabbit']);for(const r of Object.values(roles)){Object.freeze(r.faces);Object.freeze(r);}Object.freeze(roles);
 const poses=Object.freeze(['front','face0','face1','face2','face3','face4','sheet']);
 const defaults=Object.freeze({show:true,motion:false,compact:false,gameBuddy:'rabbit',guide:'auto'});
 function preferences(raw){const p={...defaults};if(raw&&typeof raw==='object'&&!Array.isArray(raw)){for(const k of ['show','motion','compact'])if(typeof raw[k]==='boolean')p[k]=raw[k];if(['rabbit','panda'].includes(raw.gameBuddy))p.gameBuddy=raw.gameBuddy;if(raw.guide==='auto'||ids.includes(raw.guide))p.guide=raw.guide;}return p;}
 function validPreferences(p){return !!p&&typeof p==='object'&&!Array.isArray(p)&&['show','motion','compact'].every(k=>typeof p[k]==='boolean')&&['rabbit','panda'].includes(p.gameBuddy)&&(p.guide===undefined||p.guide==='auto'||ids.includes(p.guide));}
 function safeCount(n){return Number.isSafeInteger(n)&&n>=0?n:0;}
 function poseFor(state,role='owl'){if(state==='thinking'||state==='retry')return role==='fox'?'face4':role==='rabbit'?'face3':'face2';if(state==='correct'||state==='complete')return role==='rabbit'?'face4':role==='star'?'face4':'face0';if(state==='rest'||state==='hint')return role==='star'?'face3':'front';return 'front';}
 function apply(role,state,text,p={},extra={}){p=preferences(p);role=p.guide!=='auto'?p.guide:role;return {role,state,text,pose:poseFor(state,role),...extra};}
 function guide(c={},p={}){
  if(c.exam)return {role:'owl',state:'quiet',pose:'front',quiet:true,text:'先獨立完成，交卷後再回看。'};
  if(c.completed)return apply('bee','complete',c.abandoned?'已完成的部分保留，下次再繼續。':'這一組完成了。成績與金幣以下方結算為準。',p);
  if(c.feedback){if(c.feedback.technical)return apply('star','hint','先處理裝置提示；角色不判定這題對錯。',p);if(c.study)return apply('fox','teach','已看過示範，下一步自己試。',p);if(c.feedback.correct)return apply('star','correct',c.hinted?'用了提示也完成了這一步，再找機會自己試。':'完成這一步了，看看自己的方法。',p);return apply('star','retry','先看看下方回饋，再用另一個方法試試。',p);}
  if(c.study||c.assemble)return apply('fox','teach',c.workshop||c.assemble?'先觀察字塊，再跟原有步驟組合。':'先看中文意思，再聽讀音，留意英文拼法。',p);
  return apply('star',c.hinted?'hint':'thinking',c.hinted?'原有提示已打開，這次會記作有提示的練習。':'慢慢想，需要時才按原有提示。',p);
 }
 function mathGuide(c={},p={}){
  p=preferences(p);if(!p.show)return null;
  const quiet=!!c.exam||['diagnostic','mock','exam','assessment','dictation'].includes(c.mode);
  if(quiet&&c.view==='lesson')return {role:'owl',state:'quiet',quiet:true,pose:'front',text:'先獨立完成。'};
  let role='owl',state='ready',text='先看清楚題目，再想下一步。';
  if(c.rest||c.view==='resume'){role='star';state='rest';text=c.rest?'先休息一下，準備好再繼續。':'已停在這裏。准备好後，再繼續原來的一課。'.replace('准备','準備');}
  else if(c.completed){role='bee';state='complete';text='回想你用了甚麼方法，成績以課堂結算為準。';}
  else if(c.feedback==='retry'){role='star';state='retry';text='先看原有回饋，再試另一個方法。';}
  else if(c.hinted){role='star';state='hint';text='提示已打開。先完成這一步，再嘗試自己做。';}
  else if(c.view==='tools'||c.exploring){role='panda';state='teach';text='動手改一改，觀察教具中有甚麼變化。';}
  else if(c.track==='olympiad'||c.view==='olympiad'||c.view==='cards'){role='rabbit';state='thinking';text='可以先畫圖、列表，再比較你的方法。';}
  else if(c.view==='home'){role='bee';text='選一課就可以開始，每次專心做一件事。';}
  else if(c.visual){role='fox';state='teach';text='先觀察图形和數量，再按題目要求作答。'.replace('图','圖');}
  else if(c.earlyNumber){role='bee';state='teach';text='先看清楚數量，再跟原有步驟練習。';}
  if(c.feedback==='correct'){state='correct';text='看看自己用了甚麼方法，再繼續下一題。';}
  return apply(role,state,text,p,{compact:!!p.compact||c.grade>=4||!!c.busy});
 }
 const api=Object.freeze({version:'3.1.0',roles,ids,poses,defaults,preferences,validPreferences,safeCount,poseFor,guide,mathGuide});
 root.WQ32Core=api;root.WQForestCore=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
