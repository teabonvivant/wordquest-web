 // ---- R3.5 p50: maths chrome and answer display helpers ----------------------------------------------------------
 const R35CSS=__R35_CSS__;
 // Corrected answer in the format the question asks for; falls back to the exact fraction when unsure.
 const ansNum=q=>q.displayAnswer!==undefined&&q.displayAnswer!==q.answer?esc(q.displayAnswer):fraction(q.answer);
 const ansUnit=q=>q.unit||q.displayUnit||'';
 // A lesson in progress: show only the way back and the progress, not the tab bars, partner row or stage row.
 function r35Focus(){return view==='lesson'&&!awaitingBreak&&!!store&&!!current()&&!current().completed;}
 function r35Header(){return r35Focus()?`<header class="focusbar">${btn('← 返回','pause','quiet backbtn')}</header>`:header();}
