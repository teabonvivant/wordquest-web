
/* WordQuest V32: presentation-only policy. No answer keys, ledger writes or network calls. */
(function(root){
 'use strict';
 const roles={
  owl:{name:'奧奧老師',animal:'貓頭鷹',job:'學習導師',group:'老師',color:'#345a78',intro:'動物學院的學習導師。幫你找下一步，也一起看看今天完成了甚麼。',personality:'溫和、沉穩、有耐心；不因為答錯而失望。',work:'首頁帶路、默書範圍核對提醒、學習總結。',use:'不知道從哪裏開始時，跟着奧奧老師看今天的任務。',quote:'一步一步嚟，先完成眼前呢一小步。',faces:['微笑','驚訝','思考','欣慰']},
  fox:{name:'飛飛老師',animal:'狐狸',job:'拼字與字塊老師',group:'老師',color:'#ab542f',intro:'喜歡把熟悉的字塊放在一起，帶你認識新詞。新詞的意思也會另外說清楚。',personality:'機靈、有趣、喜歡示範；不會把每個字都硬拆成拼音。',work:'生字教學、詞語組合工房、字形觀察及訂正。',use:'先看熟字、選字塊、剪取部分，再自己串字。',quote:'用你識嘅部分，試下砌個新詞。',faces:['開心','自信','思考','眨眼']},
  star:{name:'星星',animal:'螢火蟲',job:'提示小幫手',group:'輔助精靈',color:'#665491',intro:'帶着柔和光芒的小幫手。你需要提示時才靠近，思考時就靜靜陪伴。',personality:'細心、柔和、有耐性；答錯也不催促你。',work:'沿用題目的提示、陪伴重試、回應作答。',use:'按「星星提示」使用原有提示；有提示與獨立答對仍分開記錄。',quote:'諗清楚先，唔使急。',faces:['開心','關心','驚喜','鼓勵']},
  bee:{name:'筆筆',animal:'小蜜蜂',job:'任務與獎勵助手',group:'輔助精靈',color:'#987121',intro:'帶着鉛筆和小袋子的任務助手。只報告真正完成的任務和原站的金幣。',personality:'俐落、專注、開朗；不多派獎，也不拿走已有獎勵。',work:'任務完成、金幣結算、遊戲規則提醒。',use:'完成練習後看看實際結果；沿用 V31 的同一個錢包。',quote:'完成嘅努力，已經逐項記低。',faces:['開心','專注','驚訝','自豪']},
  rabbit:{name:'月月',animal:'兔子',job:'挑戰同學',group:'同學',color:'#3d678f',intro:'喜歡挑戰的電腦同學。先讀清楚玩法，再一起練習，不會嘲笑失敗。',personality:'努力、守規則、反應快；也會停一停，重新想方法。',work:'遊戲大堂、挑戰準備、遊戲中的陪伴與鼓勵。',use:'選月月陪你玩；角色不改分數、生命或對手難度。',quote:'準備好先開始，一齊試下！',faces:['認真','開心','緊張','自豪']},
  panda:{name:'跳跳',animal:'小熊貓',job:'探索同學',group:'同學',color:'#547447',intro:'對新玩法很好奇的小熊貓同學。喜歡探索不同方法，失手也願意再試。',personality:'好奇、活潑、友善；不被設定成總是答錯的同學。',work:'遊戲探索、休息畫面、過關回應及趣味陪伴。',use:'選跳跳陪你看玩法、玩遊戲；所有原有遊戲規則保留。',quote:'試下另一個方法，可能有新發現。',faces:['眨眼','興奮','思考','友善']}
 };
 Object.values(roles).forEach(r=>{Object.freeze(r.faces);Object.freeze(r)});Object.freeze(roles);
 const ids=Object.freeze(Object.keys(roles)),poses=Object.freeze(['front','side','back','face0','face1','face2','face3','sheet']);
 const defaults=Object.freeze({show:true,motion:true,compact:false,gameBuddy:'rabbit'});
 function preferences(raw){const out={...defaults};if(raw&&typeof raw==='object'&&!Array.isArray(raw)){for(const k of ['show','motion','compact'])if(typeof raw[k]==='boolean')out[k]=raw[k];if(['rabbit','panda'].includes(raw.gameBuddy))out.gameBuddy=raw.gameBuddy;}return out;}
 function safeCount(n){return Number.isSafeInteger(n)&&n>=0?n:0;}
 function poseFor(state){return ({correct:'face3',retry:'face2',thinking:'face2',hint:'front',complete:'face0',technical:'front'})[state]||'front';}
 // Receives only coarse state, never word/answer/form/meaning or a student's raw input.
 function guide(c={}){
  if(c.exam)return {role:'owl',state:'quiet',pose:'front',quiet:true,text:'先自己完成。交卷後再一齊睇。'};
  if(c.completed)return {role:'bee',state:'complete',pose:'face0',text:c.abandoned?'已作答的部分保留。休息一下，下次再繼續。':'這一組完成了。下方是原有的真實成績與金幣結算。'};
  if(c.feedback){const f=c.feedback;if(f.technical)return {role:'star',state:'technical',pose:'front',text:'裝置或聲音需要處理，這題不當作答錯。'};if(c.study)return {role:'fox',state:'ready',pose:'front',text:'已經看過示範。下一步試下自己做。'};if(f.correct)return {role:'star',state:'correct',pose:'face3',text:f.independent?'這次是獨立完成的答案。':c.hinted?'有提示也完成了這一步，再找機會自己試。':'完成這一步了。下一步再試一試。'};return {role:'fox',state:'retry',pose:'face2',text:'未完成也不要緊。一起看下方的訂正，再試一次。'};}
  if(c.study)return {role:'fox',state:'teach',pose:'front',text:c.workshop?'先看已認識的部分，再留意新詞怎樣組合。':'先看中文意思，再聽完整讀音，留意英文的拼法。'};
  return {role:c.assemble?'fox':'star',state:c.hinted?'hint':'thinking',pose:c.assemble?'front':c.hinted?'front':'face2',text:c.assemble?'把熟悉的字塊依次組合。新詞的意思要另外認識。':c.hinted?'原有提示已打開，這次會記作有提示的練習。':'慢慢想，按原有題目作答；需要時才用提示。'};
 }
 const api=Object.freeze({version:'32.0.0',roles,ids,poses,defaults,preferences,safeCount,poseFor,guide});
 root.WQ32Core=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

