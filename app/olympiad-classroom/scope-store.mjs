/* A child-scoped sidecar. The host's edit lease remains the authority for writes. */
export function createScopeStore(host, storage, guests) {
  const profile = {...host.profile()};
  const scope = JSON.stringify([profile.account, profile.id]);
  const key = 'wq-olympiad-classroom-v1:' + encodeURIComponent(scope);
  let lastRaw, loaded = false, readOnly = false;
  function check() {
    const p = host.profile();
    if (JSON.stringify([p.account, p.id]) !== scope || p.persistent !== profile.persistent)
      throw Error('孩子或帳戶已切換，請返回奧數星再開啟課堂。');
    host.assertWritable?.();
    if (readOnly) throw Error('原有紀錄未能讀取，已停止儲存，沒有覆蓋原檔。');
  }
  const read = () => profile.persistent ? storage.getItem(key) : guests.get(scope) || null;
  return {
    profile, scope,
    check,
    getItem() {
      check();
      try {
        lastRaw = read();
        if (lastRaw) {
          const s = JSON.parse(lastRaw);
          if (s?.version !== 1 || !Array.isArray(s.completed) || !Array.isArray(s.results) || !s.lessonStates || !s.practice)
            throw Error('學習紀錄格式不完整。');
        }
        loaded = true;
        return lastRaw;
      } catch (e) { readOnly = true; throw e; }
    },
    setItem(_unused, raw) {
      check();
      if (!loaded) throw Error('未完成讀取，沒有儲存新紀錄。');
      if (read() !== lastRaw) throw Error('另一個分頁更新了進度，請重新開啟課堂。');
      if (profile.persistent) storage.setItem(key, raw); else guests.set(scope, raw);
      lastRaw = raw;
    }
  };
}
