let context;
try {
  if (parent === window) throw Error('請先返回學霸星球，選擇目前學習的小朋友。');
  context = parent.WQOlympiadApp.connect(window);
} catch (e) {
  const back = new URL('../../index.html#p/olympiad',import.meta.url).href;
  document.querySelector('#main').innerHTML = '<div class="empty-state"><h1>從學霸星球開始</h1><p>請先選擇小朋友，再打開奧數圖解課堂。</p><a class="button" target="_top">返回學霸星球</a></div>';
  document.querySelector('#main a').href = back;
  throw e;
}
export const storage = context.storage;
const bar = document.createElement('p'); bar.className = 'learner-context';
bar.textContent = context.label + (context.persistent ? ' · 進度保存在這個瀏覽器' : ' · 試玩進度只保留至重新整理學霸星球');
document.querySelector('#main').before(bar);
// The four tabs reuse the exact SVGs displayed by the host hub.
for (const [page,svg] of Object.entries(context.icons || {})) {
  const link = document.querySelector('[data-nav="'+page+'"]');
  if (link) link.insertAdjacentHTML('afterbegin',svg);
}
// Match the duotone line family without changing any question diagrams.
const unitIcons = {
  observe:'<circle cx="13" cy="13" r="8"/><path d="m19 19 8 8"/><circle class="a" cx="13" cy="13" r="3"/>',
  count:'<circle class="a" cx="8" cy="9" r="3"/><circle class="b" cx="16" cy="9" r="3"/><circle class="a" cx="24" cy="9" r="3"/><circle class="b" cx="8" cy="22" r="3"/><circle class="a" cx="16" cy="22" r="3"/><circle class="b" cx="24" cy="22" r="3"/>',
  puzzle:'<rect class="a" x="4" y="4" width="11" height="11" rx="2"/><rect class="b" x="18" y="4" width="10" height="11" rx="2"/><rect class="b" x="4" y="18" width="11" height="10" rx="2"/><path d="M18 19h10v9H18z"/>',
  space:'<path d="M16 3v26M3 16h26m-4-4 4 4-4 4M12 7l4-4 4 4"/><rect class="a" x="5" y="6" width="6" height="6" rx="1"/>',
  pattern:'<circle class="a" cx="7" cy="11" r="4"/><path class="b" d="M19 7h8v8h-8z"/><circle class="a" cx="7" cy="24" r="4"/><path class="b" d="M19 20h8v8h-8z"/>',
  route:'<path d="M5 26V8h10v14h11V7"/><circle class="a" cx="5" cy="26" r="3"/><path class="b" d="m26 3 4 5-4 5-4-5z"/>',
  measure:'<rect class="a" x="3" y="9" width="26" height="14" rx="3"/><path d="M9 10v7m7-7v10m7-10v7"/>',
  logic:'<path d="M6 6h20v22H6z"/><path class="a" d="M11 3h10v6H11z"/><path d="m10 18 4 4 8-9"/>'
};
function decorateUnits() {
  document.querySelectorAll('.unit-tile').forEach(tile => {
    const id = new URL(tile.href).searchParams.get('id'), mark = tile.querySelector('.unit-mark');
    if (!mark || !unitIcons[id] || mark.dataset.themed === id) return;
    mark.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">'+unitIcons[id]+'</svg>';
    mark.setAttribute('aria-hidden','true'); mark.dataset.themed = id;
  });
}
new MutationObserver(decorateUnits).observe(document.querySelector('#main'),{childList:true,subtree:true});
decorateUnits();
// Enforce the host study permission and parent export/import gate.
for (const type of ['click','input','change','submit']) document.addEventListener(type, e => {
  try {
    context.assertStudy();
    const action = e.target.closest?.('[data-action]')?.dataset.action;
    if ((['export','import','confirm-import'].includes(action) || e.target.id === 'backup-file') && !context.canManage())
      throw Error('請先返回學霸星球家長區解鎖，再匯出或匯入紀錄。');
  } catch(err) {
    e.preventDefault(); e.stopImmediatePropagation();
    const box = document.querySelector('#storage-notice'); box.hidden=false; box.textContent=err.message;
  }
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) parent.WQOlympiadApp.close(); });
