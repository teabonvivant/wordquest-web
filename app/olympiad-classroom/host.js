import {createScopeStore} from './scope-store.mjs?v=7c62d9a3e860';

const root = window, guests = new Map();
const base = new URL('./', import.meta.url);
let dialog, frame, context, host, previousFocus;
const pages = new Set(['learn', 'test', 'review', 'progress']);

function notice(message) {
  let box = document.getElementById('wq-olympiad-notice');
  if (!box) {
    box = document.createElement('p'); box.id = 'wq-olympiad-notice'; box.setAttribute('role', 'alert');
    box.style.cssText = 'padding:16px;background:#fff7dc;color:#382d25;border-radius:12px';
    document.querySelector('#app')?.prepend(box);
  }
  box.textContent = message; box.scrollIntoView({block:'nearest'});
}

function close() {
  if (!dialog?.open) return;
  dialog.close(); frame.src = 'about:blank'; context = null;
  host?.afterClose?.();
  if (previousFocus?.isConnected) previousFocus.focus();
  else document.querySelector('[data-oly-open="learn"]')?.focus();
}

function open(page = 'learn') {
  try {
    if (!pages.has(page)) page = 'learn';
    host = root.WQMathStorage?.createHostBridge();
    if (!host) throw Error('學習帳戶尚未準備好，請重新整理後再試。');
    host.beforeOpen?.(); root.WQR3?.assertStudy();
    const profile = host.profile();
    if (profile.persistent) {
      const old = localStorage.getItem('wqm-state-v1:' + profile.account + ':' + profile.id);
      if (old && JSON.parse(old)?.settings?.olympiad === false)
        throw Error('家長尚未開啟奧數，請先到數學家長設定開啟。');
    }
    previousFocus = document.activeElement;
    context = createScopeStore(host, localStorage, guests);
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.id = 'wq-olympiad-dialog';
      dialog.setAttribute('aria-label', '學霸星球奧數課堂');
      dialog.innerHTML = '<header class="oly-shell-bar"><strong>學霸星球 · 奧數課堂</strong><button type="button">返回奧數星</button></header><iframe id="wq-olympiad-frame" title="奧數圖解課堂、測試與錯題解說"></iframe>';
      frame = dialog.querySelector('iframe');
      dialog.querySelector('button').addEventListener('click', close);
      dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
      document.body.append(dialog);
    }
    frame.src = new URL(page + '/', base).href;
    if (!dialog.open) dialog.showModal();
  } catch (e) { notice(e.message); }
}

function connect(child) {
  if (!dialog?.open || child !== frame.contentWindow || !context) throw Error('請從學霸星球開啟課堂。');
  const owner = context;
  const check = () => {
    if (context !== owner || !dialog.open) throw Error('課堂已關閉，請重新開啟。');
    owner.check();
  };
  return Object.freeze({
    storage: {
      getItem(key) { check(); return owner.getItem(key); },
      setItem(key, raw) { check(); owner.setItem(key, raw); }
    },
    assertStudy() { check(); root.WQR3?.assertStudy(); },
    canManage() { check(); return host.parentAllowed?.() !== false; },
    persistent: owner.profile.persistent,
    label: owner.profile.name || '小小探險家'
  });
}

root.WQOlympiadApp = Object.freeze({open, close, connect, pauseForLimit: close, version:'OLY-1.0'});
document.addEventListener('click', e => {
  const button = e.target.closest?.('[data-oly-open]');
  if (!button) return;
  e.preventDefault(); e.stopImmediatePropagation(); open(button.dataset.olyOpen);
}, true);
root.addEventListener('hashchange', close);
// Account/lease changes must stop the old iframe before it can write to another child.
setInterval(() => { if (dialog?.open) { try { context.check(); root.WQR3?.assertStudy(); } catch(e) { close(); notice(e.message); } } }, 1500);
