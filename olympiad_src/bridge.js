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
