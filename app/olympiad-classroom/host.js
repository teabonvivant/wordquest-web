import {createScopeStore} from './scope-store.mjs?v=fccadcf3cfb8';

const root = window, guests = new Map();
const base = new URL('./', import.meta.url);
let dialog, frame, context, host, previousFocus;
const pages = new Set(['learn', 'test', 'review', 'progress']);
let navigation, icons = {};

function notice(message) {
  let box = document.getElementById('wq-olympiad-notice');
  if (!box) {
    box = document.createElement('p'); box.id = 'wq-olympiad-notice'; box.setAttribute('role', 'alert');
    box.className = 'oly-shell-notice';
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
    for (const page of pages) {
      const icon = document.querySelector('[data-oly-open="'+page+'"] .r37-ti svg');
      if (icon) icons[page] = icon.outerHTML;
    }
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.id = 'wq-olympiad-dialog';
      dialog.setAttribute('aria-label', '學霸星球奧數課堂');
      dialog.innerHTML = '<header class="oly-shell-bar"><button type="button" class="oly-shell-back" aria-label="返回奧數星" title="返回奧數星"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg></button><img class="oly-shell-planet" alt="" width="38" height="38"><strong>奧數星<span>圖解課堂</span></strong><span class="oly-shell-learner"></span></header><iframe id="wq-olympiad-frame" title="奧數圖解課堂、測試與錯題解說"></iframe>';
      dialog.querySelector('.oly-shell-planet').src = new URL('../assets/r316/pl_olympiad.webp',base).href;
      frame = dialog.querySelector('iframe');
      dialog.querySelector('button').addEventListener('click', close);
      dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
      // Reuse the live app's actual navigation and SVG family.
      const source = document.querySelector('.r37-hub .r37-nav') || document.querySelector('.r37-nav');
      if (source) {
        navigation = source.cloneNode(true); navigation.classList.add('oly-shell-nav');
        navigation.querySelectorAll('a').forEach(a => {
          const active = a.hash === '#p/olympiad'; a.classList.toggle('on', active);
          if (active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
        });
        navigation.addEventListener('click', e => {
          const a = e.target.closest('a'); if (!a) return;
          e.preventDefault(); const hash = a.hash; close(); if (hash) location.hash = hash;
        });
        dialog.append(navigation);
      }
      document.body.append(dialog);
    }
    dialog.querySelector('.oly-shell-learner').textContent = profile.name || '小小探險家';
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
    label: owner.profile.name || '小小探險家',
    icons: Object.freeze({...icons})
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
